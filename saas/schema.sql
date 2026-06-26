-- ============================================================
--  schema.sql — قاعدة بيانات SaaS متعددة المستأجرين
--  نظام سلامة الغذاء و GMP  (Supabase / PostgreSQL)
--
--  التشغيل: Supabase Dashboard → SQL Editor → الصق هذا الملف → Run
--
--  المبدأ: كل منشأة (organization) معزولة تمامًا عبر Row-Level Security،
--  وبيانات كل وحدة تُخزَّن ككائن JSONB بنفس شكل التطبيق (يبسّط التكامل).
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- المنشآت (المستأجرون) ----------
create table if not exists public.organizations (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  city                text,
  license             text,
  plan                text not null default 'trial'
                       check (plan in ('trial','basic','pro','enterprise')),
  subscription_status text not null default 'trialing'
                       check (subscription_status in ('trialing','active','past_due','canceled')),
  trial_ends_at       timestamptz not null default (now() + interval '14 days'),
  current_period_end  timestamptz,
  created_at          timestamptz not null default now()
);
-- ترقية آمنة للمشاريع القائمة (تُضيف العمود إن لم يكن موجودًا)
alter table public.organizations add column if not exists current_period_end timestamptz;

-- ---------- العضويات (ربط المستخدم بالمنشأة + الدور) ----------
create table if not exists public.memberships (
  user_id   uuid not null references auth.users(id) on delete cascade,
  org_id    uuid not null references public.organizations(id) on delete cascade,
  role      text not null default 'owner'
             check (role in ('owner','manager','inspector')),
  created_at timestamptz not null default now(),
  primary key (user_id, org_id)
);
create index if not exists memberships_org_idx on public.memberships(org_id);

-- ---------- جداول الوحدات (تخزين JSONB لكل سجل) ----------
-- id نصي = معرّف التطبيق (مثل emp_xxx)، data = الكائن كما تستخدمه الواجهة
do $$
declare t text;
begin
  foreach t in array array[
    'employees','temp_logs','inspections','ncs',
    'suppliers','pest_visits','cleaning_tasks','monitors',
    'haccp','batches','recipes','worker_checks'
  ] loop
    execute format($f$
      create table if not exists public.%I (
        id         text primary key,
        org_id     uuid not null references public.organizations(id) on delete cascade,
        data       jsonb not null,
        created_at timestamptz not null default now()
      );
      create index if not exists %I on public.%I(org_id);
    $f$, t, t || '_org_idx', t);
  end loop;
end $$;

-- ============================================================
--  Row-Level Security — عزل بيانات كل منشأة
-- ============================================================
alter table public.organizations enable row level security;
alter table public.memberships   enable row level security;

-- المنشأة: يراها/يحدّثها أعضاؤها فقط (الإنشاء عبر RPC أدناه)
drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations for select
  using (id in (select org_id from public.memberships where user_id = auth.uid()));

drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations for update
  using (id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','manager')));

-- العضويات: يرى المستخدم أعضاء منشآته
drop policy if exists mem_select on public.memberships;
create policy mem_select on public.memberships for select
  using (org_id in (select org_id from public.memberships where user_id = auth.uid()));

-- جداول الوحدات: كل العمليات مقيّدة بمنشآت المستخدم
do $$
declare t text;
begin
  foreach t in array array[
    'employees','temp_logs','inspections','ncs',
    'suppliers','pest_visits','cleaning_tasks','monitors',
    'haccp','batches','recipes','worker_checks'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists tenant_all on public.%I;', t);
    execute format($p$
      create policy tenant_all on public.%I for all
        using (org_id in (select org_id from public.memberships where user_id = auth.uid()))
        with check (org_id in (select org_id from public.memberships where user_id = auth.uid()));
    $p$, t);
  end loop;
end $$;

-- ============================================================
--  RPC: إنشاء منشأة للمستخدم الحالي عند أول تسجيل
--  (security definer ليتجاوز RLS أثناء الإنشاء الأولي)
-- ============================================================
create or replace function public.create_org_for_current_user(
  p_name text, p_city text default null, p_license text default null
) returns public.organizations
language plpgsql security definer set search_path = public as $$
declare org public.organizations;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  insert into public.organizations(name, city, license)
  values (coalesce(nullif(trim(p_name), ''), 'منشأتي'), p_city, p_license)
  returning * into org;

  insert into public.memberships(user_id, org_id, role)
  values (auth.uid(), org.id, 'owner');

  return org;
end $$;

grant execute on function public.create_org_for_current_user(text, text, text) to authenticated;

-- ============================================================
--  ملاحظات:
--  • الخطط والحدود تُدار في الواجهة (assets/js/cloud.js → PLAN_LIMITS).
--  • لإضافة الفوترة لاحقًا: تُحدّث organizations.plan/subscription_status
--    من Webhook بوابة الدفع (Moyasar/Tap/Stripe) عبر Edge Function.
--  • لدعوة أعضاء إضافيين لاحقًا: أضِف RPC مماثلًا لإدراج membership.
-- ============================================================
