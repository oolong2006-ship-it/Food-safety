-- ============================================================
--  03_admin_activation.sql — أدوات تفعيل وإدارة العملاء (للمشغّل)
--  شغّلها في Supabase → SQL Editor عند الحاجة (صلاحية إدارية).
--  تُستخدم لتفعيل خطة عميل، الترقية، تمديد التجربة، الإيقاف، والمتابعة.
-- ============================================================

-- ------------------------------------------------------------
-- 1) عرض كل المنشآت (العملاء) مع المالك والخطة والحالة
--    استخدمها لمعرفة org_id الخاص بالعميل الذي تريد تفعيله.
-- ------------------------------------------------------------
select
  o.id            as org_id,
  o.name          as facility_name,
  o.plan,
  o.subscription_status,
  o.trial_ends_at,
  o.created_at,
  p.email         as owner_email
from public.organizations o
left join public.memberships m on m.org_id = o.id and m.role = 'owner'
left join public.profiles    p on p.id = m.user_id
order by o.created_at desc;

-- ------------------------------------------------------------
-- 2) تفعيل/ترقية خطة عميل  (الأساسية basic / الاحترافية pro / المؤسسية enterprise)
--    استبدل ORG_ID والخطة. status='active' تعني اشتراكًا مدفوعًا فعّالًا.
-- ------------------------------------------------------------
update public.organizations
set plan = 'pro',                         -- basic | pro | enterprise
    subscription_status = 'active',
    -- مدة الاشتراك (شهر/سنة): عدّل حسب اتفاقك مع العميل
    current_period_end = now() + interval '1 month'
where id = 'ORG_ID_HERE';

-- ------------------------------------------------------------
-- 3) تفعيل عميل بالبريد مباشرة (بدون معرفة org_id يدويًا)
--    يفعّل منشأة المالك صاحب هذا البريد.
-- ------------------------------------------------------------
update public.organizations o
set plan = 'pro', subscription_status = 'active',
    current_period_end = now() + interval '1 year'
where o.id in (
  select m.org_id from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.role = 'owner' and lower(p.email) = lower('customer@example.com')
);

-- ------------------------------------------------------------
-- 4) تمديد الفترة التجريبية لعميل (مثال: +14 يومًا)
-- ------------------------------------------------------------
update public.organizations
set trial_ends_at = greatest(trial_ends_at, now()) + interval '14 days'
where id = 'ORG_ID_HERE';

-- ------------------------------------------------------------
-- 5) إيقاف/تعليق اشتراك (عند عدم السداد) — يرجع للوضع المحدود
-- ------------------------------------------------------------
update public.organizations
set subscription_status = 'past_due'      -- أو 'canceled'
where id = 'ORG_ID_HERE';

-- ------------------------------------------------------------
-- 6) دالة مساعدة اختيارية لتفعيل عميل بالبريد بسطر واحد
--    بعد إنشائها مرة واحدة، استدعِها هكذا:
--      select admin_activate('customer@example.com', 'pro', 12);
-- ------------------------------------------------------------
create or replace function public.admin_activate(
  p_email text, p_plan text default 'pro', p_months int default 12
) returns text
language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select m.org_id into v_org
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.role = 'owner' and lower(p.email) = lower(p_email)
  limit 1;
  if v_org is null then return 'لم يُعثر على منشأة لهذا البريد'; end if;

  update public.organizations
  set plan = p_plan, subscription_status = 'active',
      current_period_end = now() + (p_months || ' months')::interval
  where id = v_org;
  return 'تم تفعيل ' || p_plan || ' للمنشأة ' || v_org;
end $$;

-- ملاحظة: admin_activate تعمل بصلاحية definer؛ لا تمنح صلاحية تنفيذها لأدوار العملاء.
-- لا تستدعِها من تطبيق العميل — استخدمها فقط أنت (المشغّل) من SQL Editor.
revoke all on function public.admin_activate(text, text, int) from anon, authenticated;
