-- ============================================================
--  02_team_and_billing.sql — المرحلة الثانية من الـ SaaS
--  دعوة الأعضاء والأدوار + ربط الفوترة (تشغَّل بعد schema.sql)
--  التشغيل: Supabase → SQL Editor → الصق → Run
-- ============================================================

-- ---------- ملفات تعريف المستخدمين (للبريد داخل المنشأة) ----------
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (
    user_id = auth.uid()
    or user_id in (
      select m2.user_id from public.memberships m1
      join public.memberships m2 on m1.org_id = m2.org_id
      where m1.user_id = auth.uid()
    )
  );

-- إنشاء ملف التعريف تلقائيًا عند التسجيل
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(user_id, email) values (new.id, new.email)
  on conflict (user_id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- بريد العضو على العضوية (لتسهيل العرض) ----------
alter table public.memberships add column if not exists email text;

-- ---------- الدعوات ----------
create table if not exists public.invitations (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  email      text not null,
  role       text not null default 'inspector' check (role in ('manager','inspector')),
  status     text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists invitations_org_idx on public.invitations(org_id);
create index if not exists invitations_email_idx on public.invitations(lower(email));
alter table public.invitations enable row level security;

drop policy if exists inv_select on public.invitations;
create policy inv_select on public.invitations for select
  using (org_id in (select org_id from public.memberships where user_id = auth.uid()));

-- ============================================================
--  RPCs (security definer)
-- ============================================================

-- إعادة تعريف إنشاء المنشأة لتسجّل بريد المالك على عضويته
create or replace function public.create_org_for_current_user(
  p_name text, p_city text default null, p_license text default null
) returns public.organizations
language plpgsql security definer set search_path = public as $$
declare org public.organizations; v_email text;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  select email into v_email from auth.users where id = auth.uid();

  insert into public.organizations(name, city, license)
  values (coalesce(nullif(trim(p_name), ''), 'منشأتي'), p_city, p_license)
  returning * into org;

  insert into public.memberships(user_id, org_id, role, email)
  values (auth.uid(), org.id, 'owner', v_email);

  return org;
end $$;
grant execute on function public.create_org_for_current_user(text, text, text) to authenticated;

-- إنشاء دعوة (للمالك/المدير فقط)
create or replace function public.create_invitation(
  p_email text, p_role text default 'inspector', p_org uuid default null
) returns public.invitations
language plpgsql security definer set search_path = public as $$
declare inv public.invitations; v_org uuid; v_role text;
begin
  v_org := coalesce(p_org, (select org_id from public.memberships where user_id = auth.uid() limit 1));
  select role into v_role from public.memberships where user_id = auth.uid() and org_id = v_org;
  if v_role is null or v_role not in ('owner','manager') then raise exception 'not authorized'; end if;
  if p_role not in ('manager','inspector') then raise exception 'invalid role'; end if;

  insert into public.invitations(org_id, email, role, invited_by)
  values (v_org, lower(trim(p_email)), p_role, auth.uid())
  returning * into inv;
  return inv;
end $$;
grant execute on function public.create_invitation(text, text, uuid) to authenticated;

-- قبول الدعوات المعلّقة لبريد المستخدم الحالي (يُستدعى عند الدخول)
create or replace function public.accept_pending_invitations()
returns integer language plpgsql security definer set search_path = public as $$
declare v_email text; n int := 0; r record;
begin
  select email into v_email from auth.users where id = auth.uid();
  for r in select * from public.invitations
           where lower(email) = lower(v_email) and status = 'pending' loop
    insert into public.memberships(user_id, org_id, role, email)
    values (auth.uid(), r.org_id, r.role, v_email)
    on conflict (user_id, org_id) do nothing;
    update public.invitations set status = 'accepted' where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;
grant execute on function public.accept_pending_invitations() to authenticated;

-- إزالة عضو (للمالك/المدير، ولا يجوز إزالة المالك)
create or replace function public.remove_member(p_user uuid, p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  select role into v_role from public.memberships where user_id = auth.uid() and org_id = p_org;
  if v_role is null or v_role not in ('owner','manager') then raise exception 'not authorized'; end if;
  if (select role from public.memberships where user_id = p_user and org_id = p_org) = 'owner' then
    raise exception 'cannot remove owner';
  end if;
  delete from public.memberships where user_id = p_user and org_id = p_org;
end $$;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

-- ============================================================
--  الفوترة: تُحدّث organizations.plan/subscription_status من
--  Edge Function (moyasar-webhook) باستخدام مفتاح service_role.
--  انظر saas/functions/ و saas/README.md.
-- ============================================================
