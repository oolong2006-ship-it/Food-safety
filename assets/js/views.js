/* ============================================================
   views.js — شاشات النظام (الوحدات الوظيفية)
   ============================================================ */
(function () {
  const S = window.Store, U = window.UI;
  const esc = U.esc, fmtDate = U.fmtDate;
  const Views = {};

  /* ===================== لوحة المعلومات ===================== */
  Views.dashboard = function () {
    const m = S.metrics();
    const db = S.load();
    const kpi = (cls, ic, label, val, sub) => `
      <div class="card kpi ${cls}">
        <div class="kpi-ic">${ic}</div>
        <div class="kpi-label">${label}</div>
        <div class="kpi-value">${val}</div>
        <div class="kpi-sub">${sub}</div>
      </div>`;

    const readyCls = m.readiness >= 85 ? 'good' : m.readiness >= 60 ? 'warn' : 'bad';

    // أحدث المخالفات الحرارية
    const breaches = db.tempLogs.filter(t => t.status === 'مخالف').slice(0, 5);
    // الشهادات القريبة من الانتهاء
    const cards = [...db.employees].sort((a, b) => S.daysFromToday(a.healthCardExpiry) - S.daysFromToday(b.healthCardExpiry)).slice(0, 5);
    // مهام تنظيف متأخرة
    const overdue = db.cleaning.filter(c => S.daysFromToday(c.nextDue) < 0);

    return `
      <div class="grid cols-4">
        ${kpi(readyCls, '🛡️', 'جاهزية التفتيش', m.readiness + '%', 'مؤشر مرجّح للامتثال العام')}
        ${kpi(m.compliance >= 85 ? 'good' : m.compliance >= 60 ? 'warn' : 'bad', '✅', 'نسبة الامتثال GMP', m.compliance + '%', 'آخر تدقيق منفّذ')}
        ${kpi(m.openNCs ? 'bad' : 'good', '⚠️', 'حالات عدم مطابقة مفتوحة', m.openNCs, m.criticalNCs + ' حالة حرجة')}
        ${kpi(m.tempBreaches ? 'warn' : 'good', '🌡️', 'تجاوزات حرارية', m.tempBreaches, 'تحتاج إجراء تصحيحي')}
      </div>

      <div class="grid cols-3 section-gap">
        <div class="card">
          <div class="card-title">🎯 مؤشر الجاهزية للتفتيش</div>
          <div class="donut-wrap">
            ${U.donut(m.readiness, 'الجاهزية')}
            <div style="flex:1">
              <div class="row-line"><span class="dot ${m.criticalNCs ? 'red' : 'green'}"></span> مخالفات حرجة<span class="spacer"></span><strong>${m.criticalNCs}</strong></div>
              <div class="row-line"><span class="dot ${m.expiredCards ? 'red' : 'green'}"></span> شهادات منتهية<span class="spacer"></span><strong>${m.expiredCards}</strong></div>
              <div class="row-line"><span class="dot ${m.overdueCleaning ? 'amber' : 'green'}"></span> مهام تنظيف متأخرة<span class="spacer"></span><strong>${m.overdueCleaning}</strong></div>
              <div class="row-line"><span class="dot ${m.tempBreaches ? 'amber' : 'green'}"></span> تجاوزات حرارية<span class="spacer"></span><strong>${m.tempBreaches}</strong></div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">🌡️ آخر التجاوزات الحرارية</div>
          ${breaches.length ? `<div class="list-tight">${breaches.map(t => `
            <div class="row-line">
              <span class="dot red"></span>
              <div><strong>${esc(t.unit)}</strong><br><small class="muted">${esc(t.date)} — ${esc(t.time)}</small></div>
              <span class="spacer"></span>
              <strong style="color:#dc2626">${t.value}°م</strong>
            </div>`).join('')}</div>` : U.empty('لا توجد تجاوزات حرارية 👍', '🌡️')}
        </div>

        <div class="card">
          <div class="card-title">🪪 شهادات صحية تحتاج متابعة</div>
          <div class="list-tight">${cards.map(e => `
            <div class="row-line">
              <div><strong>${esc(e.name)}</strong><br><small class="muted">${esc(e.role)}</small></div>
              <span class="spacer"></span>
              ${U.expiryBadge(e.healthCardExpiry)}
            </div>`).join('')}</div>
        </div>
      </div>

      <div class="grid cols-2 section-gap">
        <div class="card">
          <div class="card-title">🚨 حالات عدم المطابقة المفتوحة <span class="spacer"></span><button class="btn-secondary btn-sm" onclick="App.go('nc')">عرض الكل</button></div>
          ${(() => { const list = db.ncs.filter(n => n.status !== 'مغلقة').slice(0, 5);
            return list.length ? `<div class="list-tight">${list.map(n => `
              <div class="row-line">
                <span class="dot ${n.severity === 'حرجة' ? 'red' : n.severity === 'عالية' ? 'amber' : 'green'}"></span>
                <div style="flex:1"><strong>${esc(n.title)}</strong><br><small class="muted">المسؤول: ${esc(n.owner)} — استحقاق: ${esc(n.dueDate)}</small></div>
                ${U.statusBadge(n.severity)}
              </div>`).join('')}</div>` : U.empty('لا توجد حالات مفتوحة 🎉'); })()}
        </div>

        <div class="card">
          <div class="card-title">🧹 مهام تنظيف متأخرة <span class="spacer"></span><button class="btn-secondary btn-sm" onclick="App.go('cleaning')">الجدول</button></div>
          ${overdue.length ? `<div class="list-tight">${overdue.map(c => `
            <div class="row-line">
              <span class="dot red"></span>
              <div style="flex:1"><strong>${esc(c.task)}</strong><br><small class="muted">${esc(c.area)} — ${esc(c.frequency)}</small></div>
              ${U.badge('متأخرة', 'red')}
            </div>`).join('')}</div>` : U.empty('كل مهام التنظيف محدّثة ✨', '🧹')}
        </div>
      </div>`;
  };

  /* ===================== التفتيش الذاتي / GMP ===================== */
  Views.inspections = function () {
    const db = S.load();
    const rows = [...db.inspections].sort((a, b) => b.date.localeCompare(a.date)).map(i => {
      const score = S.inspectionScore(i);
      const col = score >= 85 ? 'green' : score >= 60 ? 'amber' : 'red';
      return `<tr>
        <td><strong>${esc(i.templateName)}</strong></td>
        <td>${esc(i.by)}</td>
        <td>${fmtDate(i.date)}</td>
        <td><div style="display:flex;align-items:center;gap:8px"><span>${score}%</span><div style="width:80px">${U.progress(score, col === 'green' ? '#16a34a' : col === 'amber' ? '#d97706' : '#dc2626')}</div></div></td>
        <td>${U.badge(score >= 85 ? 'ممتاز' : score >= 60 ? 'مقبول' : 'يحتاج تحسين', col)}</td>
        <td class="t-actions">
          <button class="btn-secondary btn-sm" onclick="Views.viewInspection('${i.id}')">عرض</button>
          <button class="btn-danger btn-sm" onclick="Views.delInspection('${i.id}')">حذف</button>
        </td>
      </tr>`;
    }).join('');

    return `
      <div class="page-head">
        <div><h2>التفتيش الذاتي و GMP</h2><p>نفّذ عمليات التدقيق الداخلي وفق قوائم سلامة الغذاء وممارسات التصنيع الجيدة</p></div>
        <div class="spacer"></div>
        <button class="btn-primary" onclick="Views.newInspection()">+ تدقيق جديد</button>
      </div>
      ${db.inspections.length ? `<div class="table-wrap"><table>
        <thead><tr><th>القائمة</th><th>المدقّق</th><th>التاريخ</th><th>النتيجة</th><th>التقييم</th><th>إجراءات</th></tr></thead>
        <tbody>${rows}</tbody></table></div>` : U.empty('لا توجد عمليات تدقيق بعد. ابدأ بإنشاء تدقيق جديد.', '📋')}`;
  };

  Views.newInspection = function () {
    const opts = Object.entries(S.CHECKLIST_TEMPLATES).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('');
    U.modal('بدء تدقيق جديد', `
      <div class="form-grid">
        <div class="field"><label>نوع القائمة</label><select id="tpl">${opts}</select></div>
        <div class="field"><label>اسم المدقّق</label><input id="by" value="${esc(App.user.name)}" /></div>
        <div class="form-actions"><button class="btn-primary" id="start">بدء التدقيق</button></div>
      </div>`);
    U.$('#start').onclick = () => {
      const tpl = U.$('#tpl').value, by = U.$('#by').value.trim() || App.user.name;
      const t = S.CHECKLIST_TEMPLATES[tpl];
      const insp = {
        id: S.uid('insp'), template: tpl, templateName: t.name, by, date: S.todayISO(), status: 'قيد التنفيذ',
        sections: t.sections.map(s => ({ title: s.title, items: s.items.map(x => ({ text: x, result: 'yes', note: '' })) }))
      };
      S.add('inspections', insp);
      U.closeModal();
      Views.runInspection(insp.id);
    };
  };

  Views.runInspection = function (id) {
    const insp = S.get('inspections', id);
    if (!insp) return;
    const body = insp.sections.map((sec, si) => `
      <h4 style="margin:16px 0 10px;color:#0f766e">${esc(sec.title)}</h4>
      ${sec.items.map((it, ii) => `
        <div class="check-item" data-s="${si}" data-i="${ii}">
          <div class="ci-text">${esc(it.text)}</div>
          <div class="seg">
            <button data-v="yes" class="${it.result === 'yes' ? 'on-yes' : ''}">مطابق</button>
            <button data-v="no" class="${it.result === 'no' ? 'on-no' : ''}">مخالف</button>
            <button data-v="na" class="${it.result === 'na' ? 'on-na' : ''}">لا ينطبق</button>
          </div>
          <button class="btn-secondary btn-sm ai-eval" title="تقييم البند بالذكاء الاصطناعي">🤖</button>
        </div>`).join('')}`).join('');

    U.modal('تنفيذ التدقيق: ' + insp.templateName, `
      <div id="insp-run">${body}</div>
      <div class="modal-sticky-foot">
        <button class="btn-primary" id="save-insp">حفظ وإنهاء التدقيق</button>
        <span class="spacer" style="flex:1"></span>
        <span id="live-score"></span>
      </div>`, { wide: true });

    const recompute = () => {
      const sc = S.inspectionScore(insp);
      const col = sc >= 85 ? 'green' : sc >= 60 ? 'amber' : 'red';
      U.$('#live-score').innerHTML = 'النتيجة: ' + U.badge(sc + '%', col);
    };
    recompute();

    U.$('#insp-run').addEventListener('click', async (e) => {
      const aiBtn = e.target.closest('.ai-eval');
      if (aiBtn) {
        const item = aiBtn.closest('.check-item');
        const si = +item.dataset.s, ii = +item.dataset.i;
        Views.aiEvaluateItem(insp, si, ii, item);
        return;
      }
      const btn = e.target.closest('.seg button'); if (!btn) return;
      const item = btn.closest('.check-item');
      const si = +item.dataset.s, ii = +item.dataset.i, v = btn.dataset.v;
      insp.sections[si].items[ii].result = v;
      item.querySelectorAll('.seg button').forEach(b => b.className = '');
      btn.className = v === 'yes' ? 'on-yes' : v === 'no' ? 'on-no' : 'on-na';
      S.update('inspections', insp.id, { sections: insp.sections });
      recompute();
    });

    U.$('#save-insp').onclick = () => {
      S.update('inspections', insp.id, { status: 'مكتمل', sections: insp.sections });
      // إنشاء حالات عدم مطابقة تلقائيًا من البنود المخالفة
      let created = 0;
      insp.sections.forEach(sec => sec.items.forEach(it => {
        if (it.result === 'no') {
          S.add('ncs', { id: S.uid('nc'), title: it.text, severity: 'متوسطة', source: 'تدقيق ' + insp.templateName,
            status: 'مفتوحة', date: S.todayISO(), owner: insp.by, dueDate: S.shift(7), action: '', rootCause: '' });
          created++;
        }
      }));
      U.closeModal();
      U.toast('تم حفظ التدقيق' + (created ? ` وإنشاء ${created} حالة عدم مطابقة` : ''), 'ok');
      App.render();
    };
  };

  Views.aiEvaluateItem = async function (insp, si, ii, itemEl) {
    // لوحة نتائج مدمجة تحت البند (دون فتح نافذة جديدة)
    let panel = itemEl.nextElementSibling;
    if (panel && panel.classList.contains('ai-panel')) { panel.remove(); return; }
    panel = document.createElement('div');
    panel.className = 'ai-panel card';
    panel.style.cssText = 'margin:-4px 0 12px;background:#f0fdfa;border-color:#99f6e4';
    panel.innerHTML = '<span class="muted">⏳ يقيّم النظام البند...</span>';
    itemEl.insertAdjacentElement('afterend', panel);
    const text = insp.sections[si].items[ii].text;
    try {
      const r = await window.AI.evaluateItem(text);
      panel.innerHTML = `
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
          <strong>🤖 تقييم البند</strong>
          ${U.badge('مستوى الخطورة: ' + (r.risk || '—'), r.risk === 'عالٍ' ? 'red' : r.risk === 'متوسط' ? 'amber' : 'green')}
          <span class="muted" style="margin-inline-start:auto;font-size:12px">${r.source === 'ai' ? 'ذكاء اصطناعي' : 'محلي'}</span>
        </div>
        <p style="font-size:13px;margin-bottom:6px"><strong>الملاحظة:</strong> ${esc(r.clarity || '')}</p>
        <p style="font-size:13px;margin-bottom:6px"><strong>صياغة محسّنة:</strong> ${esc(r.improved || '')}</p>
        <p style="font-size:13px;margin-bottom:6px"><strong>إرشاد التحقق:</strong> ${esc(r.guidance || '')}</p>
        ${r.reference ? `<p class="muted" style="font-size:12px">المرجع: ${esc(r.reference)}</p>` : ''}
        <div class="form-actions" style="margin-top:8px">
          <button class="btn-primary btn-sm" id="ai-apply">✓ تحديث صياغة البند</button>
          <button class="btn-secondary btn-sm" id="ai-close">إغلاق</button>
        </div>`;
      panel.querySelector('#ai-close').onclick = () => panel.remove();
      const applyBtn = panel.querySelector('#ai-apply');
      if (!r.improved) applyBtn.style.display = 'none';
      else applyBtn.onclick = () => {
        insp.sections[si].items[ii].text = r.improved;
        S.update('inspections', insp.id, { sections: insp.sections });
        itemEl.querySelector('.ci-text').textContent = r.improved;
        panel.remove();
        U.toast('تم تحديث صياغة البند', 'ok');
      };
    } catch (e) {
      panel.innerHTML = `<span style="color:#dc2626">⚠ ${esc(e.message)}</span> <button class="btn-secondary btn-sm" onclick="this.parentElement.remove()">إغلاق</button>`;
    }
  };

  Views.viewInspection = function (id) {
    const insp = S.get('inspections', id); if (!insp) return;
    const score = S.inspectionScore(insp);
    const body = insp.sections.map(sec => {
      const items = sec.items.map(it => `
        <div class="row-line">
          <span class="dot ${it.result === 'yes' ? 'green' : it.result === 'no' ? 'red' : 'amber'}"></span>
          <div style="flex:1">${esc(it.text)}</div>
          ${U.badge(it.result === 'yes' ? 'مطابق' : it.result === 'no' ? 'مخالف' : 'لا ينطبق', it.result === 'yes' ? 'green' : it.result === 'no' ? 'red' : 'gray')}
        </div>`).join('');
      return `<h4 style="margin:14px 0 6px;color:#0f766e">${esc(sec.title)}</h4>${items}`;
    }).join('');
    U.modal(insp.templateName, `
      <div class="inline-stat" style="margin-bottom:14px">
        <div><strong>${score}%</strong><span>النتيجة</span></div>
        <div><strong>${esc(insp.by)}</strong><span>المدقّق</span></div>
        <div><strong>${esc(insp.date)}</strong><span>التاريخ</span></div>
      </div>${body}
      <div class="form-actions" style="margin-top:16px"><button class="btn-secondary" onclick="window.print()">🖨️ طباعة التقرير</button></div>`, { wide: true });
  };

  Views.delInspection = function (id) {
    U.confirmDialog('حذف هذا التدقيق نهائيًا؟', () => { S.remove('inspections', id); U.toast('تم الحذف', 'ok'); App.render(); }, 'حذف');
  };

  /* ===================== مراقبة درجات الحرارة ===================== */
  Views.temperature = function () {
    const db = S.load();
    const logs = [...db.tempLogs].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const breaches = logs.filter(t => t.status === 'مخالف').length;
    const rows = logs.slice(0, 60).map(t => `<tr>
      <td><strong>${esc(t.unit)}</strong></td>
      <td>${esc(t.type)}</td>
      <td><strong style="color:${t.status === 'مخالف' ? '#dc2626' : '#16a34a'}">${t.value}°م</strong></td>
      <td class="muted">${esc(t.target)}</td>
      <td>${fmtDate(t.date)} <small class="muted">${esc(t.time)}</small></td>
      <td>${esc(t.by)}</td>
      <td>${U.statusBadge(t.status)}</td>
      <td class="t-actions"><button class="btn-danger btn-sm" onclick="Views.delTemp('${t.id}')">حذف</button></td>
    </tr>`).join('');

    return `
      <div class="page-head">
        <div><h2>مراقبة درجات الحرارة</h2><p>سجّل وراقب حرارة الثلاجات والمجمدات والحفظ الساخن والطهي ضمن الحدود الآمنة</p></div>
        <div class="spacer"></div>
        <button class="btn-primary" onclick="Views.newTemp()">+ قراءة جديدة</button>
      </div>
      <div class="grid cols-3" style="margin-bottom:18px">
        <div class="card kpi info"><div class="kpi-ic">📊</div><div class="kpi-label">إجمالي القراءات</div><div class="kpi-value">${logs.length}</div></div>
        <div class="card kpi ${breaches ? 'bad' : 'good'}"><div class="kpi-ic">⚠️</div><div class="kpi-label">قراءات مخالفة</div><div class="kpi-value">${breaches}</div></div>
        <div class="card kpi good"><div class="kpi-ic">✅</div><div class="kpi-label">نسبة المطابقة</div><div class="kpi-value">${logs.length ? Math.round((1 - breaches / logs.length) * 100) : 100}%</div></div>
      </div>
      <div class="card" style="margin-bottom:18px">
        <div class="card-title">الحدود الحرارية المرجعية</div>
        <div class="inline-stat">
          <div><strong style="color:#2563eb">0–5°م</strong><span>التبريد (ثلاجات)</span></div>
          <div><strong style="color:#2563eb">-18°م أو أقل</strong><span>التجميد (مجمدات)</span></div>
          <div><strong style="color:#dc2626">63°م أو أعلى</strong><span>الحفظ الساخن</span></div>
          <div><strong style="color:#dc2626">75°م</strong><span>الحد الأدنى للطهي الآمن</span></div>
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>الوحدة</th><th>النوع</th><th>القراءة</th><th>الحد المسموح</th><th>التاريخ</th><th>المسؤول</th><th>الحالة</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
  };

  Views.newTemp = function () {
    U.modal('تسجيل قراءة حرارة', `
      <div class="form-grid two">
        <div class="field"><label>الوحدة / الجهاز</label><input name="unit" placeholder="مثال: ثلاجة اللحوم" /></div>
        <div class="field"><label>النوع</label><select name="type">
          <option>ثلاجة</option><option>مجمد</option><option>حفظ ساخن</option><option>طهي</option><option>استلام</option></select></div>
        <div class="field"><label>القراءة (°م)</label><input name="value" type="number" step="0.1" /></div>
        <div class="field"><label>الوقت</label><input name="time" type="time" value="${new Date().toTimeString().slice(0, 5)}" /></div>
        <div class="field field-full"><label>المسؤول</label><input name="by" value="${esc(App.user.name)}" /></div>
      </div>
      <div class="form-actions" style="margin-top:14px"><button class="btn-primary" id="save">حفظ القراءة</button></div>`,
      { onOpen: (root) => {
        U.$('#save').onclick = () => {
          const f = U.readForm(root);
          if (!f.unit || f.value === '') return U.toast('أكمل بيانات الوحدة والقراءة', 'err');
          const val = parseFloat(f.value);
          const ranges = { 'ثلاجة': [0, 5], 'مجمد': [-99, -18], 'حفظ ساخن': [63, 200], 'طهي': [75, 300], 'استلام': [0, 5] };
          const [lo, hi] = ranges[f.type] || [0, 5];
          const status = (val >= lo && val <= hi) ? 'مطابق' : 'مخالف';
          const targetTxt = { 'ثلاجة': '0 إلى 5', 'مجمد': '-18 أو أقل', 'حفظ ساخن': '63 أو أعلى', 'طهي': '75 أو أعلى', 'استلام': '0 إلى 5' }[f.type];
          S.add('tempLogs', { id: S.uid('tmp'), unit: f.unit, type: f.type, value: val, target: targetTxt, status, date: S.todayISO(), time: f.time, by: f.by });
          if (status === 'مخالف') {
            S.add('ncs', { id: S.uid('nc'), title: `تجاوز حراري: ${f.unit} عند ${val}°م`, severity: 'حرجة', source: 'مراقبة الحرارة', status: 'مفتوحة', date: S.todayISO(), owner: f.by, dueDate: S.shift(1), action: '', rootCause: '' });
          }
          U.closeModal();
          U.toast(status === 'مخالف' ? 'قراءة مخالفة! تم فتح حالة عدم مطابقة' : 'تم حفظ القراءة', status === 'مخالف' ? 'err' : 'ok');
          App.render();
        };
      } });
  };

  Views.delTemp = function (id) { S.remove('tempLogs', id); U.toast('تم الحذف', 'ok'); App.render(); };

  /* ===================== العاملون والشهادات الصحية ===================== */
  Views.employees = function () {
    const db = S.load();
    const rows = [...db.employees].sort((a, b) => S.daysFromToday(a.healthCardExpiry) - S.daysFromToday(b.healthCardExpiry)).map(e => `<tr>
      <td><strong>${esc(e.name)}</strong></td>
      <td>${esc(e.role)}</td>
      <td>${esc(e.dept)}</td>
      <td>${fmtDate(e.healthCardExpiry)}</td>
      <td>${U.expiryBadge(e.healthCardExpiry)}</td>
      <td>${(e.training || []).length ? e.training.map(t => U.badge(t, 'blue')).join(' ') : '<span class="muted">—</span>'}</td>
      <td class="t-actions">
        <button class="btn-secondary btn-sm" onclick="Views.editEmployee('${e.id}')">تعديل</button>
        <button class="btn-danger btn-sm" onclick="Views.delEmployee('${e.id}')">حذف</button>
      </td>
    </tr>`).join('');
    const expired = db.employees.filter(e => S.daysFromToday(e.healthCardExpiry) < 0).length;
    const soon = db.employees.filter(e => { const d = S.daysFromToday(e.healthCardExpiry); return d >= 0 && d <= 30; }).length;

    return `
      <div class="page-head">
        <div><h2>العاملون والشهادات الصحية</h2><p>تتبّع الكوادر، صلاحية الشهادات الصحية، والتدريب على سلامة الغذاء</p></div>
        <div class="spacer"></div>
        <button class="btn-primary" onclick="Views.editEmployee()">+ إضافة عامل</button>
      </div>
      <div class="grid cols-3" style="margin-bottom:18px">
        <div class="card kpi info"><div class="kpi-ic">👥</div><div class="kpi-label">إجمالي العاملين</div><div class="kpi-value">${db.employees.length}</div></div>
        <div class="card kpi ${expired ? 'bad' : 'good'}"><div class="kpi-ic">🪪</div><div class="kpi-label">شهادات منتهية</div><div class="kpi-value">${expired}</div></div>
        <div class="card kpi ${soon ? 'warn' : 'good'}"><div class="kpi-ic">⏰</div><div class="kpi-label">تنتهي خلال 30 يوم</div><div class="kpi-value">${soon}</div></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>الاسم</th><th>الوظيفة</th><th>القسم</th><th>انتهاء الشهادة</th><th>الحالة</th><th>التدريب</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
  };

  Views.editEmployee = function (id) {
    const e = id ? S.get('employees', id) : { name: '', role: '', dept: '', healthCardExpiry: S.shift(365), hireDate: S.todayISO(), training: [] };
    const trainings = ['أساسيات سلامة الغذاء', 'HACCP', 'تدقيق داخلي', 'النظافة الشخصية', 'مكافحة الآفات'];
    U.modal(id ? 'تعديل بيانات العامل' : 'إضافة عامل', `
      <div class="form-grid two">
        <div class="field"><label>الاسم</label><input name="name" value="${esc(e.name)}" /></div>
        <div class="field"><label>الوظيفة</label><input name="role" value="${esc(e.role)}" /></div>
        <div class="field"><label>القسم</label><input name="dept" value="${esc(e.dept)}" /></div>
        <div class="field"><label>تاريخ التعيين</label><input name="hireDate" type="date" value="${esc(e.hireDate)}" /></div>
        <div class="field field-full"><label>انتهاء الشهادة الصحية</label><input name="healthCardExpiry" type="date" value="${esc(e.healthCardExpiry)}" /></div>
        <div class="field field-full"><label>الدورات التدريبية</label>
          <div id="tr-box" style="display:flex;flex-wrap:wrap;gap:8px">
            ${trainings.map(t => `<label style="display:flex;gap:5px;align-items:center;font-weight:400;background:#f8fafc;padding:6px 10px;border-radius:8px;border:1px solid var(--line)">
              <input type="checkbox" value="${esc(t)}" ${(e.training || []).includes(t) ? 'checked' : ''}/> ${esc(t)}</label>`).join('')}
          </div></div>
      </div>
      <div class="form-actions" style="margin-top:14px"><button class="btn-primary" id="save">حفظ</button></div>`,
      { onOpen: (root) => {
        U.$('#save').onclick = () => {
          const f = U.readForm(root);
          if (!f.name) return U.toast('أدخل اسم العامل', 'err');
          f.training = [...root.querySelectorAll('#tr-box input:checked')].map(x => x.value);
          if (id) S.update('employees', id, f); else S.add('employees', f);
          U.closeModal(); U.toast('تم الحفظ', 'ok'); App.render();
        };
      } });
  };

  Views.delEmployee = function (id) {
    U.confirmDialog('حذف هذا العامل؟', () => { S.remove('employees', id); U.toast('تم الحذف', 'ok'); App.render(); }, 'حذف');
  };

  /* ===================== عدم المطابقة و CAPA ===================== */
  Views.nc = function () {
    const db = S.load();
    const list = [...db.ncs].sort((a, b) => b.date.localeCompare(a.date));
    const rows = list.map(n => `<tr>
      <td><strong>${n.photo ? '📷 ' : ''}${esc(n.title)}</strong><br><small class="muted">${esc(n.source)}</small></td>
      <td>${U.statusBadge(n.severity)}</td>
      <td>${esc(n.owner)}</td>
      <td>${fmtDate(n.dueDate)}</td>
      <td>${U.statusBadge(n.status)}</td>
      <td class="t-actions">
        <button class="btn-secondary btn-sm" onclick="Views.editNC('${n.id}')">معالجة</button>
        <button class="btn-danger btn-sm" onclick="Views.delNC('${n.id}')">حذف</button>
      </td>
    </tr>`).join('');
    const open = list.filter(n => n.status !== 'مغلقة').length;
    const crit = list.filter(n => n.severity === 'حرجة' && n.status !== 'مغلقة').length;

    return `
      <div class="page-head">
        <div><h2>عدم المطابقة والإجراءات التصحيحية (CAPA)</h2><p>توثيق المخالفات، تحليل الأسباب الجذرية، ومتابعة الإجراءات التصحيحية حتى الإغلاق</p></div>
        <div class="spacer"></div>
        <button class="btn-primary" onclick="Views.editNC()">+ حالة جديدة</button>
      </div>
      <div class="grid cols-3" style="margin-bottom:18px">
        <div class="card kpi ${open ? 'warn' : 'good'}"><div class="kpi-ic">📂</div><div class="kpi-label">مفتوحة / قيد المعالجة</div><div class="kpi-value">${open}</div></div>
        <div class="card kpi ${crit ? 'bad' : 'good'}"><div class="kpi-ic">🚨</div><div class="kpi-label">حرجة مفتوحة</div><div class="kpi-value">${crit}</div></div>
        <div class="card kpi good"><div class="kpi-ic">✅</div><div class="kpi-label">مغلقة</div><div class="kpi-value">${list.filter(n => n.status === 'مغلقة').length}</div></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>الوصف / المصدر</th><th>الخطورة</th><th>المسؤول</th><th>الاستحقاق</th><th>الحالة</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
  };

  Views.editNC = function (id) {
    const n = id ? S.get('ncs', id) : { title: '', severity: 'متوسطة', source: 'تدقيق داخلي', status: 'مفتوحة', date: S.todayISO(), owner: App.user.name, dueDate: S.shift(7), action: '', preventiveAction: '', rootCause: '' };
    const sel = (val, opts) => opts.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('');
    U.modal(id ? 'معالجة حالة عدم المطابقة' : 'حالة عدم مطابقة جديدة', `
      ${n.photo ? `<div style="text-align:center;margin-bottom:14px"><img src="${n.photo}" onclick="Views.zoomImg('${n.photo}')" style="max-height:200px;max-width:100%;border-radius:10px;cursor:pointer;border:1px solid var(--line)" alt="الدليل المصوّر"/><div class="muted" style="font-size:12px;margin-top:4px">📷 دليل مصوّر مرفق — اضغط للتكبير</div></div>` : ''}
      <div class="form-grid two">
        <div class="field field-full"><label>وصف المخالفة</label><input name="title" value="${esc(n.title)}" /></div>
        <div class="field"><label>الخطورة</label><select name="severity">${sel(n.severity, ['حرجة', 'عالية', 'متوسطة', 'منخفضة'])}</select></div>
        <div class="field"><label>المصدر</label><select name="source">${sel(n.source, ['تدقيق داخلي', 'تدقيق GMP', 'مراقبة الحرارة', 'تفتيش رسمي', 'تحليل بالذكاء الاصطناعي', 'شكوى عميل', 'أخرى'])}</select></div>
        <div class="field"><label>المسؤول عن المعالجة</label><input name="owner" value="${esc(n.owner)}" /></div>
        <div class="field"><label>تاريخ الاستحقاق</label><input name="dueDate" type="date" value="${esc(n.dueDate)}" /></div>
        <div class="field"><label>الحالة</label><select name="status">${sel(n.status, ['مفتوحة', 'قيد المعالجة', 'مغلقة'])}</select></div>
        <div class="field"><label>التاريخ</label><input name="date" type="date" value="${esc(n.date)}" /></div>
        <div class="field field-full"><label>السبب الجذري</label><textarea name="rootCause">${esc(n.rootCause)}</textarea></div>
        <div class="field field-full"><label>الإجراء التصحيحي (الفوري)</label><textarea name="action">${esc(n.action)}</textarea></div>
        <div class="field field-full"><label>الإجراء الوقائي (لمنع التكرار)</label><textarea name="preventiveAction">${esc(n.preventiveAction || '')}</textarea></div>
      </div>
      <div class="form-actions" style="margin-top:14px">
        <button class="btn-primary" id="save">حفظ</button>
        <button class="btn-secondary" id="ai-capa">🤖 اقترح الإجراءات بالذكاء الاصطناعي</button>
        <span id="ai-state" class="muted" style="align-self:center"></span>
      </div>`,
      { wide: true, onOpen: (root) => {
        U.$('#ai-capa').onclick = async () => {
          const title = root.querySelector('[name=title]').value.trim();
          if (!title) return U.toast('أدخل وصف المخالفة أولًا', 'err');
          const st = U.$('#ai-state'); st.textContent = '⏳ جارٍ التحليل...';
          try {
            const r = await window.AI.generateCapa(title);
            if (r.severity) root.querySelector('[name=severity]').value = ['حرجة','عالية','متوسطة','منخفضة'].includes(r.severity) ? r.severity : root.querySelector('[name=severity]').value;
            if (r.rootCause) root.querySelector('[name=rootCause]').value = r.rootCause;
            root.querySelector('[name=action]').value = r.corrective + (r.reference ? '\n[المرجع: ' + r.reference + ']' : '');
            root.querySelector('[name=preventiveAction]').value = r.preventive;
            st.textContent = r.source === 'ai' ? '✓ تم التوليد بالذكاء الاصطناعي' : '✓ اقتراح محلي (فعّل الذكاء الاصطناعي لنتائج أدق)';
          } catch (e) { st.textContent = '⚠ ' + e.message; }
        };
        U.$('#save').onclick = () => {
          const f = U.readForm(root);
          if (!f.title) return U.toast('أدخل وصف المخالفة', 'err');
          if (id) S.update('ncs', id, f); else S.add('ncs', f);
          U.closeModal(); U.toast('تم الحفظ', 'ok'); App.render();
        };
      } });
  };

  Views.delNC = function (id) {
    U.confirmDialog('حذف هذه الحالة؟', () => { S.remove('ncs', id); U.toast('تم الحذف', 'ok'); App.render(); }, 'حذف');
  };

  /* ===================== خطة HACCP — نقاط التحكم الحرجة ===================== */
  Views.haccp = function () {
    const list = S.col('haccp');
    const ccps = list.filter(h => h.isCCP), cps = list.filter(h => !h.isCCP);
    const typeBadge = (t) => U.badge(t, t === 'بيولوجي' ? 'red' : t === 'كيميائي' ? 'amber' : 'blue');
    const rows = list.map(h => `<tr>
      <td><strong>${esc(h.no)}</strong></td>
      <td><strong>${esc(h.step)}</strong><br><small class="muted">${esc(h.hazard)}</small></td>
      <td>${typeBadge(h.hazardType)}</td>
      <td style="max-width:260px"><small>${esc(h.criticalLimit)}</small></td>
      <td>${h.isCCP ? U.badge('CCP', 'red') : U.badge('CP', 'gray')}${h.linkedUnit ? `<br><small class="muted">🌡️ ${esc(h.linkedUnit)}</small>` : ''}</td>
      <td class="t-actions">
        <button class="btn-secondary btn-sm" onclick="Views.editHaccp('${h.id}')">تفاصيل</button>
        <button class="btn-danger btn-sm" onclick="Views.delHaccp('${h.id}')">حذف</button>
      </td>
    </tr>`).join('');
    return `
      <div class="page-head">
        <div><h2>خطة الهاسب (HACCP) ونقاط التحكم الحرجة</h2><p>تحليل المخاطر وتحديد نقاط التحكم الحرجة (CCP) وحدودها ومراقبتها وإجراءاتها التصحيحية والتحقق منها — وفق Codex و ISO 22000</p></div>
        <div class="spacer"></div>
        <button class="btn-secondary" onclick="Views.haccpTree()">🌳 شجرة القرار</button>
        <button class="btn-primary" onclick="Views.editHaccp()">+ نقطة تحكم</button>
      </div>
      <div class="grid cols-3" style="margin-bottom:18px">
        <div class="card kpi ${ccps.length ? 'good' : 'warn'}"><div class="kpi-ic">🛡️</div><div class="kpi-label">نقاط التحكم الحرجة (CCP)</div><div class="kpi-value">${ccps.length}</div></div>
        <div class="card kpi"><div class="kpi-ic">📍</div><div class="kpi-label">نقاط تحكم (CP)</div><div class="kpi-value">${cps.length}</div></div>
        <div class="card kpi"><div class="kpi-ic">🔗</div><div class="kpi-label">مرتبطة بمراقبة الحرارة</div><div class="kpi-value">${list.filter(h => h.linkedUnit).length}</div></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>الرقم</th><th>الخطوة / الخطر</th><th>نوع الخطر</th><th>الحد الحرج</th><th>التصنيف</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>
      <p class="muted" style="font-size:12px;margin-top:12px">CCP: نقطة تحكم حرجة يجب ضبطها لمنع خطر على السلامة. CP: نقطة تحكم عامة. استخدم «شجرة القرار» لتحديد ما إذا كانت الخطوة CCP.</p>`;
  };

  Views.editHaccp = function (id) {
    const h = id ? S.get('haccp', id) : { no: '', step: '', hazard: '', hazardType: 'بيولوجي', isCCP: true, criticalLimit: '', monitorWhat: '', monitorHow: '', monitorFreq: '', monitorWho: '', corrective: '', verification: '', records: '', linkedUnit: '' };
    const sel = (val, opts) => opts.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('');
    const units = ['', ...new Set(S.col('tempLogs').map(t => t.unit))];
    U.modal(id ? 'تفاصيل نقطة التحكم' : 'نقطة تحكم جديدة', `
      <div class="form-grid two">
        <div class="field"><label>الرقم</label><input name="no" value="${esc(h.no)}" placeholder="CCP-1" /></div>
        <div class="field"><label>خطوة العملية</label><input name="step" value="${esc(h.step)}" placeholder="الطهي" /></div>
        <div class="field"><label>نوع الخطر</label><select name="hazardType">${sel(h.hazardType, ['بيولوجي', 'كيميائي', 'فيزيائي'])}</select></div>
        <div class="field"><label>التصنيف</label><select name="isCCP">${sel(h.isCCP ? 'CCP (نقطة حرجة)' : 'CP (نقطة تحكم)', ['CCP (نقطة حرجة)', 'CP (نقطة تحكم)'])}</select></div>
        <div class="field field-full"><label>وصف الخطر</label><input name="hazard" value="${esc(h.hazard)}" /></div>
        <div class="field field-full"><label>الحد الحرج (Critical Limit)</label><textarea name="criticalLimit">${esc(h.criticalLimit)}</textarea></div>
        <div class="field"><label>المراقبة: ماذا؟</label><input name="monitorWhat" value="${esc(h.monitorWhat)}" /></div>
        <div class="field"><label>المراقبة: كيف؟</label><input name="monitorHow" value="${esc(h.monitorHow)}" /></div>
        <div class="field"><label>المراقبة: التكرار</label><input name="monitorFreq" value="${esc(h.monitorFreq)}" /></div>
        <div class="field"><label>المراقبة: المسؤول</label><input name="monitorWho" value="${esc(h.monitorWho)}" /></div>
        <div class="field field-full"><label>الإجراء التصحيحي عند الانحراف</label><textarea name="corrective">${esc(h.corrective)}</textarea></div>
        <div class="field field-full"><label>التحقق (Verification)</label><textarea name="verification">${esc(h.verification)}</textarea></div>
        <div class="field"><label>السجلات</label><input name="records" value="${esc(h.records)}" /></div>
        <div class="field"><label>ربط بوحدة حرارة</label><select name="linkedUnit">${sel(h.linkedUnit, units)}</select></div>
      </div>
      <div class="form-actions" style="margin-top:14px"><button class="btn-primary" id="save">حفظ</button></div>`,
      { wide: true, onOpen: (root) => {
        U.$('#save').onclick = () => {
          const f = U.readForm(root);
          if (!f.step) return U.toast('أدخل خطوة العملية', 'err');
          f.isCCP = f.isCCP.indexOf('CCP') === 0;
          if (id) S.update('haccp', id, f); else S.add('haccp', f);
          U.closeModal(); U.toast('تم الحفظ', 'ok'); App.render();
        };
      } });
  };

  Views.delHaccp = function (id) {
    U.confirmDialog('حذف نقطة التحكم هذه؟', () => { S.remove('haccp', id); U.toast('تم الحذف', 'ok'); App.render(); }, 'حذف');
  };

  // شجرة قرار Codex لتحديد ما إذا كانت الخطوة نقطة تحكم حرجة (CCP)
  Views._dtState = { step: 'q1', hazard: '', stepName: '' };
  Views.haccpTree = function () {
    Views._dtState = { step: 'intro', hazard: '', stepName: '' };
    U.modal('شجرة قرار تحديد نقطة التحكم الحرجة (CCP)', '<div id="dt-body"></div>', { wide: true, onOpen: () => Views._dtRender() });
  };
  Views._dtRender = function () {
    const b = U.$('#dt-body'); if (!b) return;
    const st = Views._dtState;
    const Q = (q, hint) => `<div class="card" style="background:#f8fafc"><strong style="font-size:15px">${q}</strong>${hint ? `<p class="muted" style="font-size:12px;margin-top:6px">${hint}</p>` : ''}</div>`;
    const btns = (yes, no) => `<div class="form-actions" style="margin-top:14px"><button class="btn-primary" onclick="Views._dtAns('${yes}')">نعم</button><button class="btn-secondary" onclick="Views._dtAns('${no}')">لا</button></div>`;
    const result = (isCCP, msg) => `
      <div class="card" style="border:2px solid ${isCCP ? '#dc2626' : '#16a34a'};text-align:center">
        <div style="font-size:34px">${isCCP ? '🛡️' : '✅'}</div>
        <h3 style="color:${isCCP ? '#dc2626' : '#16a34a'};margin:6px 0">${isCCP ? 'هذه الخطوة نقطة تحكم حرجة (CCP)' : 'هذه الخطوة ليست نقطة تحكم حرجة'}</h3>
        <p class="muted" style="font-size:13.5px">${msg}</p>
      </div>
      <div class="form-actions" style="margin-top:14px">
        ${isCCP ? `<button class="btn-primary" onclick="Views._dtCreate()">+ إنشاء نقطة تحكم في الخطة</button>` : ''}
        <button class="btn-secondary" onclick="Views.haccpTree()">إعادة من البداية</button>
      </div>`;
    let html = '';
    if (st.step === 'intro') {
      html = `<p class="muted" style="margin-bottom:12px">أجب عن الأسئلة لتحديد ما إذا كانت خطوة العملية نقطة تحكم حرجة وفق شجرة قرار Codex.</p>
        <div class="form-grid two">
          <div class="field"><label>خطوة العملية</label><input id="dt-step" value="${esc(st.stepName)}" placeholder="مثال: الطهي" /></div>
          <div class="field"><label>الخطر المحتمل</label><input id="dt-haz" value="${esc(st.hazard)}" placeholder="مثال: بقاء البكتيريا الممرضة" /></div>
        </div>
        <div class="form-actions" style="margin-top:12px"><button class="btn-primary" onclick="Views._dtStart()">ابدأ التحليل ←</button></div>`;
    } else if (st.step === 'q1') {
      html = Q('س1: هل توجد إجراءات/تدابير وقائية للتحكم في هذا الخطر عند هذه الخطوة؟', 'مثل ضبط الحرارة، التطهير، الفصل، التحكم في الزمن.') + btns('q1yes', 'q1no');
    } else if (st.step === 'q1no') {
      html = Q('هل التحكم في هذا الخطر عند هذه الخطوة ضروري للسلامة؟') + btns('modify', 'notccp_q1');
    } else if (st.step === 'modify') {
      html = result(false, 'يلزم تعديل الخطوة أو العملية أو المنتج لإدخال تدبير وقائي للتحكم في الخطر. الخطوة بوضعها الحالي ليست CCP لكنها تحتاج معالجة تصميمية.');
    } else if (st.step === 'notccp_q1') {
      html = result(false, 'لا حاجة للتحكم عند هذه الخطوة لأغراض السلامة — ليست نقطة تحكم حرجة.');
    } else if (st.step === 'q2') {
      html = Q('س2: هل صُمّمت هذه الخطوة تحديدًا لإزالة الخطر أو خفضه إلى مستوى مقبول؟', 'مثل خطوة الطهي المصمّمة للقضاء على الميكروبات.') + btns('isccp_q2', 'q3');
    } else if (st.step === 'isccp_q2') {
      html = result(true, 'الخطوة مصمّمة للتحكم في الخطر — إنها نقطة تحكم حرجة (CCP).');
    } else if (st.step === 'q3') {
      html = Q('س3: هل يمكن أن يحدث التلوث أو يزداد الخطر إلى مستوى غير مقبول عند هذه الخطوة؟') + btns('q4', 'notccp_q3');
    } else if (st.step === 'notccp_q3') {
      html = result(false, 'لا يمكن أن يصل الخطر إلى مستوى غير مقبول هنا — ليست نقطة تحكم حرجة.');
    } else if (st.step === 'q4') {
      html = Q('س4: هل ستزيل خطوة لاحقة هذا الخطر أو تخفضه إلى مستوى مقبول؟') + btns('notccp_q4', 'isccp_q4');
    } else if (st.step === 'notccp_q4') {
      html = result(false, 'توجد خطوة لاحقة تتحكم في الخطر — هذه الخطوة ليست CCP (لكن الخطوة اللاحقة قد تكون CCP).');
    } else if (st.step === 'isccp_q4') {
      html = result(true, 'لا توجد خطوة لاحقة للتحكم في الخطر — هذه الخطوة نقطة تحكم حرجة (CCP).');
    }
    b.innerHTML = html;
  };
  Views._dtStart = function () {
    Views._dtState.stepName = (U.$('#dt-step').value || '').trim();
    Views._dtState.hazard = (U.$('#dt-haz').value || '').trim();
    if (!Views._dtState.stepName) return U.toast('أدخل خطوة العملية', 'err');
    Views._dtState.step = 'q1'; Views._dtRender();
  };
  Views._dtAns = function (next) {
    const map = { q1yes: 'q2', q1no: 'q1no' };
    Views._dtState.step = map[next] || next; Views._dtRender();
  };
  Views._dtCreate = function () {
    const st = Views._dtState;
    U.closeModal();
    const last = S.col('haccp').filter(h => h.isCCP).length + 1;
    Views.editHaccp();
    setTimeout(() => {
      const body = U.$('#modal-body'); if (!body) return;
      const set = (n, v) => { const el = body.querySelector(`[name=${n}]`); if (el) el.value = v; };
      set('no', 'CCP-' + last); set('step', st.stepName); set('hazard', st.hazard);
      const cls = body.querySelector('[name=isCCP]'); if (cls) cls.value = 'CCP (نقطة حرجة)';
    }, 30);
  };

  /* ===================== تتبّع الدفعات والاستدعاء ===================== */
  Views._batchStatusBadge = function (s) {
    const map = { 'في المخزون': 'green', 'قيد الاستخدام': 'blue', 'مستهلك': 'gray', 'مسحوب': 'red' };
    return U.badge(s, map[s] || 'gray');
  };
  Views.traceability = function () {
    const list = [...S.col('batches')].sort((a, b) => (b.receivedDate || '').localeCompare(a.receivedDate || ''));
    const m = S.metrics();
    const rows = list.map(b => {
      const expSoon = S.daysFromToday(b.expiry) < 0 && b.status !== 'مسحوب' && b.status !== 'مستهلك';
      return `<tr ${expSoon ? 'style="background:#fef2f2"' : ''}>
      <td><strong>${esc(b.lotNo)}</strong></td>
      <td><strong>${esc(b.product)}</strong><br><small class="muted">${esc(b.category)} — ${esc(b.supplier)}</small></td>
      <td>${b.qty} ${esc(b.unit)}</td>
      <td>${fmtDate(b.receivedDate)}</td>
      <td>${fmtDate(b.expiry)} ${U.expiryBadge(b.expiry)}</td>
      <td>${Views._batchStatusBadge(b.status)}</td>
      <td class="t-actions">
        <button class="btn-secondary btn-sm" onclick="Views.recallReport('${b.id}')">📄 تقرير</button>
        ${b.status !== 'مسحوب' ? `<button class="btn-danger btn-sm" onclick="Views.recallBatch('${b.id}')">استدعاء</button>` : ''}
        <button class="btn-secondary btn-sm" onclick="Views.editBatch('${b.id}')">تعديل</button>
        <button class="btn-danger btn-sm" onclick="Views.delBatch('${b.id}')">حذف</button>
      </td>
    </tr>`;}).join('');
    return `
      <div class="page-head">
        <div><h2>تتبّع الدفعات وسحب المنتج (Traceability &amp; Recall)</h2><p>ترقيم وتتبّع دفعات المواد من الاستلام حتى التقديم، وتوليد تقرير سحب/استدعاء فوري — وفق ISO 22000 و Codex</p></div>
        <div class="spacer"></div>
        <button class="btn-primary" onclick="Views.editBatch()">+ دفعة جديدة</button>
      </div>
      <div class="grid cols-3" style="margin-bottom:18px">
        <div class="card kpi good"><div class="kpi-ic">📦</div><div class="kpi-label">دفعات نشطة</div><div class="kpi-value">${m.activeBatches}</div></div>
        <div class="card kpi ${m.expiredBatches ? 'bad' : 'good'}"><div class="kpi-ic">⏰</div><div class="kpi-label">منتهية الصلاحية</div><div class="kpi-value">${m.expiredBatches}</div></div>
        <div class="card kpi ${m.recalledBatches ? 'warn' : 'good'}"><div class="kpi-ic">🚨</div><div class="kpi-label">مسحوبة / مستدعاة</div><div class="kpi-value">${m.recalledBatches}</div></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>رقم الدفعة</th><th>المنتج / المورد</th><th>الكمية</th><th>الاستلام</th><th>الصلاحية</th><th>الحالة</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>
      <p class="muted" style="font-size:12px;margin-top:12px">عند رصد مشكلة سلامة، اضغط «استدعاء» لتسجيل الدفعة كمسحوبة وفتح حالة عدم مطابقة تلقائيًا، ثم «تقرير» لتوليد مستند السحب/الاستدعاء وطباعته.</p>`;
  };

  Views.editBatch = function (id) {
    const b = id ? S.get('batches', id) : { lotNo: 'LOT-' + S.todayISO().slice(2).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 4).toUpperCase(), product: '', category: 'لحوم ودواجن', supplier: '', receivedDate: S.todayISO(), qty: 0, unit: 'كجم', expiry: S.shift(7), storage: '', status: 'في المخزون', notes: '' };
    const sel = (val, opts) => opts.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('');
    const sups = [...new Set(S.col('suppliers').map(s => s.name))];
    U.modal(id ? 'تعديل دفعة' : 'دفعة جديدة', `
      <div class="form-grid two">
        <div class="field"><label>رقم الدفعة (Lot)</label><input name="lotNo" value="${esc(b.lotNo)}" /></div>
        <div class="field"><label>المنتج</label><input name="product" value="${esc(b.product)}" /></div>
        <div class="field"><label>الفئة</label><select name="category">${sel(b.category, ['لحوم ودواجن', 'خضار وفواكه', 'ألبان', 'مواد جافة', 'مأكولات بحرية', 'مواد تغليف', 'أخرى'])}</select></div>
        <div class="field"><label>المورد</label><input name="supplier" value="${esc(b.supplier)}" list="sup-list" /><datalist id="sup-list">${sups.map(s => `<option value="${esc(s)}">`).join('')}</datalist></div>
        <div class="field"><label>الكمية</label><input name="qty" type="number" min="0" step="any" value="${b.qty}" /></div>
        <div class="field"><label>الوحدة</label><select name="unit">${sel(b.unit, ['كجم', 'جم', 'لتر', 'مل', 'علبة', 'كرتون', 'حبة'])}</select></div>
        <div class="field"><label>تاريخ الاستلام</label><input name="receivedDate" type="date" value="${esc(b.receivedDate)}" /></div>
        <div class="field"><label>تاريخ الانتهاء</label><input name="expiry" type="date" value="${esc(b.expiry)}" /></div>
        <div class="field"><label>موقع التخزين</label><input name="storage" value="${esc(b.storage)}" /></div>
        <div class="field"><label>الحالة</label><select name="status">${sel(b.status, ['في المخزون', 'قيد الاستخدام', 'مستهلك', 'مسحوب'])}</select></div>
        <div class="field field-full"><label>ملاحظات</label><textarea name="notes">${esc(b.notes)}</textarea></div>
      </div>
      <div class="form-actions" style="margin-top:14px"><button class="btn-primary" id="save">حفظ</button></div>`,
      { wide: true, onOpen: (root) => {
        U.$('#save').onclick = () => {
          const f = U.readForm(root);
          if (!f.product) return U.toast('أدخل اسم المنتج', 'err');
          f.qty = parseFloat(f.qty) || 0;
          if (id) S.update('batches', id, f); else S.add('batches', f);
          U.closeModal(); U.toast('تم الحفظ', 'ok'); App.render();
        };
      } });
  };

  Views.delBatch = function (id) {
    U.confirmDialog('حذف هذه الدفعة؟', () => { S.remove('batches', id); U.toast('تم الحذف', 'ok'); App.render(); }, 'حذف');
  };

  Views.recallBatch = function (id) {
    const b = S.get('batches', id); if (!b) return;
    U.confirmDialog(`تسجيل الدفعة «${b.lotNo}» كمسحوبة وفتح حالة عدم مطابقة؟`, () => {
      S.update('batches', id, { status: 'مسحوب', recallDate: S.todayISO() });
      S.add('ncs', {
        id: S.uid('nc'), title: `سحب/استدعاء الدفعة ${b.lotNo} — ${b.product}`,
        severity: 'حرجة', source: 'تتبّع الدفعات', status: 'مفتوحة', date: S.todayISO(),
        owner: (App.user && App.user.name) || 'مدير الجودة', dueDate: S.shift(1),
        action: `عزل وحجز كامل كمية الدفعة (${b.qty} ${b.unit}) من المورد «${b.supplier}»، وإيقاف استخدامها وإبلاغ الجهات المعنية عند اللزوم`,
        preventiveAction: 'مراجعة اعتماد المورد وتشديد فحص الاستلام وتتبّع الدفعات الأخرى من نفس المورد',
        rootCause: '',
      });
      U.toast('تم تسجيل السحب وفتح حالة عدم مطابقة', 'ok'); App.render();
      Views.recallReport(id);
    }, 'تأكيد السحب');
  };

  Views.recallReport = function (id) {
    const b = S.get('batches', id); if (!b) return;
    const db = S.load();
    const fac = (db.meta && db.meta.facilityName) || 'المنشأة الغذائية';
    const reason = b.status === 'مسحوب' ? 'سحب/استدعاء لمشكلة سلامة غذاء' : (S.daysFromToday(b.expiry) < 0 ? 'انتهاء صلاحية' : 'تقرير تتبّع');
    const row = (k, v) => `<tr><td style="font-weight:600;width:42%;background:#f8fafc">${k}</td><td>${esc(v)}</td></tr>`;
    U.modal('تقرير تتبّع/سحب الدفعة', `
      <div id="recall-doc">
        <div style="text-align:center;border-bottom:2px solid #0f766e;padding-bottom:10px;margin-bottom:14px">
          <h2 style="margin:0;color:#0f766e">تقرير سحب واستدعاء منتج</h2>
          <p class="muted" style="margin:4px 0 0">${esc(fac)} — تاريخ التقرير: ${fmtDate(S.todayISO())}</p>
        </div>
        <table style="width:100%;border-collapse:collapse" class="report-table">
          ${row('رقم الدفعة (Lot No.)', b.lotNo)}
          ${row('المنتج', b.product)}
          ${row('الفئة', b.category)}
          ${row('المورد (المصدر)', b.supplier)}
          ${row('الكمية', b.qty + ' ' + b.unit)}
          ${row('تاريخ الاستلام', fmtDate(b.receivedDate))}
          ${row('تاريخ الانتهاء', fmtDate(b.expiry))}
          ${row('موقع التخزين', b.storage || '—')}
          ${row('الحالة الحالية', b.status)}
          ${row('سبب التقرير/السحب', reason)}
          ${b.notes ? row('ملاحظات', b.notes) : ''}
        </table>
        <div class="card" style="background:#fef2f2;border:1px solid #fecaca;margin-top:14px">
          <strong>الإجراء المطلوب:</strong>
          <ol style="margin:8px 18px 0;font-size:13.5px;line-height:1.9">
            <li>عزل وحجز كامل كمية الدفعة فورًا ومنع استخدامها أو تقديمها.</li>
            <li>تتبّع المنتجات النهائية التي استُخدمت فيها الدفعة وسحبها إن لزم.</li>
            <li>التواصل مع المورد «${esc(b.supplier)}» وتوثيق المرتجع.</li>
            <li>إبلاغ الجهة الرقابية (هيئة الغذاء والدواء/البلدية) عند وجود خطر على الصحة العامة.</li>
            <li>التخلّص الآمن من الكمية غير المطابقة وتوثيق ذلك.</li>
          </ol>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:24px;font-size:13px">
          <div>اسم المسؤول: ........................</div>
          <div>التوقيع: ........................</div>
          <div>التاريخ: ${fmtDate(S.todayISO())}</div>
        </div>
      </div>
      <div class="form-actions" style="margin-top:16px"><button class="btn-primary" onclick="window.print()">🖨️ طباعة التقرير</button></div>`,
      { wide: true });
  };

  /* ===================== الموردون ===================== */
  Views.suppliers = function () {
    const db = S.load();
    const rows = db.suppliers.map(s => `<tr>
      <td><strong>${esc(s.name)}</strong></td>
      <td>${esc(s.category)}</td>
      <td>${'★'.repeat(s.rating)}<span class="muted">${'★'.repeat(5 - s.rating)}</span></td>
      <td>${fmtDate(s.licenseExpiry)} ${U.expiryBadge(s.licenseExpiry)}</td>
      <td>${fmtDate(s.lastAudit)}</td>
      <td>${U.statusBadge(s.status)}</td>
      <td class="t-actions">
        <button class="btn-secondary btn-sm" onclick="Views.editSupplier('${s.id}')">تعديل</button>
        <button class="btn-danger btn-sm" onclick="Views.delSupplier('${s.id}')">حذف</button>
      </td>
    </tr>`).join('');
    return `
      <div class="page-head">
        <div><h2>اعتماد الموردين</h2><p>تقييم واعتماد موردي المواد الغذائية ومتابعة صلاحية تراخيصهم</p></div>
        <div class="spacer"></div>
        <button class="btn-primary" onclick="Views.editSupplier()">+ إضافة مورد</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>المورد</th><th>الفئة</th><th>التقييم</th><th>انتهاء الترخيص</th><th>آخر تدقيق</th><th>الحالة</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
  };

  Views.editSupplier = function (id) {
    const s = id ? S.get('suppliers', id) : { name: '', category: 'خضار وفواكه', status: 'تحت المراجعة', rating: 3, licenseExpiry: S.shift(365), lastAudit: S.todayISO(), contact: '' };
    const sel = (val, opts) => opts.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('');
    U.modal(id ? 'تعديل مورد' : 'إضافة مورد', `
      <div class="form-grid two">
        <div class="field"><label>اسم المورد</label><input name="name" value="${esc(s.name)}" /></div>
        <div class="field"><label>الفئة</label><select name="category">${sel(s.category, ['لحوم ودواجن', 'خضار وفواكه', 'ألبان', 'مواد جافة', 'مأكولات بحرية', 'مواد تغليف', 'أخرى'])}</select></div>
        <div class="field"><label>الحالة</label><select name="status">${sel(s.status, ['معتمد', 'تحت المراجعة', 'موقوف'])}</select></div>
        <div class="field"><label>التقييم (1-5)</label><select name="rating">${sel(String(s.rating), ['1', '2', '3', '4', '5'])}</select></div>
        <div class="field"><label>انتهاء الترخيص</label><input name="licenseExpiry" type="date" value="${esc(s.licenseExpiry)}" /></div>
        <div class="field"><label>آخر تدقيق</label><input name="lastAudit" type="date" value="${esc(s.lastAudit)}" /></div>
        <div class="field field-full"><label>جهة الاتصال</label><input name="contact" value="${esc(s.contact)}" /></div>
      </div>
      <div class="form-actions" style="margin-top:14px"><button class="btn-primary" id="save">حفظ</button></div>`,
      { onOpen: (root) => {
        U.$('#save').onclick = () => {
          const f = U.readForm(root); if (!f.name) return U.toast('أدخل اسم المورد', 'err');
          f.rating = parseInt(f.rating);
          if (id) S.update('suppliers', id, f); else S.add('suppliers', f);
          U.closeModal(); U.toast('تم الحفظ', 'ok'); App.render();
        };
      } });
  };

  Views.delSupplier = function (id) {
    U.confirmDialog('حذف هذا المورد؟', () => { S.remove('suppliers', id); U.toast('تم الحذف', 'ok'); App.render(); }, 'حذف');
  };

  /* ===================== التنظيف ومكافحة الآفات ===================== */
  Views.cleaning = function () {
    const db = S.load();
    const rows = [...db.cleaning].sort((a, b) => S.daysFromToday(a.nextDue) - S.daysFromToday(b.nextDue)).map(c => {
      const overdue = S.daysFromToday(c.nextDue) < 0;
      return `<tr>
        <td><strong>${esc(c.task)}</strong><br><small class="muted">${esc(c.area)}</small></td>
        <td>${U.badge(c.frequency, 'blue')}</td>
        <td>${esc(c.responsible)}</td>
        <td>${fmtDate(c.lastDone)}</td>
        <td>${fmtDate(c.nextDue)} ${overdue ? U.badge('متأخرة', 'red') : U.badge('في الموعد', 'green')}</td>
        <td class="t-actions">
          <button class="btn-secondary btn-sm" onclick="Views.markCleaned('${c.id}')">✓ تم التنفيذ</button>
          <button class="btn-danger btn-sm" onclick="Views.delCleaning('${c.id}')">حذف</button>
        </td>
      </tr>`;
    }).join('');

    const pestRows = [...db.pest].sort((a, b) => b.date.localeCompare(a.date)).map(p => `<tr>
      <td>${fmtDate(p.date)}</td>
      <td><strong>${esc(p.company)}</strong></td>
      <td>${esc(p.type)}</td>
      <td>${esc(p.findings)}</td>
      <td>${fmtDate(p.nextVisit)} ${S.daysFromToday(p.nextVisit) < 0 ? U.badge('مستحقة', 'red') : ''}</td>
      <td class="t-actions"><button class="btn-danger btn-sm" onclick="Views.delPest('${p.id}')">حذف</button></td>
    </tr>`).join('');

    return `
      <div class="page-head">
        <div><h2>التنظيف والتعقيم ومكافحة الآفات</h2><p>جدولة مهام النظافة وتوثيق زيارات مكافحة الآفات</p></div>
        <div class="spacer"></div>
        <button class="btn-secondary" onclick="Views.newPest()">+ زيارة مكافحة</button>
        <button class="btn-primary" onclick="Views.editCleaning()">+ مهمة تنظيف</button>
      </div>
      <div class="card" style="margin-bottom:20px">
        <div class="card-title">🧹 جدول التنظيف والتعقيم</div>
        <div class="table-wrap" style="border:none">
          <table><thead><tr><th>المهمة / المنطقة</th><th>التكرار</th><th>المسؤول</th><th>آخر تنفيذ</th><th>الاستحقاق القادم</th><th></th></tr></thead>
          <tbody>${rows}</tbody></table>
        </div>
      </div>
      <div class="card">
        <div class="card-title">🐀 سجل مكافحة الآفات</div>
        <div class="table-wrap" style="border:none">
          <table><thead><tr><th>التاريخ</th><th>الشركة</th><th>النوع</th><th>الملاحظات</th><th>الزيارة القادمة</th><th></th></tr></thead>
          <tbody>${pestRows || '<tr><td colspan="6">' + U.empty('لا توجد زيارات مسجلة', '🐀') + '</td></tr>'}</tbody></table>
        </div>
      </div>`;
  };

  Views.markCleaned = function (id) {
    const c = S.get('cleaning', id); if (!c) return;
    const freqDays = { 'يومي': 1, 'أسبوعي': 7, 'شهري': 30 }[c.frequency] || 7;
    S.update('cleaning', id, { lastDone: S.todayISO(), nextDue: S.shift(freqDays) });
    U.toast('تم تسجيل تنفيذ المهمة', 'ok'); App.render();
  };

  Views.editCleaning = function (id) {
    const c = id ? S.get('cleaning', id) : { area: '', task: '', frequency: 'يومي', responsible: '', lastDone: S.todayISO(), nextDue: S.todayISO() };
    const sel = (val, opts) => opts.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('');
    U.modal('مهمة تنظيف', `
      <div class="form-grid two">
        <div class="field"><label>المنطقة</label><input name="area" value="${esc(c.area)}" /></div>
        <div class="field"><label>التكرار</label><select name="frequency">${sel(c.frequency, ['يومي', 'أسبوعي', 'شهري'])}</select></div>
        <div class="field field-full"><label>المهمة</label><input name="task" value="${esc(c.task)}" /></div>
        <div class="field field-full"><label>المسؤول</label><input name="responsible" value="${esc(c.responsible)}" /></div>
      </div>
      <div class="form-actions" style="margin-top:14px"><button class="btn-primary" id="save">حفظ</button></div>`,
      { onOpen: (root) => {
        U.$('#save').onclick = () => {
          const f = U.readForm(root); if (!f.task) return U.toast('أدخل المهمة', 'err');
          const freqDays = { 'يومي': 1, 'أسبوعي': 7, 'شهري': 30 }[f.frequency] || 7;
          f.lastDone = c.lastDone; f.nextDue = S.shift(freqDays);
          if (id) S.update('cleaning', id, f); else S.add('cleaning', f);
          U.closeModal(); U.toast('تم الحفظ', 'ok'); App.render();
        };
      } });
  };

  Views.delCleaning = function (id) { S.remove('cleaning', id); U.toast('تم الحذف', 'ok'); App.render(); };

  Views.newPest = function () {
    U.modal('زيارة مكافحة آفات', `
      <div class="form-grid two">
        <div class="field"><label>الشركة</label><input name="company" /></div>
        <div class="field"><label>النوع</label><select name="type"><option>زيارة دورية</option><option>زيارة طارئة</option><option>معالجة</option></select></div>
        <div class="field"><label>تاريخ الزيارة</label><input name="date" type="date" value="${S.todayISO()}" /></div>
        <div class="field"><label>الزيارة القادمة</label><input name="nextVisit" type="date" value="${S.shift(30)}" /></div>
        <div class="field field-full"><label>الملاحظات / النتائج</label><textarea name="findings"></textarea></div>
      </div>
      <div class="form-actions" style="margin-top:14px"><button class="btn-primary" id="save">حفظ</button></div>`,
      { onOpen: (root) => {
        U.$('#save').onclick = () => {
          const f = U.readForm(root); if (!f.company) return U.toast('أدخل اسم الشركة', 'err');
          f.status = 'مكتملة'; S.add('pest', f);
          U.closeModal(); U.toast('تم الحفظ', 'ok'); App.render();
        };
      } });
  };

  Views.delPest = function (id) { S.remove('pest', id); U.toast('تم الحذف', 'ok'); App.render(); };

  /* ===================== الرصد بالتصوير (ذكاء اصطناعي) ===================== */
  Views._monImg = null;
  Views._monThumb = null;
  Views._monViolations = [];

  // تصغير الصورة لتخزينها كدليل مصوّر دون إثقال التخزين المحلي
  Views._downscale = function (dataUrl, maxDim, quality) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        w = Math.round(w * scale); h = Math.round(h * scale);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        try { resolve(c.toDataURL('image/jpeg', quality)); } catch (e) { resolve(dataUrl); }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  Views.monitor = function () {
    const db = S.load();
    const history = (db.monitors || []).slice(0, 8);
    const aiOn = window.AI.enabled();
    return `
      <div class="page-head">
        <div><h2>الرصد بالتصوير الذكي</h2><p>صوّر موقع العمل ليقوم الذكاء الاصطناعي برصد المخالفات تلقائيًا واقتراح الإجراءات التصحيحية والوقائية</p></div>
      </div>
      ${aiOn ? '' : `<div class="card" style="margin-bottom:16px;background:#fffbeb;border-color:#fde68a">
        <strong>⚠ خدمة الذكاء الاصطناعي غير مفعّلة</strong>
        <p class="muted" style="margin-top:6px">الرصد الآلي للمخالفات من الصور يتطلب تفعيل الخدمة من <a href="#" onclick="App.go('settings');return false">الإعدادات</a>. يمكنك حاليًا التقاط صورة وإضافة ملاحظة نصية ليقترح النظام الإجراءات المناسبة من قاعدة المواصفات.</p></div>`}
      <div class="grid cols-2">
        <div class="card">
          <div class="card-title">📷 التقاط / رفع صورة</div>
          <div id="mon-preview" style="margin-bottom:12px;text-align:center;min-height:160px;display:grid;place-items:center;background:#f8fafc;border-radius:12px;border:1.5px dashed var(--line)">
            <span class="muted">لم يتم اختيار صورة بعد</span>
          </div>
          <input type="file" id="mon-file" accept="image/*" capture="environment" hidden />
          <input type="file" id="mon-file-gallery" accept="image/*" hidden />
          <div style="display:flex;gap:8px;margin-bottom:6px">
            <button type="button" class="btn-secondary file-pick" id="mon-pick" style="flex:1">📷 التقاط صورة</button>
            <button type="button" class="btn-secondary file-pick" id="mon-pick-gallery" style="flex:1">🖼 رفع من الملفات</button>
          </div>
          <div id="mon-fname" class="muted" style="font-size:12px;margin-bottom:12px;text-align:center"></div>
          <div class="field" style="margin-bottom:12px">
            <label>ملاحظة المفتش (اختياري)</label>
            <textarea id="mon-note" placeholder="مثال: بقايا طعام على سطح التحضير، أو باب الثلاجة مفتوح"></textarea>
          </div>
          <button class="btn-primary" id="mon-analyze" disabled>🔍 تحليل ورصد المخالفات</button>
          <span id="mon-state" class="muted" style="margin-inline-start:10px"></span>
        </div>
        <div class="card">
          <div class="card-title">📋 نتائج الرصد</div>
          <div id="mon-results">${U.empty('ستظهر المخالفات المرصودة هنا بعد التحليل', '🔎')}</div>
        </div>
      </div>
      ${history.length ? `<div class="card section-gap">
        <div class="card-title">🕘 سجل عمليات الرصد</div>
        <div class="table-wrap" style="border:none"><table>
          <thead><tr><th>الدليل</th><th>التاريخ</th><th>الملخص</th><th>المخالفات</th><th>المصدر</th></tr></thead>
          <tbody>${history.map(h => `<tr>
            <td>${h.thumb ? `<img src="${h.thumb}" onclick="Views.zoomImg('${h.thumb}')" style="width:54px;height:42px;object-fit:cover;border-radius:6px;cursor:pointer;border:1px solid var(--line)" alt="دليل"/>` : '<span class="muted">—</span>'}</td>
            <td>${fmtDate(h.date)} <small class="muted">${esc(h.time || '')}</small></td>
            <td>${esc(h.summary || '—')}</td>
            <td>${U.badge(h.count + ' مخالفة', h.count ? 'red' : 'green')}</td>
            <td>${h.source === 'ai' ? U.badge('ذكاء اصطناعي', 'blue') : U.badge('محلي', 'gray')}</td>
          </tr>`).join('')}</tbody></table></div>
      </div>` : ''}`;
  };

  Views.bind_monitor = function () {
    Views._monImg = null; Views._monThumb = null;
    const fileEl = U.$('#mon-file'), analyzeBtn = U.$('#mon-analyze'), pick = U.$('#mon-pick'), noteEl = U.$('#mon-note');
    if (!fileEl) return;
    // يُفعَّل الزر عند وجود صورة أو ملاحظة نصية
    const refreshBtn = () => { analyzeBtn.disabled = !(Views._monImg || (noteEl && noteEl.value.trim())); };
    if (noteEl) noteEl.addEventListener('input', refreshBtn);
    if (pick) pick.onclick = () => fileEl.click();
    const fileGallery = U.$('#mon-file-gallery'), pickGallery = U.$('#mon-pick-gallery');
    if (pickGallery) pickGallery.onclick = () => fileGallery.click();
    const handleMonFile = (file) => {
      if (!file) return;
      const fname = U.$('#mon-fname'); if (fname) fname.textContent = '📎 ' + file.name;
      const reader = new FileReader();
      reader.onload = async () => {
        const m = /^data:(.*?);base64,(.*)$/.exec(reader.result);
        if (!m) return U.toast('تعذّر قراءة الصورة', 'err');
        Views._monImg = { mediaType: m[1], data: m[2] };
        U.$('#mon-preview').innerHTML = `<img src="${reader.result}" style="max-width:100%;max-height:240px;border-radius:10px" alt="معاينة"/>`;
        Views._monThumb = await Views._downscale(reader.result, 480, 0.55);
        refreshBtn();
      };
      reader.readAsDataURL(file);
    };
    if (fileGallery) fileGallery.onchange = () => handleMonFile(fileGallery.files[0]);
    fileEl.onchange = () => {
      const file = fileEl.files[0]; if (!file) return;
      const fname = U.$('#mon-fname'); if (fname) fname.textContent = '📎 ' + file.name;
      const reader = new FileReader();
      reader.onload = async () => {
        const m = /^data:(.*?);base64,(.*)$/.exec(reader.result);
        if (!m) return U.toast('تعذّر قراءة الصورة', 'err');
        Views._monImg = { mediaType: m[1], data: m[2] };
        U.$('#mon-preview').innerHTML = `<img src="${reader.result}" style="max-width:100%;max-height:240px;border-radius:10px" alt="معاينة"/>`;
        Views._monThumb = await Views._downscale(reader.result, 480, 0.55);
        refreshBtn();
      };
      reader.readAsDataURL(file);
    };

    analyzeBtn.onclick = async () => {
      const note = U.$('#mon-note').value.trim();
      if (!Views._monImg && !note) return U.toast('اختر صورة أو أضف ملاحظة', 'err');
      const st = U.$('#mon-state'); st.textContent = '⏳ جارٍ التحليل...';
      analyzeBtn.disabled = true;
      try {
        const r = await window.AI.analyzePhoto(Views._monImg || { mediaType: 'image/jpeg', data: '' }, note);
        st.textContent = '';
        Views._monViolations = r.violations || [];
        const box = U.$('#mon-results');
        if (r.error) { box.innerHTML = `<div class="empty"><span class="ic">⚠</span>${esc(r.error)}</div>`; analyzeBtn.disabled = false; return; }
        if (r.needsKey) { box.innerHTML = U.empty(r.hint, '🔑'); analyzeBtn.disabled = false; return; }

        // حفظ السجل مع الدليل المصوّر (مع تقليم آخر 20)
        S.add('monitors', { id: S.uid('mon'), date: S.todayISO(), time: new Date().toTimeString().slice(0,5), summary: r.summary || '', count: (r.violations||[]).length, source: r.source, thumb: Views._monThumb || '' });
        const mc = S.col('monitors'); if (mc.length > 20) { mc.length = 20; S.save(); }

        let html = `<p class="muted" style="margin-bottom:12px">${esc(r.summary || '')} ${r.source === 'ai' ? U.badge('ذكاء اصطناعي', 'blue') : U.badge('محلي', 'gray')}</p>`;
        if (!Views._monViolations.length) {
          html += `<div class="empty" style="padding:20px"><span class="ic">✅</span>لم تُرصد مخالفات — المشهد مطابق</div>`;
        } else {
          html += Views._monViolations.map((v, i) => `
            <div class="card" style="margin-bottom:10px;border-color:#fecaca;background:#fef2f2">
              <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
                <strong style="flex:1">${esc(v.title)}</strong>${U.statusBadge(v.severity || 'متوسطة')}
              </div>
              <p style="font-size:13px;margin-bottom:4px"><strong>الإجراء التصحيحي:</strong> ${esc(v.corrective || '')}</p>
              <p style="font-size:13px;margin-bottom:4px"><strong>الإجراء الوقائي:</strong> ${esc(v.preventive || '')}</p>
              ${v.reference ? `<p class="muted" style="font-size:12px;margin-bottom:8px">المرجع: ${esc(v.reference)}</p>` : ''}
              <button class="btn-primary btn-sm" onclick="Views.ncFromMonitor(${i})">+ إنشاء حالة عدم مطابقة</button>
            </div>`).join('');
        }
        box.innerHTML = html;
        // تحديث عدّادات القائمة الجانبية
        App.buildNav();
        U.toast(Views._monViolations.length ? `تم رصد ${Views._monViolations.length} مخالفة` : 'لا توجد مخالفات', Views._monViolations.length ? 'err' : 'ok');
      } catch (e) {
        st.textContent = '';
        U.$('#mon-results').innerHTML = `<div class="empty"><span class="ic">⚠</span>${esc(e.message)}</div>`;
      }
      analyzeBtn.disabled = false;
    };
  };

  Views.ncFromMonitor = function (i) {
    const v = Views._monViolations[i]; if (!v) return;
    S.add('ncs', {
      id: S.uid('nc'), title: v.title, severity: ['حرجة','عالية','متوسطة','منخفضة'].includes(v.severity) ? v.severity : 'متوسطة',
      source: 'تحليل بالذكاء الاصطناعي', status: 'مفتوحة', date: S.todayISO(), owner: App.user.name, dueDate: S.shift(3),
      action: (v.corrective || '') + (v.reference ? '\n[المرجع: ' + v.reference + ']' : ''),
      preventiveAction: v.preventive || '', rootCause: '', photo: Views._monThumb || '',
    });
    U.toast('تم إنشاء حالة عدم مطابقة مرفقة بالدليل المصوّر', 'ok');
    App.buildNav();
  };

  Views.zoomImg = function (src) {
    U.modal('الدليل المصوّر', `<img src="${src}" style="max-width:100%;border-radius:10px" alt="دليل مصوّر"/>`, { wide: true });
  };

  /* ===================== فحص العامل بالتصوير (ذكاء اصطناعي) ===================== */
  Views._wcImg = null; Views._wcThumb = null; Views._wcResult = null; Views._wcEmp = '';

  Views.workercheck = function () {
    const db = S.load();
    const aiOn = window.AI.enabled();
    const history = (db.hygieneChecks || []).slice(0, 8);
    const emps = db.employees.map(e => `<option value="${esc(e.name)}">${esc(e.name)} — ${esc(e.role)}</option>`).join('');
    return `
      <div class="page-head">
        <div><h2>فحص نظافة العامل بالذكاء الاصطناعي</h2><p>صوّر العامل ليقيّم النظام التزامه باشتراطات النظافة الصحية لمتداولي الغذاء</p></div>
      </div>
      ${aiOn ? '' : `<div class="card" style="margin-bottom:16px;background:#fffbeb;border-color:#fde68a">
        <strong>⚠ خدمة الذكاء الاصطناعي غير مفعّلة</strong>
        <p class="muted" style="margin-top:6px">التفتيش البصري للعامل يتطلب تفعيل الخدمة من <a href="#" onclick="App.go('settings');return false">الإعدادات</a>.</p></div>`}
      <div class="grid cols-2">
        <div class="card">
          <div class="card-title">📷 صورة العامل</div>
          <div class="field" style="margin-bottom:10px">
            <label>العامل (اختياري)</label>
            <select id="wc-emp"><option value="">— غير محدد —</option>${emps}</select>
          </div>
          <div id="wc-preview" style="margin-bottom:12px;text-align:center;min-height:150px;display:grid;place-items:center;background:#f8fafc;border-radius:12px;border:1.5px dashed var(--line)">
            <span class="muted">لم يتم اختيار صورة بعد</span>
          </div>
          <input type="file" id="wc-file" accept="image/*" capture="environment" hidden />
          <button type="button" class="btn-secondary file-pick" id="wc-pick" style="margin-bottom:6px">📷 التقاط صورة العامل أو اختيار ملف</button>
          <div id="wc-fname" class="muted" style="font-size:12px;margin-bottom:10px;text-align:center"></div>
          <div class="field" style="margin-bottom:12px"><label>ملاحظة (اختياري)</label><textarea id="wc-note" placeholder="مثال: أثناء مناولة الطعام الجاهز"></textarea></div>
          <button class="btn-primary" id="wc-analyze" disabled>🔍 تفتيش العامل وتقييم الالتزام</button>
          <span id="wc-state" class="muted" style="margin-inline-start:10px"></span>
        </div>
        <div class="card">
          <div class="card-title">📋 نتيجة التفتيش</div>
          <div id="wc-results">${U.empty('ستظهر نتيجة تقييم الالتزام هنا بعد التحليل', '🧑‍🔬')}</div>
        </div>
      </div>
      ${history.length ? `<div class="card section-gap">
        <div class="card-title">🕘 سجل فحوصات العاملين</div>
        <div class="table-wrap" style="border:none"><table>
          <thead><tr><th>الصورة</th><th>العامل</th><th>التاريخ</th><th>النتيجة</th><th>الالتزام</th></tr></thead>
          <tbody>${history.map(h => `<tr>
            <td>${h.thumb ? `<img src="${h.thumb}" onclick="Views.zoomImg('${h.thumb}')" style="width:48px;height:48px;object-fit:cover;border-radius:6px;cursor:pointer;border:1px solid var(--line)" alt="دليل"/>` : '—'}</td>
            <td><strong>${esc(h.employee || '—')}</strong></td>
            <td>${fmtDate(h.date)} <small class="muted">${esc(h.time || '')}</small></td>
            <td>${U.statusBadge(h.result || '—')}</td>
            <td><strong>${h.score}%</strong></td>
          </tr>`).join('')}</tbody></table></div>
      </div>` : ''}`;
  };

  Views.bind_workercheck = function () {
    Views._wcImg = null; Views._wcThumb = null; Views._wcResult = null;
    const fileEl = U.$('#wc-file'), analyzeBtn = U.$('#wc-analyze'), pick = U.$('#wc-pick'), noteEl = U.$('#wc-note');
    if (!fileEl) return;
    const refresh = () => { analyzeBtn.disabled = !(Views._wcImg || (noteEl && noteEl.value.trim())); };
    if (noteEl) noteEl.addEventListener('input', refresh);
    if (pick) pick.onclick = () => fileEl.click();
    fileEl.onchange = () => {
      const file = fileEl.files[0]; if (!file) return;
      const fn = U.$('#wc-fname'); if (fn) fn.textContent = '📎 ' + file.name;
      const reader = new FileReader();
      reader.onload = async () => {
        const m = /^data:(.*?);base64,(.*)$/.exec(reader.result);
        if (!m) return U.toast('تعذّر قراءة الصورة', 'err');
        Views._wcImg = { mediaType: m[1], data: m[2] };
        U.$('#wc-preview').innerHTML = `<img src="${reader.result}" style="max-width:100%;max-height:230px;border-radius:10px" alt="معاينة"/>`;
        Views._wcThumb = await Views._downscale(reader.result, 480, 0.55);
        refresh();
      };
      reader.readAsDataURL(file);
    };

    analyzeBtn.onclick = async () => {
      const note = noteEl.value.trim(), emp = U.$('#wc-emp').value;
      Views._wcEmp = emp;
      if (!Views._wcImg && !note) return U.toast('اختر صورة أو أضف ملاحظة', 'err');
      const st = U.$('#wc-state'); st.textContent = '⏳ جارٍ التفتيش...'; analyzeBtn.disabled = true;
      try {
        const r = await window.AI.inspectWorker(Views._wcImg || { mediaType: 'image/jpeg', data: '' }, note, emp);
        st.textContent = ''; Views._wcResult = r;
        const box = U.$('#wc-results');
        if (r.error) { box.innerHTML = `<div class="empty"><span class="ic">⚠</span>${esc(r.error)}</div>`; analyzeBtn.disabled = false; return; }
        if (r.needsKey) { box.innerHTML = U.empty(r.hint, '🔑'); analyzeBtn.disabled = false; return; }

        const score = r.score != null ? r.score : 0;
        const col = score >= 85 ? 'green' : score >= 60 ? 'amber' : 'red';
        const items = (r.items || []).map(it => `
          <div class="row-line">
            <span class="dot ${it.status === 'مطابق' ? 'green' : it.status === 'مخالف' ? 'red' : 'amber'}"></span>
            <div style="flex:1">${esc(it.criterion)}${it.note ? `<br><small class="muted">${esc(it.note)}</small>` : ''}</div>
            ${U.badge(it.status || '—', it.status === 'مطابق' ? 'green' : it.status === 'مخالف' ? 'red' : 'gray')}
          </div>`).join('');
        const viols = (r.items || []).filter(i => i.status === 'مخالف');
        box.innerHTML = `
          <div class="donut-wrap" style="margin-bottom:12px">${U.donut(score, 'الالتزام')}
            <div style="flex:1"><div style="margin-bottom:6px">${U.statusBadge(r.result || (score >= 85 ? 'مطابق' : 'مخالف'))} ${r.source === 'ai' ? U.badge('ذكاء اصطناعي', 'blue') : U.badge('محلي', 'gray')}</div>
            <p class="muted" style="font-size:13px">${esc(r.summary || '')}</p></div>
          </div>
          ${items}
          ${viols.length ? `<div class="card" style="margin-top:12px;background:#fef2f2;border-color:#fecaca">
            <p style="font-size:13px;margin-bottom:4px"><strong>الإجراء التصحيحي:</strong> ${esc(r.corrective || '')}</p>
            <p style="font-size:13px"><strong>الإجراء الوقائي:</strong> ${esc(r.preventive || '')}</p>
            ${r.reference ? `<p class="muted" style="font-size:12px;margin-top:4px">المرجع: ${esc(r.reference)}</p>` : ''}
          </div>` : ''}
          <div class="form-actions" style="margin-top:14px">
            <button class="btn-primary btn-sm" id="wc-save">حفظ نتيجة الفحص</button>
            ${viols.length ? `<button class="btn-secondary btn-sm" id="wc-nc">+ إنشاء حالة عدم مطابقة</button>` : ''}
          </div>`;
        U.$('#wc-save').onclick = () => Views.saveWorkerCheck();
        const ncBtn = U.$('#wc-nc'); if (ncBtn) ncBtn.onclick = () => Views.ncFromWorker();
        App.buildNav();
      } catch (e) { st.textContent = ''; U.$('#wc-results').innerHTML = `<div class="empty"><span class="ic">⚠</span>${esc(e.message)}</div>`; }
      analyzeBtn.disabled = false;
    };
  };

  Views.saveWorkerCheck = function () {
    const r = Views._wcResult; if (!r) return;
    S.add('hygieneChecks', {
      id: S.uid('hc'), date: S.todayISO(), time: new Date().toTimeString().slice(0, 5),
      employee: Views._wcEmp || '', result: r.result || '', score: r.score != null ? r.score : 0,
      source: r.source, thumb: Views._wcThumb || '',
    });
    const hc = S.col('hygieneChecks'); if (hc.length > 20) { hc.length = 20; S.save(); }
    U.toast('تم حفظ نتيجة الفحص', 'ok'); App.render();
  };

  Views.ncFromWorker = function () {
    const r = Views._wcResult; if (!r) return;
    const viols = (r.items || []).filter(i => i.status === 'مخالف').map(i => i.criterion);
    S.add('ncs', {
      id: S.uid('nc'), title: 'مخالفة نظافة عامل' + (Views._wcEmp ? ' (' + Views._wcEmp + ')' : '') + ': ' + viols.join('، '),
      severity: 'متوسطة', source: 'فحص العامل بالذكاء الاصطناعي', status: 'مفتوحة', date: S.todayISO(),
      owner: App.user.name, dueDate: S.shift(2),
      action: (r.corrective || '') + (r.reference ? '\n[المرجع: ' + r.reference + ']' : ''),
      preventiveAction: r.preventive || '', rootCause: '', photo: Views._wcThumb || '',
    });
    U.toast('تم إنشاء حالة عدم مطابقة مرفقة بالدليل المصوّر', 'ok'); App.buildNav();
  };

  /* ===================== حاسبة السعرات والمكوّنات والحساسية ===================== */
  Views._recipe = []; // [{name, grams}]

  Views.nutrition = function () {
    const db = S.load();
    const saved = (db.recipes || []).slice(0, 10);
    const opts = window.Nutrition.INGREDIENTS.map(i => `<option value="${esc(i.name)}">`).join('');
    return `
      <div class="page-head"><div><h2>حاسبة السعرات والمكوّنات والحساسية</h2><p>أنشئ وصفة من مكوّناتها لحساب السعرات والقيم الغذائية ورصد مسببات الحساسية تلقائيًا</p></div>
        <div class="spacer"></div>
        <button class="btn-secondary" onclick="Views.aiEstimateMeal()">🤖 تقدير وجبة بالذكاء الاصطناعي</button>
      </div>
      <div class="grid cols-2">
        <div class="card">
          <div class="card-title">🍽️ بناء الوصفة</div>
          <div class="form-grid two" style="margin-bottom:10px">
            <div class="field field-full"><label>اسم الوصفة</label><input id="rc-name" placeholder="مثال: برياني دجاج" /></div>
            <div class="field"><label>المكوّن</label><input id="rc-ing" list="rc-ings" placeholder="ابحث أو اختر" /><datalist id="rc-ings">${opts}</datalist></div>
            <div class="field"><label>الكمية (غرام)</label><input id="rc-g" type="number" min="0" step="10" placeholder="150" /></div>
          </div>
          <button class="btn-secondary" id="rc-add" style="width:100%;margin-bottom:12px">+ إضافة المكوّن</button>
          <div id="rc-list"></div>
          <div class="field" style="margin-top:10px"><label>عدد الحصص (Servings)</label><input id="rc-serv" type="number" min="1" value="1" /></div>
          <div class="form-actions" style="margin-top:6px"><button class="btn-primary" id="rc-save">حفظ الوصفة</button><button class="btn-secondary" id="rc-clear">تفريغ</button></div>
        </div>
        <div class="card">
          <div class="card-title">📊 القيمة الغذائية</div>
          <div id="rc-result">${U.empty('أضِف مكوّنات لعرض السعرات والحساسية', '🥗')}</div>
        </div>
      </div>
      ${saved.length ? `<div class="card section-gap">
        <div class="card-title">📒 الوصفات المحفوظة</div>
        <div class="table-wrap" style="border:none"><table>
          <thead><tr><th>الوصفة</th><th>الحصص</th><th>سعرات/حصة</th><th>الحساسية</th><th></th></tr></thead>
          <tbody>${saved.map(r => `<tr>
            <td><strong>${esc(r.name)}</strong></td><td>${r.servings}</td><td>${r.perKcal} kcal</td>
            <td>${(r.allergens || []).length ? r.allergens.map(a => U.badge(a, 'amber')).join(' ') : '<span class="muted">—</span>'}</td>
            <td class="t-actions"><button class="btn-danger btn-sm" onclick="Views.delRecipe('${r.id}')">حذف</button></td>
          </tr>`).join('')}</tbody></table></div>
      </div>` : ''}`;
  };

  Views._renderRecipe = function () {
    const list = U.$('#rc-list'), res = U.$('#rc-result'); if (!list) return;
    if (!Views._recipe.length) { list.innerHTML = '<p class="muted" style="font-size:13px">لا مكوّنات بعد.</p>'; res.innerHTML = U.empty('أضِف مكوّنات لعرض السعرات والحساسية', '🥗'); return; }
    const servings = parseInt((U.$('#rc-serv') || {}).value) || 1;
    const r = window.Nutrition.compute(Views._recipe, servings);
    list.innerHTML = `<div class="list-tight">${r.rows.map((row, i) => `
      <div class="row-line"><div style="flex:1"><strong>${esc(row.name)}</strong> <small class="muted">${row.grams}غ</small></div>
        <span class="muted">${row.kcal} kcal</span>
        <button class="btn-danger btn-sm" onclick="Views.rcRemove(${i})">✕</button></div>`).join('')}</div>`;
    const macro = (lbl, v, unit) => `<div><strong>${v}${unit}</strong><span>${lbl}</span></div>`;
    res.innerHTML = `
      <div class="donut-wrap" style="margin-bottom:14px">
        <div class="donut"><svg width="130" height="130" viewBox="0 0 130 130"><circle cx="65" cy="65" r="54" fill="none" stroke="#0f766e" stroke-width="14"/></svg>
          <div class="donut-label"><strong>${r.per.kcal}</strong><span>سعرة/حصة</span></div></div>
        <div style="flex:1"><div class="inline-stat">
          ${macro('بروتين', r.per.p, 'غ')}${macro('كربوهيدرات', r.per.c, 'غ')}${macro('دهون', r.per.f, 'غ')}
        </div><p class="muted" style="font-size:12px;margin-top:6px">القيم لكل حصة (${servings} حصص، الإجمالي ${r.total.kcal} kcal)</p></div>
      </div>
      <div class="card" style="background:#f8fafc;margin-bottom:0">
        <strong style="font-size:14px">⚠️ مسببات الحساسية</strong>
        <div style="margin-top:8px">${r.allergens.length ? r.allergens.map(a => U.badge(a, 'amber')).join(' ') : '<span class="muted">لا توجد مسببات معروفة من المكوّنات المختارة</span>'}</div>
        <p class="muted" style="font-size:11px;margin-top:8px">يجب التحقق ميدانيًا والإفصاح عن الحساسية وفق متطلبات الوسم (GSO 2233 / SFDA).</p>
      </div>
      <div class="form-actions" style="margin-top:12px"><button class="btn-secondary btn-sm" onclick="window.print()">🖨️ طباعة بطاقة القيمة الغذائية</button></div>`;
  };

  Views.rcRemove = function (i) { Views._recipe.splice(i, 1); Views._renderRecipe(); };
  Views.delRecipe = function (id) { S.remove('recipes', id); U.toast('تم الحذف', 'ok'); App.render(); };

  Views.bind_nutrition = function () {
    Views._recipe = [];
    const ingEl = U.$('#rc-ing'), gEl = U.$('#rc-g'), addBtn = U.$('#rc-add'), servEl = U.$('#rc-serv');
    if (!addBtn) return;
    addBtn.onclick = () => {
      const name = ingEl.value.trim(), g = parseFloat(gEl.value);
      if (!name || !window.Nutrition.find(name)) return U.toast('اختر مكوّنًا من القائمة', 'err');
      if (!g || g <= 0) return U.toast('أدخل كمية صحيحة', 'err');
      Views._recipe.push({ name, grams: g });
      ingEl.value = ''; gEl.value = ''; ingEl.focus();
      Views._renderRecipe();
    };
    if (servEl) servEl.oninput = () => Views._renderRecipe();
    U.$('#rc-clear').onclick = () => { Views._recipe = []; U.$('#rc-name').value = ''; Views._renderRecipe(); };
    U.$('#rc-save').onclick = () => {
      const name = U.$('#rc-name').value.trim();
      if (!name) return U.toast('أدخل اسم الوصفة', 'err');
      if (!Views._recipe.length) return U.toast('أضِف مكوّنات أولًا', 'err');
      const servings = parseInt(servEl.value) || 1;
      const r = window.Nutrition.compute(Views._recipe, servings);
      S.add('recipes', { id: S.uid('rcp'), name, servings, items: Views._recipe.slice(),
        totalKcal: r.total.kcal, perKcal: r.per.kcal, allergens: r.allergens });
      U.toast('تم حفظ الوصفة', 'ok'); App.render();
    };
    Views._renderRecipe();
  };

  // تقدير القيمة الغذائية لأي وجبة من وصف نصّي حر بالذكاء الاصطناعي
  Views._aiMeal = null;
  Views.aiEstimateMeal = function () {
    Views._aiMeal = null;
    U.modal('تقدير وجبة بالذكاء الاصطناعي', `
      <p class="muted" style="margin-bottom:12px">اكتب وصفًا حرًّا للوجبة أو مكوّناتها، ويقوم النظام بتقدير السعرات والقيم الغذائية ومسببات الحساسية المحتملة — مفيد للأطباق غير الموجودة في قاعدة المكوّنات.</p>
      <div class="form-grid two">
        <div class="field field-full"><label>وصف الوجبة</label><textarea id="am-desc" rows="3" placeholder="مثال: طبق كبسة لحم بالأرز مع مكسرات وزبيب وبصل وصلصة طماطم"></textarea></div>
        <div class="field"><label>عدد الحصص</label><input id="am-serv" type="number" min="1" value="1" /></div>
      </div>
      <div class="form-actions" style="margin-top:12px">
        <button class="btn-primary" id="am-go">🤖 قدّر القيمة الغذائية</button>
        <span id="am-state" class="muted" style="align-self:center"></span>
      </div>
      <div id="am-result" style="margin-top:14px"></div>`,
      { wide: true, onOpen: (root) => {
        U.$('#am-go').onclick = async () => {
          const desc = root.querySelector('#am-desc').value.trim();
          const serv = parseInt(root.querySelector('#am-serv').value) || 1;
          if (!desc) return U.toast('اكتب وصف الوجبة', 'err');
          const st = U.$('#am-state'); st.textContent = '⏳ جارٍ التقدير...';
          try {
            const r = await window.AI.estimateNutrition(desc, serv);
            Views._aiMeal = { desc, serv, r };
            if (r.needsKey) { st.textContent = ''; U.$('#am-result').innerHTML = `<div class="card" style="background:#fffbeb">${esc(r.hint || '')}</div>`; return; }
            st.textContent = r.source === 'ai' ? '✓ تقدير بالذكاء الاصطناعي' : '✓ تقدير محلي تقريبي';
            const p = r.perServing || {};
            const macro = (lbl, v, u) => `<div><strong>${v}${u}</strong><span>${lbl}</span></div>`;
            U.$('#am-result').innerHTML = `
              <div class="donut-wrap" style="margin-bottom:14px">
                <div class="donut"><svg width="130" height="130" viewBox="0 0 130 130"><circle cx="65" cy="65" r="54" fill="none" stroke="#0f766e" stroke-width="14"/></svg>
                  <div class="donut-label"><strong>${p.kcal ?? '—'}</strong><span>سعرة/حصة</span></div></div>
                <div style="flex:1"><div class="inline-stat">
                  ${macro('بروتين', p.protein ?? '—', 'غ')}${macro('كربوهيدرات', p.carbs ?? '—', 'غ')}${macro('دهون', p.fat ?? '—', 'غ')}
                </div><p class="muted" style="font-size:12px;margin-top:6px">${esc(r.dish || '')} — لكل حصة (${serv} حصص) · مستوى الثقة: ${esc(r.confidence || 'متوسطة')}</p></div>
              </div>
              <div class="card" style="background:#f8fafc;margin-bottom:0">
                <strong style="font-size:14px">⚠️ مسببات الحساسية المحتملة</strong>
                <div style="margin-top:8px">${(r.allergens || []).length ? r.allergens.map(a => U.badge(a, 'amber')).join(' ') : '<span class="muted">لم تُرصد مسببات معروفة</span>'}</div>
                ${r.notes ? `<p class="muted" style="font-size:12px;margin-top:8px">${esc(r.notes)}</p>` : ''}
                <p class="muted" style="font-size:11px;margin-top:8px">القيم تقديرية — يجب التحقق ميدانيًا والإفصاح عن الحساسية وفق متطلبات الوسم (GSO 2233 / SFDA).</p>
              </div>
              <div class="form-actions" style="margin-top:12px"><button class="btn-secondary" id="am-save">💾 حفظ كوجبة مقدّرة</button></div>`;
            const sv = U.$('#am-save'); if (sv) sv.onclick = () => Views._saveAiMeal();
          } catch (e) { st.textContent = '⚠ ' + e.message; }
        };
      } });
  };
  Views._saveAiMeal = function () {
    const a = Views._aiMeal; if (!a || !a.r || !a.r.perServing) return;
    const p = a.r.perServing;
    S.add('recipes', { id: S.uid('rcp'), name: a.r.dish || a.desc.slice(0, 40), servings: a.serv, items: [],
      totalKcal: Math.round((p.kcal || 0) * a.serv), perKcal: p.kcal || 0, allergens: a.r.allergens || [], aiEstimated: true });
    U.closeModal(); U.toast('تم حفظ الوجبة المقدّرة', 'ok'); App.render();
  };

  /* ===================== المواصفات والمعايير ===================== */
  Views.standards = function () {
    const regions = ['سعودية', 'خليجية', 'عالمية'];
    const byRegion = (r) => window.Standards.STANDARDS.filter(s => s.region === r);
    const card = (s) => `
      <div class="card" style="margin-bottom:14px">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
          <strong style="flex:1">${esc(s.title)}</strong>
          ${U.badge(s.code, 'blue')}
        </div>
        <p class="muted" style="font-size:13px;margin-bottom:8px">${esc(s.authority)} — ${esc(s.scope)}</p>
        <ul style="margin-inline-start:18px;font-size:13.5px;line-height:1.9">${s.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      </div>`;
    return `
      <div class="page-head">
        <div><h2>المواصفات والمعايير المرجعية</h2><p>قاعدة المعرفة التي يستند إليها النظام في التقييم والرصد — سعودية وخليجية وعالمية</p></div>
      </div>
      <div class="card" style="margin-bottom:20px">
        <div class="card-title">🌡️ الحدود الحرارية الحرجة المرجعية</div>
        <div class="table-wrap" style="border:none"><table>
          <thead><tr><th>البند</th><th>الحد المرجعي</th><th>المرجع</th></tr></thead>
          <tbody>${window.Standards.CRITICAL_LIMITS.map(l => `<tr>
            <td><strong>${esc(l.item)}</strong></td><td>${esc(l.limit)}</td><td class="muted">${esc(l.ref)}</td>
          </tr>`).join('')}</tbody></table></div>
      </div>
      ${regions.map(r => `
        <h3 style="margin:18px 0 12px;color:#0f766e">${r === 'سعودية' ? '🇸🇦 المواصفات السعودية' : r === 'خليجية' ? '🌙 المواصفات الخليجية (GSO)' : '🌍 المواصفات العالمية'}</h3>
        ${byRegion(r).map(card).join('')}
      `).join('')}`;
  };

  /* ===================== التقارير والجاهزية ===================== */
  Views.reports = function () {
    const m = S.metrics();
    const db = S.load();
    // توزيع نتائج التدقيق حسب القسم (آخر تدقيق GMP)
    const gmp = [...db.inspections].filter(i => i.template === 'gmp').sort((a, b) => b.date.localeCompare(a.date))[0];
    let sectionBars = '';
    if (gmp) {
      sectionBars = gmp.sections.map(sec => {
        let yes = 0, tot = 0;
        sec.items.forEach(it => { if (it.result !== 'na') { tot++; if (it.result === 'yes') yes++; } });
        const pct = tot ? Math.round(yes / tot * 100) : 0;
        const col = pct >= 85 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626';
        return `<div class="bar-row"><div class="bar-label">${esc(sec.title)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${col}">${pct}%</div></div></div>`;
      }).join('');
    }

    const checklist = [
      ['سجلات درجات الحرارة محدثة', m.tempBreaches === 0],
      ['لا توجد مخالفات حرجة مفتوحة', m.criticalNCs === 0],
      ['جميع الشهادات الصحية سارية', m.expiredCards === 0],
      ['نسبة امتثال GMP ≥ 85%', m.compliance >= 85],
      ['جدول التنظيف محدّث', m.overdueCleaning === 0],
      ['تم تنفيذ تدقيق داخلي حديث', !!m.lastInsp],
      ['خطة HACCP موثّقة بنقاط تحكم حرجة', m.ccpCount > 0],
      ['لا توجد دفعات منتهية الصلاحية في المخزون', m.expiredBatches === 0],
    ];

    return `
      <div class="page-head">
        <div><h2>التقارير وجاهزية التفتيش</h2><p>ملخص شامل لحالة المنشأة وجاهزيتها لزيارة الجهات الرقابية</p></div>
        <div class="spacer"></div>
        <button class="btn-secondary" onclick="window.print()">🖨️ طباعة التقرير</button>
      </div>

      <div class="grid cols-3">
        <div class="card">
          <div class="card-title">🛡️ مؤشر الجاهزية العام</div>
          <div class="donut-wrap">${U.donut(m.readiness, 'جاهز للتفتيش')}
            <div style="flex:1" class="muted">${m.readiness >= 85 ? 'المنشأة في حالة جاهزية ممتازة.' : m.readiness >= 60 ? 'جاهزية مقبولة مع وجود ملاحظات تحتاج معالجة.' : 'تحذير: توجد مخاطر تتطلب إجراءات عاجلة قبل التفتيش.'}</div>
          </div>
        </div>
        <div class="card" style="grid-column:span 2">
          <div class="card-title">📋 قائمة التحقق قبل التفتيش</div>
          ${checklist.map(([t, ok]) => `<div class="row-line">
            <span class="dot ${ok ? 'green' : 'red'}"></span>
            <div style="flex:1">${esc(t)}</div>
            ${ok ? U.badge('مستوفى', 'green') : U.badge('غير مستوفى', 'red')}</div>`).join('')}
        </div>
      </div>

      <div class="card section-gap">
        <div class="card-title">📊 الامتثال حسب محاور GMP</div>
        ${sectionBars || U.empty('نفّذ تدقيق GMP لعرض التحليل', '📊')}
      </div>

      <div class="card section-gap">
        <div class="card-title">🏢 بيانات المنشأة</div>
        <div class="inline-stat">
          <div><strong>${esc(db.meta.facilityName)}</strong><span>اسم المنشأة</span></div>
          <div><strong>${esc(db.meta.city)}</strong><span>المدينة</span></div>
          <div><strong>${esc(db.meta.license)}</strong><span>السجل التجاري</span></div>
          <div><strong>${db.employees.length}</strong><span>عدد العاملين</span></div>
          <div><strong>${db.suppliers.length}</strong><span>الموردون</span></div>
          <div><strong>${fmtDate(S.todayISO())}</strong><span>تاريخ التقرير</span></div>
        </div>
      </div>`;
  };

  /* ===================== الفريق والأدوار ===================== */
  Views._roleLbl = function (r) { return { owner: 'مالك', manager: 'مدير', inspector: 'مفتش' }[r] || r; };

  Views.team = function () {
    const cloud = window.Cloud && window.Cloud.active && window.Cloud.active();
    if (!cloud) {
      return `<div class="page-head"><div><h2>إدارة الفريق والأدوار</h2><p>دعوة الأعضاء وتحديد صلاحياتهم</p></div></div>
        <div class="card" style="background:#eff6ff;border-color:#bfdbfe">
          <strong>ℹ️ إدارة الفريق متاحة في النسخة السحابية (SaaS)</strong>
          <p class="muted" style="margin-top:6px">عند تفعيل الوضع السحابي، يمكنك دعوة أعضاء فريقك بأدوار مختلفة (مالك / مدير / مفتش) ضمن منشأتك.</p>
          <div class="list-tight" style="margin-top:12px">
            <div class="row-line"><strong>مالك</strong><span class="spacer"></span><span class="muted">صلاحيات كاملة + الفوترة + إدارة الفريق</span></div>
            <div class="row-line"><strong>مدير</strong><span class="spacer"></span><span class="muted">إدارة العمليات ودعوة المفتشين</span></div>
            <div class="row-line"><strong>مفتش</strong><span class="spacer"></span><span class="muted">تنفيذ التفتيش والتسجيل والرصد</span></div>
          </div>
        </div>`;
    }
    const canManage = window.Cloud.canManageTeam();
    return `
      <div class="page-head"><div><h2>إدارة الفريق والأدوار</h2><p>دعوة الأعضاء وتحديد صلاحياتهم داخل المنشأة</p></div></div>
      ${canManage ? `<div class="card" style="margin-bottom:18px">
        <div class="card-title">➕ دعوة عضو</div>
        <div class="form-grid two">
          <div class="field"><label>البريد الإلكتروني</label><input id="inv-email" type="email" placeholder="member@example.com" /></div>
          <div class="field"><label>الدور</label><select id="inv-role"><option value="inspector">مفتش</option><option value="manager">مدير</option></select></div>
        </div>
        <div class="form-actions" style="margin-top:12px"><button class="btn-primary" id="inv-send">إرسال الدعوة</button><span id="inv-msg" class="muted" style="align-self:center"></span></div>
        <p class="muted" style="font-size:12px;margin-top:8px">ينضم العضو تلقائيًا عند تسجيله/دخوله بنفس البريد.</p>
      </div>` : ''}
      <div class="card" style="margin-bottom:18px">
        <div class="card-title">👥 الأعضاء</div>
        <div id="team-members">${U.empty('جارٍ التحميل...', '👥')}</div>
      </div>
      <div class="card">
        <div class="card-title">✉️ الدعوات</div>
        <div id="team-invites">${U.empty('جارٍ التحميل...', '✉️')}</div>
      </div>`;
  };

  Views.bind_team = async function () {
    const cloud = window.Cloud && window.Cloud.active && window.Cloud.active();
    if (!cloud) return;
    const C = window.Cloud;
    const sendBtn = U.$('#inv-send');
    if (sendBtn) sendBtn.onclick = async () => {
      const email = U.$('#inv-email').value.trim(), role = U.$('#inv-role').value;
      const msg = U.$('#inv-msg');
      if (!email) { msg.textContent = '⚠ أدخل البريد'; return; }
      sendBtn.disabled = true; msg.textContent = '⏳ جارٍ الإرسال...';
      try { await C.invite(email, role); msg.textContent = '✓ تم إرسال الدعوة'; U.$('#inv-email').value = ''; Views.bind_team(); }
      catch (e) { msg.textContent = '⚠ ' + (e.message || 'تعذّر'); }
      sendBtn.disabled = false;
    };
    try {
      const members = await C.listMembers();
      const me = (C.org() || {});
      U.$('#team-members').innerHTML = members.length ? `<div class="list-tight">${members.map(m => `
        <div class="row-line">
          <div style="flex:1"><strong>${esc(m.email || m.user_id)}</strong></div>
          ${U.badge(Views._roleLbl(m.role), m.role === 'owner' ? 'blue' : m.role === 'manager' ? 'green' : 'gray')}
          ${(C.canManageTeam() && m.role !== 'owner') ? `<button class="btn-danger btn-sm" onclick="Views.removeMember('${m.user_id}')">إزالة</button>` : ''}
        </div>`).join('')}</div>` : U.empty('لا أعضاء بعد');
    } catch (e) { U.$('#team-members').innerHTML = `<div class="empty">⚠ ${esc(e.message)}</div>`; }
    try {
      const invites = await C.listInvitations();
      U.$('#team-invites').innerHTML = invites.length ? `<div class="list-tight">${invites.map(i => `
        <div class="row-line"><div style="flex:1">${esc(i.email)}</div>${U.badge(Views._roleLbl(i.role), 'gray')}${U.statusBadge(i.status === 'pending' ? 'قيد المعالجة' : i.status === 'accepted' ? 'مكتمل' : 'منخفضة')}</div>`).join('')}</div>` : U.empty('لا دعوات', '✉️');
    } catch (e) { U.$('#team-invites').innerHTML = `<div class="empty">⚠ ${esc(e.message)}</div>`; }
  };

  Views.removeMember = function (userId) {
    U.confirmDialog('إزالة هذا العضو من المنشأة؟', async () => {
      try { await window.Cloud.removeMember(userId); U.toast('تمت الإزالة', 'ok'); Views.bind_team(); }
      catch (e) { U.toast(e.message || 'تعذّر', 'err'); }
    }, 'إزالة');
  };

  /* ===================== الاشتراك والخطة ===================== */
  Views.billing = function () {
    const cloud = window.Cloud && window.Cloud.active && window.Cloud.active();
    const plans = [
      { key: 'basic', name: 'الأساسية', price: '١٩٩', for: 'مطعم أو كافيه واحد', feats: ['التفتيش و GMP', 'مراقبة الحرارة', 'الشهادات الصحية', 'التقارير'] },
      { key: 'pro', name: 'الاحترافية', price: '٣٩٩', for: 'المطاعم والكافيهات النشطة', feats: ['كل الأساسية', 'الرصد بالتصوير الذكي (AI)', 'الإجراءات التصحيحية والوقائية', 'الموردون والتنظيف'], featured: true },
      { key: 'enterprise', name: 'المؤسسية', price: 'تواصل', for: 'السلاسل والمصانع', feats: ['فروع متعددة', 'صلاحيات متقدمة', 'تكامل ودعم مخصص', 'تدريب الفريق'] },
    ];
    let head = '';
    if (cloud) {
      const C = window.Cloud, days = C.trialDaysLeft(), key = C.planKey(), status = (C.org() || {}).subscription_status;
      head = `<div class="card" style="margin-bottom:18px">
        <div class="inline-stat">
          <div><strong>${esc(C.planLimits().label)}</strong><span>خطتك الحالية</span></div>
          <div><strong>${esc(status || '—')}</strong><span>حالة الاشتراك</span></div>
          ${key === 'trial' && days != null ? `<div><strong>${days} يوم</strong><span>متبقٍ من التجربة</span></div>` : ''}
          <div><strong>${C.planLimits().ai ? 'مُفعّل' : 'غير متاح'}</strong><span>الذكاء الاصطناعي</span></div>
        </div>
      </div>`;
    } else {
      head = `<div class="card" style="margin-bottom:18px;background:#eff6ff;border-color:#bfdbfe">
        <strong>ℹ️ إدارة الاشتراكات متاحة في النسخة السحابية (SaaS)</strong>
        <p class="muted" style="margin-top:6px">أنت الآن في وضع العرض المحلي. عند تفعيل الوضع السحابي (Supabase) تُدار الحسابات والخطط والاشتراكات لكل منشأة. الخطط أدناه للعرض.</p>
      </div>`;
    }
    const curKey = cloud ? window.Cloud.planKey() : null;
    return `
      <div class="page-head"><div><h2>الاشتراك والخطة</h2><p>اختر الخطة المناسبة لمنشأتك — يمكن الترقية في أي وقت</p></div></div>
      ${head}
      <div class="grid cols-3">
        ${plans.map(p => `
          <div class="card" style="${p.featured ? 'border-color:var(--teal);box-shadow:0 12px 36px rgba(15,118,110,.15)' : ''};position:relative">
            ${p.featured ? '<span class="badge green" style="position:absolute;top:-10px;inset-inline-start:18px">الأكثر شيوعًا</span>' : ''}
            ${curKey === p.key ? '<span class="badge blue" style="position:absolute;top:-10px;inset-inline-end:18px">خطتك الحالية</span>' : ''}
            <h3 style="font-size:19px">${esc(p.name)}</h3>
            <div style="font-size:30px;font-weight:800;color:var(--teal-dark);margin:8px 0 2px">${esc(p.price)}<span style="font-size:14px;font-weight:600;color:var(--muted)">${p.price === 'تواصل' ? '' : ' ر.س/شهر'}</span></div>
            <p class="muted" style="font-size:13px;margin-bottom:14px">${esc(p.for)}</p>
            <ul style="list-style:none;display:grid;gap:9px;margin-bottom:16px">${p.feats.map(f => `<li style="position:relative;padding-inline-start:24px"><span style="position:absolute;inset-inline-start:0;color:var(--teal);font-weight:800">✓</span>${esc(f)}</li>`).join('')}</ul>
            <button class="${p.featured ? 'btn-primary' : 'btn-secondary'}" style="width:100%" onclick="Views.choosePlan('${p.key}')">${curKey === p.key ? 'خطتك الحالية' : (p.price === 'تواصل' ? 'اطلب عرضًا' : 'اختر الخطة')}</button>
          </div>`).join('')}
      </div>
      <p class="muted" style="margin-top:16px;font-size:13px">💳 الدفع الإلكتروني (مدى/بطاقات) قيد التفعيل — حاليًا يتم تفعيل الخطة يدويًا من قِبل فريقنا.</p>`;
  };

  Views.choosePlan = async function (key) {
    if (!(window.Cloud && window.Cloud.active())) { U.toast('إدارة الاشتراك متاحة في النسخة السحابية', ''); return; }
    if (key === 'enterprise') {
      U.confirmDialog('سيتواصل معك فريقنا لتجهيز الخطة المؤسسية. متابعة؟', () => U.toast('تم تسجيل طلبك — سنتواصل معك قريبًا', 'ok'), 'تأكيد الطلب');
      return;
    }
    // دفع عبر Moyasar
    U.confirmDialog('سيتم تحويلك لإتمام الدفع الآمن عبر Moyasar. متابعة؟', async () => {
      try { await window.Cloud.checkout(key); }
      catch (e) { U.toast(e.message || 'تعذّر بدء الدفع', 'err'); }
    }, 'متابعة الدفع');
  };

  /* ===================== الإعدادات ===================== */
  Views.settings = function () {
    const db = S.load();
    return `
      <div class="page-head"><div><h2>الإعدادات</h2><p>بيانات المنشأة وإدارة البيانات</p></div></div>
      <div class="card" style="max-width:560px">
        <div class="card-title">🏢 بيانات المنشأة</div>
        <div class="form-grid">
          <div class="field"><label>اسم المنشأة</label><input id="set-name" value="${esc(db.meta.facilityName)}" /></div>
          <div class="field"><label>المدينة</label><input id="set-city" value="${esc(db.meta.city)}" /></div>
          <div class="field"><label>السجل التجاري / الترخيص</label><input id="set-lic" value="${esc(db.meta.license)}" /></div>
          <div class="form-actions"><button class="btn-primary" id="save-meta">حفظ</button></div>
        </div>
      </div>
      ${(window.Cloud && window.Cloud.active && window.Cloud.active()) ? `
      <div class="card section-gap" style="max-width:560px">
        <div class="card-title">🤖 الذكاء الاصطناعي (Claude)</div>
        ${window.Cloud.feature('ai') ? `
          <p class="muted" style="margin-bottom:10px">يعمل الذكاء الاصطناعي (<strong>${esc(window.AI.MODEL)}</strong>) عبر <strong>بوابة آمنة على الخادم</strong> — مفتاح Anthropic محفوظ في الخادم ولا يظهر في المتصفح. لا حاجة لإدخال أي مفتاح هنا.</p>
          <div class="form-actions"><button class="btn-secondary" id="ai-test">اختبار الاتصال بالبوابة</button><span id="ai-test-state" class="muted" style="align-self:center"></span></div>
        ` : `
          <p class="muted">ميزة الذكاء الاصطناعي غير متضمَّنة في خطتك الحالية (<strong>${esc(window.Cloud.planLimits().label)}</strong>). يرجى الترقية لتفعيلها.</p>
          <div class="form-actions"><button class="btn-primary" onclick="App.go('billing')">عرض الخطط والترقية</button></div>
        `}
      </div>` : `
      <div class="card section-gap" style="max-width:560px">
        <div class="card-title">🤖 الذكاء الاصطناعي (Gemini)</div>
        <p class="muted" style="margin-bottom:14px">عند التفعيل يستخدم النظام نموذج <strong>${esc(window.AI.MODEL)}</strong> لتحليل الصور ورصد المخالفات وتقييم البنود وتوليد الإجراءات. يُحفظ المفتاح محليًا على جهازك فقط. <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--primary)">احصل على مفتاح مجاني</a></p>
        <div class="form-grid">
          <div class="field"><label>مفتاح Gemini API</label><input id="ai-key" type="password" placeholder="AIza..." value="${esc(window.AI.cfg().apiKey || '')}" /></div>
          <div class="field"><label style="display:flex;gap:8px;align-items:center;font-weight:400">
            <input type="checkbox" id="ai-enabled" ${window.AI.cfg().enabled !== false ? 'checked' : ''}/> تفعيل خدمة الذكاء الاصطناعي
          </label></div>
          <div class="form-actions">
            <button class="btn-primary" id="ai-save">حفظ الإعدادات</button>
            <button class="btn-secondary" id="ai-test">اختبار الاتصال</button>
            <span id="ai-test-state" class="muted" style="align-self:center"></span>
          </div>
        </div>
      </div>`}
      <div class="card section-gap" style="max-width:560px">
        <div class="card-title">🗃️ إدارة البيانات</div>
        <p class="muted" style="margin-bottom:14px">تُحفظ جميع البيانات محليًا على هذا الجهاز. يمكنك تصدير نسخة احتياطية أو إعادة ضبط النظام.</p>
        <div class="form-actions">
          <button class="btn-secondary" onclick="App.exportData()">⬇ تصدير نسخة احتياطية</button>
          <button class="btn-danger" id="reset-btn">↺ إعادة الضبط للبيانات التجريبية</button>
        </div>
      </div>`;
  };

  Views.bindSettings = function () {
    const save = U.$('#save-meta');
    if (save) save.onclick = () => {
      const db = S.load();
      db.meta.facilityName = U.$('#set-name').value.trim();
      db.meta.city = U.$('#set-city').value.trim();
      db.meta.license = U.$('#set-lic').value.trim();
      S.save(); U.toast('تم حفظ بيانات المنشأة', 'ok');
    };
    const reset = U.$('#reset-btn');
    if (reset) reset.onclick = () => U.confirmDialog('سيتم حذف جميع البيانات الحالية واستعادة البيانات التجريبية. متابعة؟', () => {
      S.reset(); U.toast('تمت إعادة الضبط', 'ok'); App.render();
    }, 'إعادة الضبط');

    const aiSave = U.$('#ai-save');
    if (aiSave) aiSave.onclick = () => {
      window.AI.setCfg({ apiKey: U.$('#ai-key').value.trim(), enabled: U.$('#ai-enabled').checked });
      U.toast('تم حفظ إعدادات الذكاء الاصطناعي', 'ok');
    };
    const aiTest = U.$('#ai-test');
    if (aiTest) aiTest.onclick = async () => {
      const keyEl = U.$('#ai-key'), enEl = U.$('#ai-enabled');
      if (keyEl) window.AI.setCfg({ apiKey: keyEl.value.trim(), enabled: enEl ? enEl.checked : true });
      const st = U.$('#ai-test-state');
      const cloud = window.Cloud && window.Cloud.active && window.Cloud.active();
      if (!cloud && !window.AI.hasKey()) { st.textContent = '⚠ أدخل المفتاح أولًا'; return; }
      st.textContent = '⏳ جارٍ الاختبار...';
      try {
        const r = await window.AI.generateCapa('اختبار اتصال: درجة حرارة ثلاجة مرتفعة');
        st.textContent = r.source === 'ai' ? '✓ الاتصال ناجح والخدمة تعمل' : '⚠ تعذّر الاتصال — يعمل النظام بالوضع المحلي';
      } catch (e) { st.textContent = '⚠ ' + e.message; }
    };
  };

  window.Views = Views;
})();
