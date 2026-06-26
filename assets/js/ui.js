/* ============================================================
   ui.js — أدوات الواجهة (نوافذ، تنبيهات، عناصر مساعدة)
   ============================================================ */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);

  // تهريب النص لمنع الحقن
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------- التنبيهات ----------
  function toast(msg, type = '') {
    const wrap = $('#toast-wrap');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = (type === 'ok' ? '✓ ' : type === 'err' ? '⚠ ' : '') + esc(msg);
    wrap.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = '.3s'; setTimeout(() => el.remove(), 300); }, 2800);
  }

  // ---------- النوافذ المنبثقة ----------
  // إضافة عرض عربي مقروء أسفل حقول التاريخ الأصلية
  function enhanceDateInputs(root) {
    root.querySelectorAll('input[type=date]').forEach(inp => {
      if (inp.dataset.arEnhanced) return;
      inp.dataset.arEnhanced = '1';
      const hint = document.createElement('div');
      hint.className = 'date-ar muted';
      const upd = () => { hint.textContent = inp.value ? '📅 ' + fmtDate(inp.value) : ''; };
      upd();
      inp.addEventListener('input', upd);
      inp.addEventListener('change', upd);
      inp.insertAdjacentElement('afterend', hint);
    });
  }

  function modal(title, bodyHTML, opts = {}) {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = bodyHTML;
    $('#modal').classList.toggle('wide', !!opts.wide);
    $('#modal-overlay').classList.remove('hidden');
    enhanceDateInputs($('#modal-body'));
    if (typeof opts.onOpen === 'function') opts.onOpen($('#modal-body'));
    return $('#modal-body');
  }
  function closeModal() { $('#modal-overlay').classList.add('hidden'); }

  function confirmDialog(message, onYes, yesLabel = 'تأكيد') {
    modal('تأكيد', `
      <p style="margin-bottom:18px">${esc(message)}</p>
      <div class="form-actions">
        <button class="btn-danger" id="cf-yes">${esc(yesLabel)}</button>
        <button class="btn-secondary" id="cf-no">إلغاء</button>
      </div>`);
    $('#cf-yes').onclick = () => { closeModal(); onYes(); };
    $('#cf-no').onclick = closeModal;
  }

  // ---------- عناصر مساعدة ----------
  function badge(text, color) { return `<span class="badge ${color}">${esc(text)}</span>`; }

  function statusBadge(status) {
    const map = {
      'مطابق': 'green', 'مكتمل': 'green', 'معتمد': 'green', 'مغلقة': 'green', 'مكتملة': 'green', 'سارية': 'green',
      'مخالف': 'red', 'مفتوحة': 'red', 'حرجة': 'red', 'منتهية': 'red',
      'قيد المعالجة': 'amber', 'تحت المراجعة': 'amber', 'عالية': 'amber', 'متوسطة': 'amber',
    };
    return badge(status, map[status] || 'gray');
  }

  function expiryBadge(dateISO) {
    const d = window.Store.daysFromToday(dateISO);
    if (d < 0) return badge('منتهية منذ ' + Math.abs(d) + ' يوم', 'red');
    if (d <= 7) return badge('تنتهي خلال ' + d + ' يوم', 'red');
    if (d <= 30) return badge('تنتهي خلال ' + d + ' يوم', 'amber');
    return badge('سارية (' + d + ' يوم)', 'green');
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return iso; }
  }

  function donut(percent, label, color) {
    const c = color || (percent >= 85 ? '#16a34a' : percent >= 60 ? '#d97706' : '#dc2626');
    const r = 54, circ = 2 * Math.PI * r, off = circ * (1 - percent / 100);
    return `
      <div class="donut">
        <svg width="130" height="130" viewBox="0 0 130 130">
          <circle cx="65" cy="65" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="14"/>
          <circle cx="65" cy="65" r="${r}" fill="none" stroke="${c}" stroke-width="14"
            stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}"
            transform="rotate(-90 65 65)"/>
        </svg>
        <div class="donut-label"><strong>${percent}%</strong><span>${esc(label)}</span></div>
      </div>`;
  }

  function empty(text, icon = '📭') {
    return `<div class="empty"><span class="ic">${icon}</span>${esc(text)}</div>`;
  }

  function progress(pct, color) {
    return `<div class="progress"><span style="width:${pct}%${color ? ';background:' + color : ''}"></span></div>`;
  }

  // قراءة قيم نموذج إلى كائن
  function readForm(root) {
    const out = {};
    root.querySelectorAll('[name]').forEach(el => {
      if (el.type === 'checkbox') out[el.name] = el.checked;
      else out[el.name] = el.value.trim();
    });
    return out;
  }

  window.UI = { $, esc, toast, modal, closeModal, confirmDialog, badge, statusBadge, expiryBadge, fmtDate, donut, empty, progress, readForm };

  // إغلاق النافذة عند الضغط على الخلفية أو زر الإغلاق
  document.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay' || e.target.id === 'modal-close') closeModal();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
})();
