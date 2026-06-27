/* ============================================================
   admin.js — لوحة تحكم المشغّل
   ============================================================ */
(function () {
  const PLAN_LABELS   = { trial: 'تجريبية', basic: 'أساسية', pro: 'احترافية', enterprise: 'مؤسسية' };
  const STATUS_LABELS = { trialing: 'تجريبي', active: 'مفعّل', past_due: 'متأخر السداد', canceled: 'ملغي' };

  let client = null;
  let allOrgs = [];
  let currentOrgId = null;

  /* ── تهيئة ── */
  function init() {
    const cfg = window.SAAS || {};
    if (!cfg.url || !cfg.anonKey) {
      alert('لم يتم ضبط إعدادات Supabase في config.js');
      return;
    }
    client = supabase.createClient(cfg.url, cfg.anonKey);
    bindLogin();
    checkSession();
  }

  /* ── تسجيل الدخول ── */
  function bindLogin() {
    const btn = document.getElementById('a-login');
    const msg = document.getElementById('login-msg');
    async function doLogin() {
      const email = document.getElementById('a-email').value.trim();
      const pass  = document.getElementById('a-pass').value;
      if (!email || !pass) { msg.textContent = 'أدخل البريد وكلمة المرور'; return; }
      btn.disabled = true; msg.textContent = '⏳ جارٍ الدخول...';
      const { error } = await client.auth.signInWithPassword({ email, password: pass });
      if (error) { msg.textContent = '⚠ ' + error.message; btn.disabled = false; return; }
      checkSession();
    }
    btn.onclick = doLogin;
    document.getElementById('a-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  }

  async function checkSession() {
    const { data: { session } } = await client.auth.getSession();
    if (!session) return;

    const adminEmails = ((window.SAAS || {}).adminEmails || []).map(e => e.toLowerCase());
    if (adminEmails.length > 0 && !adminEmails.includes(session.user.email.toLowerCase())) {
      document.getElementById('login-msg').textContent = '⛔ ليس لديك صلاحية الوصول لهذه الصفحة';
      await client.auth.signOut();
      return;
    }

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('admin-email').textContent = session.user.email;
    loadData();
  }

  document.getElementById('btn-logout').onclick = async () => {
    await client.auth.signOut();
    location.reload();
  };

  /* ── تحميل البيانات ── */
  async function loadData() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('table-wrap').style.display = 'none';

    const [{ data: orgs, error: e1 }, { data: members, error: e2 }] = await Promise.all([
      client.from('organizations').select('*').order('created_at', { ascending: false }),
      client.from('memberships').select('org_id, email').eq('role', 'owner'),
    ]);

    if (e1 || e2) {
      document.getElementById('loading').textContent = 'خطأ في تحميل البيانات: ' + ((e1 || e2).message);
      return;
    }

    // ربط البريد بالمنشأة
    const emailMap = {};
    (members || []).forEach(m => { emailMap[m.org_id] = m.email; });
    allOrgs = (orgs || []).map(o => ({ ...o, ownerEmail: emailMap[o.id] || '—' }));

    updateStats();
    renderTable(allOrgs);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('table-wrap').style.display = 'block';
  }

  document.getElementById('btn-refresh').onclick = loadData;

  /* ── تصدير CSV ── */
  const exportBtn = document.getElementById('btn-export');
  if (exportBtn) {
    exportBtn.onclick = () => {
      if (!allOrgs.length) return;
      const headers = ['#', 'المنشأة', 'المدينة', 'البريد', 'الخطة', 'الحالة', 'انتهاء التجربة', 'تاريخ التسجيل'];
      const rows = allOrgs.map((o, i) => [
        i + 1, o.name, o.city || '', o.ownerEmail,
        PLAN_LABELS[o.plan] || o.plan,
        STATUS_LABELS[o.subscription_status] || o.subscription_status,
        o.trial_ends_at ? new Date(o.trial_ends_at).toLocaleDateString('ar-SA') : '',
        o.created_at ? new Date(o.created_at).toLocaleDateString('ar-SA') : '',
      ]);
      const csv = [headers, ...rows].map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = 'تفتيش-العملاء-' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click(); URL.revokeObjectURL(url);
    };
  }

  /* ── إحصاءات ── */
  function updateStats() {
    const now = Date.now();
    document.getElementById('s-total').textContent   = allOrgs.length;
    document.getElementById('s-trial').textContent   = allOrgs.filter(o => o.subscription_status === 'trialing' && (!o.trial_ends_at || new Date(o.trial_ends_at).getTime() > now)).length;
    document.getElementById('s-active').textContent  = allOrgs.filter(o => o.subscription_status === 'active').length;
    document.getElementById('s-due').textContent     = allOrgs.filter(o => ['past_due','canceled'].includes(o.subscription_status)).length;
    const expEl = document.getElementById('s-expired');
    if (expEl) expEl.textContent = allOrgs.filter(o => o.subscription_status === 'trialing' && o.trial_ends_at && new Date(o.trial_ends_at).getTime() <= now).length;
  }

  /* ── جدول العملاء ── */
  function renderTable(orgs) {
    const tbody = document.getElementById('orgs-body');
    const empty = document.getElementById('empty-msg');
    if (!orgs.length) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = orgs.map((o, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${esc(o.name)}</strong></td>
        <td>${esc(o.city || '—')}</td>
        <td style="direction:ltr;text-align:right">${esc(o.ownerEmail)}</td>
        <td><span class="badge badge-${o.plan}">${PLAN_LABELS[o.plan] || o.plan}</span></td>
        <td><span class="badge badge-${o.subscription_status}">${STATUS_LABELS[o.subscription_status] || o.subscription_status}</span></td>
        <td>${formatDate(o.trial_ends_at)}</td>
        <td>${formatDate(o.created_at)}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-sm btn-extend"  onclick="AdminPanel.openModal('${o.id}')">إدارة</button>
          </div>
        </td>
      </tr>`).join('');
  }

  /* ── بحث ── */
  document.getElementById('search').addEventListener('input', function () {
    const q = this.value.toLowerCase();
    const filtered = q
      ? allOrgs.filter(o => o.name.toLowerCase().includes(q) || o.ownerEmail.toLowerCase().includes(q))
      : allOrgs;
    renderTable(filtered);
  });

  /* ── مودال الإجراء ── */
  function openModal(orgId) {
    currentOrgId = orgId;
    const org = allOrgs.find(o => o.id === orgId);
    if (!org) return;
    const planLabel   = PLAN_LABELS[org.plan]   || org.plan;
    const statusLabel = STATUS_LABELS[org.subscription_status] || org.subscription_status;
    const trialInfo   = org.trial_ends_at ? ` · تنتهي التجربة: ${formatDate(org.trial_ends_at)}` : '';
    document.getElementById('modal-org-name').innerHTML =
      `<strong>${esc(org.name)}</strong><br><small style="font-weight:400;opacity:.85">${esc(org.ownerEmail)}</small><br>` +
      `<small style="font-weight:400;opacity:.75">الخطة: ${esc(planLabel)} · الحالة: ${esc(statusLabel)}${esc(trialInfo)}</small>`;
    document.getElementById('modal-msg').textContent = '';
    document.getElementById('modal-msg').className = 'modal-msg';
    document.getElementById('modal-overlay').classList.remove('hidden');
  }

  function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); currentOrgId = null; }
  document.getElementById('modal-close').onclick  = closeModal;
  document.getElementById('modal-overlay').onclick = e => { if (e.target === document.getElementById('modal-overlay')) closeModal(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  function setMsg(text, ok) {
    const el = document.getElementById('modal-msg');
    el.textContent = text;
    el.className = 'modal-msg ' + (ok ? 'msg-ok' : 'msg-err');
  }

  /* تمديد التجربة */
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.onclick = async () => {
      if (!currentOrgId) return;
      btn.disabled = true;
      const days = parseInt(btn.dataset.days);
      const { error } = await client.from('organizations')
        .update({ trial_ends_at: new Date(Date.now() + days * 86400000).toISOString() })
        .eq('id', currentOrgId);
      btn.disabled = false;
      if (error) { setMsg('⚠ ' + error.message, false); return; }
      setMsg(`✓ تم تمديد الفترة التجريبية ${days} يوم`, true);
      loadData();
    };
  });

  /* تفعيل/تغيير الخطة */
  document.querySelectorAll('.plan-btn').forEach(btn => {
    btn.onclick = async () => {
      if (!currentOrgId) return;
      btn.disabled = true;
      const plan = btn.dataset.plan;
      const isBack = plan === 'trial';
      const updates = isBack
        ? { plan: 'trial', subscription_status: 'trialing', current_period_end: null }
        : { plan, subscription_status: 'active', current_period_end: new Date(Date.now() + 365 * 86400000).toISOString() };
      const { error } = await client.from('organizations').update(updates).eq('id', currentOrgId);
      btn.disabled = false;
      if (error) { setMsg('⚠ ' + error.message, false); return; }
      setMsg(isBack ? '✓ تم الرجوع للخطة التجريبية' : `✓ تم تفعيل خطة: ${PLAN_LABELS[plan]}`, true);
      loadData();
    };
  });

  /* إيقاف */
  document.getElementById('btn-suspend').onclick = async () => {
    if (!currentOrgId) return;
    if (!confirm('هل أنت متأكد من إيقاف هذا الحساب؟')) return;
    const { error } = await client.from('organizations')
      .update({ subscription_status: 'past_due' })
      .eq('id', currentOrgId);
    if (error) { setMsg('⚠ ' + error.message, false); return; }
    setMsg('✓ تم إيقاف الاشتراك', true);
    loadData();
  };

  /* ── مساعدات ── */
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  window.AdminPanel = { openModal };
  document.addEventListener('DOMContentLoaded', init);
})();
