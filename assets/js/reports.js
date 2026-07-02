/* ============================================================
   reports.js — مركز التقارير والمطبوعات
   Reports & Print Center
   ============================================================ */
(function () {
  const S = window.Store, U = window.UI;
  const DISCLAIMER = 'هذا التقرير أداة داخلية لمساعدة المنشأة على متابعة جاهزية سلامة الغذاء وتحسين التوثيق والإجراءات التصحيحية، ولا يمثل شهادة اعتماد رسمية أو ضماناً لاجتياز التفتيش.';
  const esc = t => U.esc(t);

  // ── أدوات مساعدة ──────────────────────────────────────────
  function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }
  function scoreBar(val, max) {
    const p = Math.round((val / max) * 100);
    const col = p >= 80 ? 'var(--green)' : p >= 60 ? 'var(--amber)' : 'var(--red)';
    return `<div style="background:var(--line);border-radius:99px;height:8px;overflow:hidden;margin-top:4px">
      <div style="width:${p}%;height:100%;background:${col};transition:width .4s"></div></div>`;
  }
  function badge(t, c) {
    const colors = { green:'#dcfce7;color:#166534', amber:'#fef3c7;color:#92400e', red:'#fee2e2;color:#991b1b', blue:'#dbeafe;color:#1e40af', gray:'#f1f5f9;color:#475569' };
    return `<span style="display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:700;background:${colors[c]||colors.gray}">${t}</span>`;
  }
  function classify(score) {
    if (score >= 90) return { lbl: 'ممتاز', cls: 'green' };
    if (score >= 80) return { lbl: 'جيد جداً', cls: 'green' };
    if (score >= 70) return { lbl: 'مقبول', cls: 'amber' };
    if (score >= 60) return { lbl: 'يحتاج تحسين', cls: 'amber' };
    return { lbl: 'عالي الخطورة', cls: 'red' };
  }
  function nowAr() {
    return new Date().toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric', weekday:'long' });
  }
  function exportCSV(headers, rows, filename) {
    const bom = '﻿';
    const csv = bom + [headers, ...rows].map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename + '.csv'; a.click();
    URL.revokeObjectURL(a.href);
  }
  function printReport(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head>
      <meta charset="UTF-8"><title>تقرير تفتيش</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Cairo',sans-serif;font-size:13px;color:#0f172a;direction:rtl}
        h1{font-size:22px;font-weight:900;margin-bottom:4px}
        h2{font-size:15px;font-weight:800;margin:18px 0 8px;color:#115e59;border-bottom:1.5px solid #e2e8f0;padding-bottom:4px}
        h3{font-size:13px;font-weight:700;margin:12px 0 6px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px}
        th,td{border:1px solid #e2e8f0;padding:6px 10px;text-align:right}
        th{background:#f8fafc;font-weight:700}
        .disclaimer{background:#fffbeb;border:1.5px solid #fcd34d;border-radius:8px;padding:10px 14px;font-size:11px;color:#78350f;margin:16px 0}
        .kpi-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
        .kpi-box{border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;min-width:120px}
        .kpi-box .val{font-size:22px;font-weight:900}
        .kpi-box .lbl{font-size:11px;color:#6b7280}
        .header-meta{color:#6b7280;font-size:11px;margin-bottom:18px}
        .bar-bg{background:#e2e8f0;border-radius:99px;height:7px;overflow:hidden;margin-top:3px}
        .bar-fg{height:100%;border-radius:99px}
        @page{size:A4;margin:18mm}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  }

  // ── حساب درجة الفرع ───────────────────────────────────────
  function branchScore(branchId) {
    const db = S.load();
    const bf = r => !branchId || !r.branchId || r.branchId === branchId;

    const inspections = (db.inspections || []).filter(bf);
    const ncs = (db.ncs || []).filter(bf);
    const tempLogs = (db.tempLogs || []).filter(bf);
    const cleaning = (db.cleaning || []).filter(bf);
    const pest = (db.pest || []).filter(bf);
    const employees = (db.employees || []);

    const openNCs = ncs.filter(n => n.status !== 'مغلقة');
    const closedNCs = ncs.filter(n => n.status === 'مغلقة');
    const criticalOpen = openNCs.filter(n => n.severity === 'حرجة');
    const overdueCapas = openNCs.filter(n => n.dueDate && S.daysFromToday(n.dueDate) < 0);
    const overdueCapas7 = openNCs.filter(n => n.dueDate && S.daysFromToday(n.dueDate) < -7);

    const lastInsp = [...inspections].sort((a,b)=>b.date.localeCompare(a.date))[0];
    const complianceRate = lastInsp ? S.inspectionScore(lastInsp) : 0;
    const capaRate = ncs.length ? pct(closedNCs.length, ncs.length) : 100;

    const totalTempLogs = tempLogs.length;
    const okTemp = tempLogs.filter(t => t.status !== 'مخالف').length;
    const tempRate = totalTempLogs ? pct(okTemp, totalTempLogs) : 100;

    const totalCleaning = cleaning.length;
    const doneCleaning = cleaning.filter(c => c.status === 'منجز').length;
    const cleanRate = totalCleaning ? pct(doneCleaning, totalCleaning) : 100;

    const totalPest = pest.length;
    const okPest = pest.filter(p => p.result === 'سليم').length;
    const pestRate = totalPest ? pct(okPest, totalPest) : 100;

    const totalEmps = employees.length;
    const validCerts = employees.filter(e => S.daysFromToday(e.healthCardExpiry) >= 0).length;
    const certRate = totalEmps ? pct(validCerts, totalEmps) : 100;

    let score = complianceRate * 0.30
      + capaRate * 0.20
      + (inspections.length ? 100 : 0) * 0.15
      + tempRate * 0.10
      + cleanRate * 0.10
      + pestRate * 0.05
      + (totalTempLogs > 0 ? 100 : 50) * 0.05
      + certRate * 0.05;

    // الخصومات
    score -= criticalOpen.length * 10;
    score -= overdueCapas7.length * 5;
    score -= overdueCapas.length * 3;
    score -= employees.filter(e => S.daysFromToday(e.healthCardExpiry) < 0).length * 5;

    score = Math.max(0, Math.min(100, Math.round(score)));

    return { score, complianceRate, capaRate, tempRate, cleanRate, pestRate, certRate,
      openNCs: openNCs.length, criticalOpen: criticalOpen.length, overdueCapas: overdueCapas.length };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // الطرف الرئيسي: مركز التقارير
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const TABS = [
    { id:'dashboard',  icon:'📊', label:'لوحة التقارير' },
    { id:'executive',  icon:'🏆', label:'التقرير التنفيذي' },
    { id:'branch',     icon:'🏪', label:'تقييم الفروع' },
    { id:'haccp',      icon:'🛡️', label:'HACCP' },
    { id:'ccp',        icon:'🎯', label:'CCP / OPRP' },
    { id:'gmp',        icon:'✅', label:'GMP / GHP' },
    { id:'capa',       icon:'⚠️', label:'CAPA' },
    { id:'oplogs',     icon:'📋', label:'السجلات التشغيلية' },
    { id:'suppliers',  icon:'🚚', label:'الموردون والتتبع' },
    { id:'training',   icon:'👥', label:'التدريب والشهادات' },
    { id:'inspections',icon:'🔍', label:'تقارير التفتيش' },
    { id:'forms',      icon:'🖨️', label:'النماذج القابلة للطباعة' },
    { id:'archive',    icon:'🗂️', label:'أرشيف التقارير' },
  ];

  let _rcTab = 'dashboard';

  window.Views = window.Views || {};
  const Views = window.Views;

  Views.reportcenter = function () {
    const db = S.load();
    const m = S.metrics();
    const tabBar = TABS.map(t =>
      `<button class="rc-tab${_rcTab===t.id?' active':''}" onclick="Views._rcSetTab('${t.id}')" style="white-space:nowrap">
        ${t.icon} ${t.label}</button>`).join('');

    const body = Views['_rc_' + _rcTab] ? Views['_rc_' + _rcTab](db, m) : `<p class="muted">قريبًا</p>`;

    return `
      <div class="page-head" style="margin-bottom:0">
        <div><h2>مركز التقارير والمطبوعات</h2>
          <p class="muted" style="font-size:13px">Reports &amp; Print Center — ${nowAr()}</p></div>
      </div>
      <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;padding:10px 16px;margin:14px 0;font-size:12.5px;color:#78350f">
        ⚠️ ${DISCLAIMER}
      </div>
      <div class="rc-tabs-wrap" style="overflow-x:auto;margin-bottom:18px">
        <div class="rc-tabs" style="display:flex;gap:6px;min-width:max-content;padding:2px">${tabBar}</div>
      </div>
      <div id="rc-body">${body}</div>`;
  };

  Views._rcSetTab = function (id) {
    _rcTab = id;
    if (window.App) App.render();
  };

  // ── TAB: لوحة التقارير ────────────────────────────────────
  Views._rc_dashboard = function (db, m) {
    const branches = db.branches || [];
    const ncs = db.ncs || [];
    const openNCs = ncs.filter(n => n.status !== 'مغلقة');
    const closedNCs = ncs.filter(n => n.status === 'مغلقة');
    const capaRate = ncs.length ? pct(closedNCs.length, ncs.length) : 100;
    const inspections = db.inspections || [];
    const lastInsp = inspections.length
      ? [...inspections].sort((a,b)=>b.date.localeCompare(a.date))[0] : null;

    const kpi = (icon, label, val, sub, color) =>
      `<div class="card kpi" style="border-top:3px solid ${color}">
        <div class="kpi-ic" style="font-size:22px">${icon}</div>
        <div class="kpi-label">${label}</div>
        <div class="kpi-value" style="color:${color}">${val}</div>
        <div class="kpi-sub" style="font-size:11px;color:var(--muted)">${sub}</div>
      </div>`;

    const readColor = m.readiness>=80?'var(--green)':m.readiness>=60?'var(--amber)':'var(--red)';
    const kpis = `
      <div class="cols-4" style="gap:14px;margin-bottom:18px">
        ${kpi('🎯','مؤشر الجاهزية',m.readiness+'%',classify(m.readiness).lbl,readColor)}
        ${kpi('📋','نسبة الامتثال GMP',m.compliance+'%','آخر تفتيش',m.compliance>=80?'var(--green)':m.compliance>=60?'var(--amber)':'var(--red)')}
        ${kpi('⚠️','مخالفات مفتوحة',m.openNCs,(m.criticalNCs?m.criticalNCs+' حرجة':'لا توجد حرجة'),m.criticalNCs?'var(--red)':'var(--amber)')}
        ${kpi('🔄','معدل إغلاق CAPA',capaRate+'%',closedNCs.length+' من '+ncs.length,'var(--teal)')}
        ${kpi('🌡️','مخالفات الحرارة',m.tempBreaches,'سجل درجات الحرارة',m.tempBreaches?'var(--red)':'var(--green)')}
        ${kpi('👥','شهادات منتهية',m.expiredCards,m.expiringCards+' تنتهي قريبًا',m.expiredCards?'var(--red)':'var(--green)')}
        ${kpi('🧹','تنظيف متأخر',m.overdueCleaning,'مهمة تنظيف متأخرة',m.overdueCleaning?'var(--amber)':'var(--green)')}
        ${kpi('📦','دفعات منتهية الصلاحية',m.expiredBatches,'من إجمالي '+m.activeBatches+' دفعة',m.expiredBatches?'var(--red)':'var(--green)')}
      </div>`;

    // أزرار التقارير السريعة
    const quickBtns = `
      <div class="card" style="margin-bottom:18px">
        <h3 style="margin-bottom:14px;font-size:15px;font-weight:800">تقارير سريعة</h3>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn-primary" onclick="Views._rcSetTab('executive')">📊 التقرير التنفيذي</button>
          <button class="btn-secondary" onclick="Views._rcSetTab('branch')">🏪 تقييم الفروع</button>
          <button class="btn-secondary" onclick="Views._rcSetTab('capa')">⚠️ تقرير CAPA</button>
          <button class="btn-secondary" onclick="Views._rcSetTab('gmp')">✅ تقرير GMP</button>
          <button class="btn-secondary" onclick="Views._rcSetTab('oplogs')">📋 السجلات التشغيلية</button>
          <button class="btn-secondary" onclick="Views._rcSetTab('forms')">🖨️ النماذج</button>
        </div>
      </div>`;

    // ملخص الفروع
    const branchRows = branches.map(b => {
      const bs = branchScore(b.id);
      const cl = classify(bs.score);
      return `<tr>
        <td>${esc(b.name)}${b.city?` <small class="muted">(${esc(b.city)})</small>`:''}
        </td>
        <td><strong>${bs.score}%</strong> ${scoreBar(bs.score,100)}</td>
        <td>${badge(cl.lbl, cl.cls)}</td>
        <td>${bs.openNCs}</td>
        <td>${bs.criticalOpen}</td>
        <td>${bs.overdueCapas}</td>
      </tr>`;
    }).join('');

    const branchTable = branches.length ? `
      <div class="card" style="margin-bottom:18px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <h3 style="font-size:15px;font-weight:800">ملخص الفروع</h3>
          <button class="btn-secondary btn-sm" onclick="Views._rcSetTab('branch')">تفاصيل تقييم الفروع ←</button>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>الفرع</th><th>الدرجة</th><th>التصنيف</th><th>مفتوحة</th><th>حرجة</th><th>CAPA متأخرة</th></tr></thead>
          <tbody>${branchRows}</tbody>
        </table></div>
      </div>` : '';

    return kpis + quickBtns + branchTable;
  };

  // ── TAB: التقرير التنفيذي ─────────────────────────────────
  Views._rc_executive = function (db, m) {
    const branches = db.branches || [];
    const ncs = db.ncs || [];
    const openNCs = ncs.filter(n => n.status !== 'مغلقة');
    const closedNCs = ncs.filter(n => n.status === 'مغلقة');
    const capaRate = ncs.length ? pct(closedNCs.length, ncs.length) : 100;
    const criticalNCs = openNCs.filter(n => n.severity === 'حرجة');
    const inspections = db.inspections || [];
    const lastInsp = inspections.length ? [...inspections].sort((a,b)=>b.date.localeCompare(a.date))[0] : null;

    const readClass = classify(m.readiness);
    const compClass = classify(m.compliance);

    // ملخص لكل فرع
    const branchSummary = branches.map(b => {
      const bs = branchScore(b.id);
      const cl = classify(bs.score);
      return `<tr><td>${esc(b.name)}</td><td>${bs.score}%</td>
        <td>${badge(cl.lbl,cl.cls)}</td>
        <td>${bs.openNCs}</td><td>${bs.certRate}%</td></tr>`;
    }).join('');

    const html = `
      <h1>${esc(db.meta.facilityName||'المنشأة')}</h1>
      <div class="header-meta">التقرير التنفيذي · ${nowAr()} · بيانات تجريبية Demo Data</div>
      <div class="disclaimer">⚠️ ${DISCLAIMER}</div>
      <h2>ملخص مؤشرات الأداء الرئيسية</h2>
      <div class="kpi-row">
        <div class="kpi-box"><div class="val" style="color:${m.readiness>=80?'#16a34a':m.readiness>=60?'#d97706':'#dc2626'}">${m.readiness}%</div><div class="lbl">مؤشر الجاهزية</div></div>
        <div class="kpi-box"><div class="val">${m.compliance}%</div><div class="lbl">امتثال GMP</div></div>
        <div class="kpi-box"><div class="val">${capaRate}%</div><div class="lbl">إغلاق CAPA</div></div>
        <div class="kpi-box"><div class="val">${openNCs.length}</div><div class="lbl">مخالفات مفتوحة</div></div>
        <div class="kpi-box"><div class="val">${criticalNCs.length}</div><div class="lbl">مخالفات حرجة</div></div>
        <div class="kpi-box"><div class="val">${m.expiredCards}</div><div class="lbl">شهادات منتهية</div></div>
      </div>
      <h2>تقييم الفروع</h2>
      ${branches.length ? `<table><thead><tr><th>الفرع</th><th>الدرجة</th><th>التصنيف</th><th>مخالفات مفتوحة</th><th>الشهادات الصحية</th></tr></thead><tbody>${branchSummary}</tbody></table>` : '<p>لا توجد فروع مسجّلة.</p>'}
      <h2>أبرز النتائج والتوصيات</h2>
      <table><thead><tr><th>المجال</th><th>الحالة</th><th>التوصية</th></tr></thead><tbody>
        <tr><td>الامتثال GMP</td><td>${m.compliance}% (${compClass.lbl})</td><td>${m.compliance<80?'مراجعة بنود عدم المطابقة وتفعيل الإجراءات التصحيحية':'الحفاظ على المستوى الحالي ومراجعة دورية'}</td></tr>
        <tr><td>المخالفات الحرجة</td><td>${criticalNCs.length} مخالفة حرجة مفتوحة</td><td>${criticalNCs.length?'إغلاق فوري للمخالفات الحرجة — تحتاج معالجة عاجلة':'ممتاز — لا توجد مخالفات حرجة مفتوحة'}</td></tr>
        <tr><td>الشهادات الصحية</td><td>${m.expiredCards} منتهية / ${m.expiringCards} تنتهي قريبًا</td><td>${m.expiredCards?'تجديد الشهادات المنتهية فورًا':'متابعة الشهادات القريبة من الانتهاء'}</td></tr>
        <tr><td>درجات الحرارة</td><td>${m.tempBreaches} مخالفة</td><td>${m.tempBreaches?'مراجعة معايرة الثلاجات وسجلات الحرارة':'سجلات الحرارة ضمن المعدل'}</td></tr>
      </tbody></table>`;

    return `
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <button class="btn-primary" onclick="printReport('rc-exec-print')">🖨️ طباعة / PDF</button>
        <button class="btn-secondary" onclick="Views._rcExportExecCSV()">📥 تصدير CSV</button>
      </div>
      <div class="card" id="rc-exec-print" style="padding:28px;max-width:900px">${html}</div>`;
  };

  Views._rcExportExecCSV = function () {
    const m = S.metrics();
    const db = S.load();
    const headers = ['المؤشر','القيمة'];
    const rows = [
      ['مؤشر الجاهزية', m.readiness+'%'],
      ['امتثال GMP', m.compliance+'%'],
      ['مخالفات مفتوحة', m.openNCs],
      ['مخالفات حرجة', m.criticalNCs],
      ['شهادات منتهية', m.expiredCards],
      ['مخالفات حرارة', m.tempBreaches],
      ['تنظيف متأخر', m.overdueCleaning],
    ];
    exportCSV(headers, rows, 'التقرير_التنفيذي_' + S.todayISO());
  };

  // ── TAB: تقييم الفروع ─────────────────────────────────────
  Views._rc_branch = function (db, m) {
    const branches = db.branches || [];
    if (!branches.length) return `<div class="card">${U.empty('لا توجد فروع مسجّلة — أضف فروعك أولاً','🏪')}</div>`;

    const cards = branches.map(b => {
      const bs = branchScore(b.id);
      const cl = classify(bs.score);
      const barColor = cl.cls === 'green' ? 'var(--green)' : cl.cls === 'amber' ? 'var(--amber)' : 'var(--red)';
      return `
        <div class="card" style="border-top:3px solid ${barColor};padding:20px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
            <div><h3 style="font-size:16px;font-weight:800">${esc(b.name)}</h3>
              ${b.city?`<small class="muted">${esc(b.city)}</small>`:''}
            </div>
            <div style="text-align:center">
              <div style="font-size:28px;font-weight:900;color:${barColor}">${bs.score}%</div>
              ${badge(cl.lbl,cl.cls)}
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px">
            <div>امتثال GMP <strong>${bs.complianceRate}%</strong>${scoreBar(bs.complianceRate,100)}</div>
            <div>إغلاق CAPA <strong>${bs.capaRate}%</strong>${scoreBar(bs.capaRate,100)}</div>
            <div>درجات الحرارة <strong>${bs.tempRate}%</strong>${scoreBar(bs.tempRate,100)}</div>
            <div>التنظيف <strong>${bs.cleanRate}%</strong>${scoreBar(bs.cleanRate,100)}</div>
            <div>مكافحة الآفات <strong>${bs.pestRate}%</strong>${scoreBar(bs.pestRate,100)}</div>
            <div>الشهادات الصحية <strong>${bs.certRate}%</strong>${scoreBar(bs.certRate,100)}</div>
          </div>
          <div style="display:flex;gap:14px;margin-top:12px;font-size:12px;border-top:1px solid var(--line);padding-top:10px">
            <span>مخالفات مفتوحة: <strong>${bs.openNCs}</strong></span>
            <span style="color:var(--red)">حرجة: <strong>${bs.criticalOpen}</strong></span>
            <span style="color:var(--amber)">CAPA متأخرة: <strong>${bs.overdueCapas}</strong></span>
          </div>
        </div>`;
    }).join('');

    const tableRows = branches.map(b => {
      const bs = branchScore(b.id);
      const cl = classify(bs.score);
      return [b.name, b.city||'', bs.score+'%', cl.lbl, bs.complianceRate+'%', bs.capaRate+'%', bs.openNCs, bs.criticalOpen];
    });

    return `
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <button class="btn-primary" onclick="printReport('rc-branch-print')">🖨️ طباعة</button>
        <button class="btn-secondary" onclick="Views._rcExportBranchCSV()">📥 CSV</button>
      </div>
      <div id="rc-branch-print">
        <div style="background:#fff;border:1.5px solid #fcd34d;border-radius:10px;padding:10px 16px;margin-bottom:16px;font-size:12px;color:#78350f">⚠️ ${DISCLAIMER}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px">${cards}</div>
      </div>`;
  };

  Views._rcExportBranchCSV = function () {
    const db = S.load();
    const headers = ['الفرع','المدينة','الدرجة','التصنيف','امتثال GMP','إغلاق CAPA','مخالفات مفتوحة','حرجة'];
    const rows = (db.branches||[]).map(b => {
      const bs = branchScore(b.id);
      const cl = classify(bs.score);
      return [b.name, b.city||'', bs.score+'%', cl.lbl, bs.complianceRate+'%', bs.capaRate+'%', bs.openNCs, bs.criticalOpen];
    });
    exportCSV(headers, rows, 'تقييم_الفروع_'+S.todayISO());
  };

  // ── TAB: HACCP ────────────────────────────────────────────
  Views._rc_haccp = function (db, m) {
    const haccp = db.haccp || [];
    const ccps = haccp.filter(h => h.isCCP);
    const oprps = haccp.filter(h => !h.isCCP);
    const meta = db.meta || {};

    const haccpRows = haccp.map(h => `<tr>
      <td>${esc(h.no||'')}</td>
      <td>${esc(h.step||'')}</td>
      <td>${esc(h.hazard||'')} <small class="muted">(${esc(h.hazardType||'')})</small></td>
      <td>${h.isCCP ? badge('CCP','red') : badge('OPRP','blue')}</td>
      <td style="font-size:11px">${esc(h.criticalLimit||'')}</td>
      <td style="font-size:11px">${esc(h.monitorWhat||'')} — ${esc(h.monitorHow||'')} — ${esc(h.monitorFreq||'')}</td>
      <td style="font-size:11px">${esc(h.corrective||'')}</td>
    </tr>`).join('');

    const productInfo = `
      <div class="card" style="margin-bottom:16px;padding:20px" id="rc-haccp-prod">
        <h2 style="font-size:16px;font-weight:800;margin-bottom:12px;color:var(--teal-dark)">بطاقة وصف المنتج / Product Description</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:13px">
          <div><strong>اسم المنشأة:</strong> ${esc(meta.facilityName||'')}</div>
          <div><strong>رخصة المزاولة:</strong> ${esc(meta.license||'')}</div>
          <div><strong>المدينة:</strong> ${esc(meta.city||'')}</div>
          <div><strong>تاريخ التقرير:</strong> ${nowAr()}</div>
          <div><strong>عدد CCP:</strong> ${ccps.length}</div>
          <div><strong>عدد OPRP:</strong> ${oprps.length}</div>
        </div>
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line);font-size:12px;background:#fffbeb;padding:10px;border-radius:8px;color:#78350f">
          ⚠️ ${DISCLAIMER}
        </div>
      </div>`;

    const planTable = haccp.length ? `
      <div class="card" id="rc-haccp-plan" style="padding:20px">
        <h2 style="font-size:16px;font-weight:800;margin-bottom:12px;color:var(--teal-dark)">خطة HACCP — تحليل المخاطر ونقاط التحكم</h2>
        <div class="table-wrap"><table>
          <thead><tr><th>الرقم</th><th>خطوة العملية</th><th>الخطر</th><th>النوع</th><th>الحد الحرج</th><th>المراقبة</th><th>الإجراء التصحيحي</th></tr></thead>
          <tbody>${haccpRows}</tbody>
        </table></div>
      </div>` : `<div class="card">${U.empty('لا توجد خطط HACCP مسجّلة','🛡️')}</div>`;

    return `
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <button class="btn-primary" onclick="printReport('rc-haccp-wrap')">🖨️ طباعة خطة HACCP</button>
        <button class="btn-secondary" onclick="Views._rcExportHaccpCSV()">📥 CSV</button>
      </div>
      <div id="rc-haccp-wrap">${productInfo}${planTable}</div>`;
  };

  Views._rcExportHaccpCSV = function () {
    const db = S.load();
    const headers = ['الرقم','الخطوة','الخطر','نوع الخطر','النوع','الحد الحرج','المراقبة','التكرار','المسؤول','الإجراء التصحيحي'];
    const rows = (db.haccp||[]).map(h => [h.no||'',h.step||'',h.hazard||'',h.hazardType||'',h.isCCP?'CCP':'OPRP',h.criticalLimit||'',h.monitorWhat||'',h.monitorFreq||'',h.monitorWho||'',h.corrective||'']);
    exportCSV(headers, rows, 'خطة_HACCP_'+S.todayISO());
  };

  // ── TAB: CCP / OPRP ───────────────────────────────────────
  Views._rc_ccp = function (db, m) {
    const haccp = db.haccp || [];
    const ccps = haccp.filter(h => h.isCCP);
    const oprps = haccp.filter(h => !h.isCCP);

    const ccpRows = ccps.map(h => `<tr>
      <td><strong>${esc(h.no||'')}</strong></td>
      <td>${esc(h.step||'')}</td>
      <td>${esc(h.hazard||'')}</td>
      <td style="font-size:11px">${esc(h.criticalLimit||'')}</td>
      <td style="font-size:11px">${esc(h.monitorWhat||'')} / ${esc(h.monitorHow||'')}</td>
      <td>${esc(h.monitorFreq||'')}</td>
      <td>${esc(h.monitorWho||'')}</td>
      <td style="font-size:11px">${esc(h.corrective||'')}</td>
      <td style="font-size:11px">${esc(h.verification||'')}</td>
    </tr>`).join('');

    const oprpRows = oprps.map(h => `<tr>
      <td><strong>${esc(h.no||'')}</strong></td>
      <td>${esc(h.step||'')}</td>
      <td>${esc(h.hazard||'')}</td>
      <td style="font-size:11px">${esc(h.criticalLimit||'')}</td>
      <td>${esc(h.monitorFreq||'')} / ${esc(h.monitorWho||'')}</td>
      <td style="font-size:11px">${esc(h.corrective||'')}</td>
    </tr>`).join('');

    return `
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <button class="btn-primary" onclick="printReport('rc-ccp-wrap')">🖨️ طباعة</button>
        <button class="btn-secondary" onclick="Views._rcExportHaccpCSV()">📥 CSV</button>
      </div>
      <div id="rc-ccp-wrap">
        <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;padding:10px 16px;margin-bottom:16px;font-size:12px;color:#78350f">⚠️ ${DISCLAIMER}</div>
        <div class="card" style="margin-bottom:16px;padding:20px">
          <h2 style="font-size:16px;font-weight:800;margin-bottom:12px;color:var(--teal-dark)">سجل نقاط التحكم الحرجة (CCP)</h2>
          ${ccps.length ? `<div class="table-wrap"><table>
            <thead><tr><th>CCP#</th><th>الخطوة</th><th>الخطر</th><th>الحد الحرج</th><th>المراقبة</th><th>التكرار</th><th>المسؤول</th><th>الإجراء التصحيحي</th><th>التحقق</th></tr></thead>
            <tbody>${ccpRows}</tbody>
          </table></div>` : `<p class="muted">لا توجد نقاط CCP محددة</p>`}
        </div>
        <div class="card" style="padding:20px">
          <h2 style="font-size:16px;font-weight:800;margin-bottom:12px;color:var(--teal-dark)">برنامج المتطلبات التشغيلية الأساسية (OPRP)</h2>
          ${oprps.length ? `<div class="table-wrap"><table>
            <thead><tr><th>OPRP#</th><th>الخطوة</th><th>الخطر</th><th>معيار التحكم</th><th>المراقبة</th><th>الإجراء التصحيحي</th></tr></thead>
            <tbody>${oprpRows}</tbody>
          </table></div>` : `<p class="muted">لا توجد OPRP محددة</p>`}
        </div>
      </div>`;
  };

  // ── TAB: GMP / GHP ────────────────────────────────────────
  Views._rc_gmp = function (db, m) {
    const inspections = db.inspections || [];
    const cleaning = db.cleaning || [];
    const pest = db.pest || [];

    const lastGmp = [...inspections].filter(i=>i.template==='gmp'||i.template==='premises'||i.template==='municipal')
      .sort((a,b)=>b.date.localeCompare(a.date))[0];
    const score = lastGmp ? S.inspectionScore(lastGmp) : 0;
    const cl = classify(score);

    // ملخص قسم بقسم
    let sectionRows = '';
    if (lastGmp) {
      sectionRows = (lastGmp.sections||[]).map(sec => {
        const yes = sec.items.filter(i=>i.result==='yes').length;
        const no = sec.items.filter(i=>i.result==='no').length;
        const na = sec.items.filter(i=>i.result==='na').length;
        const total = sec.items.filter(i=>i.result!=='na').length;
        const pct_ = total ? Math.round((yes/total)*100) : 100;
        return `<tr>
          <td>${esc(sec.title)}</td>
          <td style="color:var(--green)">✅ ${yes}</td>
          <td style="color:var(--red)">❌ ${no}</td>
          <td class="muted">— ${na}</td>
          <td><strong>${pct_}%</strong>${scoreBar(pct_,100)}</td>
        </tr>`;
      }).join('');
    }

    const cleanRows = cleaning.slice(0,10).map(c => `<tr>
      <td>${esc(c.area||'')}</td>
      <td>${esc(c.task||'')}</td>
      <td>${esc(c.freq||'')}</td>
      <td>${esc(c.responsible||'')}</td>
      <td>${esc(c.lastDone||'—')}</td>
      <td>${c.status==='منجز'?badge('منجز','green'):badge('متأخر','red')}</td>
    </tr>`).join('');

    const pestRows = pest.slice(0,10).map(p => `<tr>
      <td>${esc(p.date||'')}</td>
      <td>${esc(p.company||'')}</td>
      <td>${esc(p.type||'')}</td>
      <td>${esc(p.area||'')}</td>
      <td>${p.result==='سليم'?badge('سليم','green'):badge(esc(p.result||''),'red')}</td>
      <td>${esc(p.nextDue||'')}</td>
    </tr>`).join('');

    return `
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <button class="btn-primary" onclick="printReport('rc-gmp-wrap')">🖨️ طباعة</button>
        <button class="btn-secondary" onclick="Views._rcExportGmpCSV()">📥 CSV</button>
      </div>
      <div id="rc-gmp-wrap">
        <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;padding:10px 16px;margin-bottom:16px;font-size:12px;color:#78350f">⚠️ ${DISCLAIMER}</div>
        <div class="cols-3" style="gap:14px;margin-bottom:16px">
          <div class="card kpi" style="border-top:3px solid ${cl.cls==='green'?'var(--green)':cl.cls==='amber'?'var(--amber)':'var(--red)'}">
            <div class="kpi-label">درجة امتثال GMP</div>
            <div class="kpi-value">${score}%</div>
            <div class="kpi-sub">${badge(cl.lbl,cl.cls)}</div>
          </div>
          <div class="card kpi"><div class="kpi-label">مهام تنظيف متأخرة</div>
            <div class="kpi-value" style="color:${m.overdueCleaning?'var(--red)':'var(--green)'}">${m.overdueCleaning}</div>
          </div>
          <div class="card kpi"><div class="kpi-label">آخر تفتيش GMP</div>
            <div class="kpi-value" style="font-size:16px">${lastGmp?lastGmp.date:'—'}</div>
          </div>
        </div>
        ${lastGmp ? `<div class="card" style="margin-bottom:16px;padding:20px">
          <h2 style="font-size:16px;font-weight:800;margin-bottom:12px;color:var(--teal-dark)">نتائج التفتيش قسم بقسم</h2>
          <p class="muted" style="font-size:12px;margin-bottom:10px">التفتيش: ${esc(lastGmp.templateName||'')} — ${lastGmp.date}</p>
          <div class="table-wrap"><table>
            <thead><tr><th>القسم</th><th>مطابق</th><th>غير مطابق</th><th>لا ينطبق</th><th>النسبة</th></tr></thead>
            <tbody>${sectionRows}</tbody>
          </table></div>
        </div>` : ''}
        ${cleaning.length ? `<div class="card" style="margin-bottom:16px;padding:20px">
          <h2 style="font-size:16px;font-weight:800;margin-bottom:12px;color:var(--teal-dark)">سجل التنظيف (آخر 10)</h2>
          <div class="table-wrap"><table>
            <thead><tr><th>المنطقة</th><th>المهمة</th><th>التكرار</th><th>المسؤول</th><th>آخر تنفيذ</th><th>الحالة</th></tr></thead>
            <tbody>${cleanRows}</tbody>
          </table></div>
        </div>` : ''}
        ${pest.length ? `<div class="card" style="padding:20px">
          <h2 style="font-size:16px;font-weight:800;margin-bottom:12px;color:var(--teal-dark)">سجل مكافحة الآفات (آخر 10)</h2>
          <div class="table-wrap"><table>
            <thead><tr><th>التاريخ</th><th>الشركة</th><th>نوع المعالجة</th><th>المنطقة</th><th>النتيجة</th><th>الموعد القادم</th></tr></thead>
            <tbody>${pestRows}</tbody>
          </table></div>
        </div>` : ''}
      </div>`;
  };

  Views._rcExportGmpCSV = function () {
    const db = S.load();
    const inspections = db.inspections || [];
    const lastGmp = [...inspections].sort((a,b)=>b.date.localeCompare(a.date))[0];
    if (!lastGmp) { U.toast('لا توجد بيانات تفتيش للتصدير','err'); return; }
    const headers = ['القسم','البند','النتيجة','ملاحظة'];
    const rows = [];
    (lastGmp.sections||[]).forEach(sec => {
      sec.items.forEach(it => rows.push([sec.title, it.text, it.result==='yes'?'مطابق':it.result==='no'?'غير مطابق':'لا ينطبق', it.note||'']));
    });
    exportCSV(headers, rows, 'تقرير_GMP_'+S.todayISO());
  };

  // ── TAB: CAPA ─────────────────────────────────────────────
  Views._rc_capa = function (db, m) {
    const ncs = db.ncs || [];
    const openNCs = ncs.filter(n => n.status !== 'مغلقة');
    const closedNCs = ncs.filter(n => n.status === 'مغلقة');
    const criticalNCs = ncs.filter(n => n.severity === 'حرجة');
    const overdueNCs = openNCs.filter(n => n.dueDate && S.daysFromToday(n.dueDate) < 0);
    const capaRate = ncs.length ? pct(closedNCs.length, ncs.length) : 100;

    const statusCount = {};
    ncs.forEach(n => { statusCount[n.status] = (statusCount[n.status]||0)+1; });

    const ncRows = ncs.slice(0,30).map(n => {
      const overdue = n.status !== 'مغلقة' && n.dueDate && S.daysFromToday(n.dueDate) < 0;
      return `<tr style="${overdue?'background:#fff5f5':''}">
        <td>${esc(n.date||'')}</td>
        <td>${esc(n.area||'')}</td>
        <td>${esc(n.description||'').slice(0,60)}${(n.description||'').length>60?'…':''}</td>
        <td>${n.severity==='حرجة'?badge('حرجة','red'):n.severity==='رئيسية'?badge('رئيسية','amber'):badge('ثانوية','gray')}</td>
        <td>${esc(n.status||'')}</td>
        <td>${n.dueDate||'—'} ${overdue?'⏰':''}</td>
        <td style="font-size:11px">${esc(n.rootCause||'—').slice(0,40)}</td>
      </tr>`;
    }).join('');

    return `
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <button class="btn-primary" onclick="printReport('rc-capa-wrap')">🖨️ طباعة</button>
        <button class="btn-secondary" onclick="Views._rcExportCapaCSV()">📥 CSV</button>
      </div>
      <div id="rc-capa-wrap">
        <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;padding:10px 16px;margin-bottom:16px;font-size:12px;color:#78350f">⚠️ ${DISCLAIMER}</div>
        <div class="cols-4" style="gap:14px;margin-bottom:16px">
          <div class="card kpi"><div class="kpi-label">إجمالي CAPA</div><div class="kpi-value">${ncs.length}</div></div>
          <div class="card kpi"><div class="kpi-label">مفتوحة</div><div class="kpi-value" style="color:var(--amber)">${openNCs.length}</div></div>
          <div class="card kpi"><div class="kpi-label">مغلقة</div><div class="kpi-value" style="color:var(--green)">${closedNCs.length}</div></div>
          <div class="card kpi"><div class="kpi-label">معدل الإغلاق</div><div class="kpi-value">${capaRate}%</div></div>
          <div class="card kpi"><div class="kpi-label">حرجة</div><div class="kpi-value" style="color:var(--red)">${criticalNCs.length}</div></div>
          <div class="card kpi"><div class="kpi-label">متأخرة</div><div class="kpi-value" style="color:var(--red)">${overdueNCs.length}</div></div>
        </div>
        <div class="card" style="margin-bottom:16px;padding:20px">
          <h2 style="font-size:15px;font-weight:800;margin-bottom:12px;color:var(--teal-dark)">توزيع الحالات حسب الوضع</h2>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${Object.entries(statusCount).map(([s,c])=>`<span style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:6px 14px;font-size:13px"><strong>${c}</strong> ${esc(s)}</span>`).join('')}
          </div>
        </div>
        ${ncs.length ? `<div class="card" style="padding:20px">
          <h2 style="font-size:15px;font-weight:800;margin-bottom:12px;color:var(--teal-dark)">قائمة المخالفات وإجراءات CAPA (آخر 30)</h2>
          <div class="table-wrap"><table>
            <thead><tr><th>التاريخ</th><th>المنطقة</th><th>الوصف</th><th>الخطورة</th><th>الحالة</th><th>تاريخ الإغلاق</th><th>السبب الجذري</th></tr></thead>
            <tbody>${ncRows}</tbody>
          </table></div>
        </div>` : `<div class="card">${U.empty('لا توجد مخالفات مسجّلة','✅')}</div>`}
      </div>`;
  };

  Views._rcExportCapaCSV = function () {
    const db = S.load();
    const headers = ['التاريخ','المنطقة','الوصف','الخطورة','الحالة','تاريخ الإغلاق','المسبب','الإجراء التصحيحي','السبب الجذري'];
    const rows = (db.ncs||[]).map(n=>[n.date||'',n.area||'',n.description||'',n.severity||'',n.status||'',n.dueDate||'',n.assignedTo||'',n.corrective||'',n.rootCause||'']);
    exportCSV(headers, rows, 'تقرير_CAPA_'+S.todayISO());
  };

  // ── TAB: السجلات التشغيلية ────────────────────────────────
  Views._rc_oplogs = function (db, m) {
    const tempLogs = db.tempLogs || [];
    const recent = tempLogs.slice(0,20);
    const breaches = tempLogs.filter(t=>t.status==='مخالف');
    const ok = tempLogs.filter(t=>t.status!=='مخالف');

    const tempRows = recent.map(t => `<tr style="${t.status==='مخالف'?'background:#fff5f5':''}">
      <td>${esc(t.date||'')}</td>
      <td>${esc(t.time||'')}</td>
      <td>${esc(t.location||'')}</td>
      <td>${esc(t.unit||'')}</td>
      <td><strong>${t.temp!=null?t.temp+'°م':'—'}</strong></td>
      <td>${t.minTemp!=null?t.minTemp+'°م':'—'} — ${t.maxTemp!=null?t.maxTemp+'°م':'—'}</td>
      <td>${t.status==='مخالف'?badge('مخالف','red'):badge('مطابق','green')}</td>
      <td style="font-size:11px">${esc(t.corrective||'—')}</td>
    </tr>`).join('');

    return `
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <button class="btn-primary" onclick="printReport('rc-oplogs-wrap')">🖨️ طباعة</button>
        <button class="btn-secondary" onclick="Views._rcExportTempCSV()">📥 تصدير سجل الحرارة CSV</button>
      </div>
      <div id="rc-oplogs-wrap">
        <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;padding:10px 16px;margin-bottom:16px;font-size:12px;color:#78350f">⚠️ ${DISCLAIMER}</div>
        <div class="cols-3" style="gap:14px;margin-bottom:16px">
          <div class="card kpi"><div class="kpi-label">إجمالي سجلات الحرارة</div><div class="kpi-value">${tempLogs.length}</div></div>
          <div class="card kpi"><div class="kpi-label">مخالفات حرارية</div><div class="kpi-value" style="color:var(--red)">${breaches.length}</div></div>
          <div class="card kpi"><div class="kpi-label">نسبة الامتثال</div><div class="kpi-value" style="color:var(--green)">${tempLogs.length?pct(ok.length,tempLogs.length):100}%</div></div>
        </div>
        ${tempLogs.length ? `<div class="card" style="padding:20px">
          <h2 style="font-size:15px;font-weight:800;margin-bottom:12px;color:var(--teal-dark)">سجل درجات الحرارة (آخر 20 قراءة)</h2>
          <div class="table-wrap"><table>
            <thead><tr><th>التاريخ</th><th>الوقت</th><th>الموقع</th><th>الوحدة</th><th>القراءة</th><th>النطاق المسموح</th><th>الحالة</th><th>الإجراء</th></tr></thead>
            <tbody>${tempRows}</tbody>
          </table></div>
        </div>` : `<div class="card">${U.empty('لا توجد سجلات حرارة','🌡️')}</div>`}
      </div>`;
  };

  Views._rcExportTempCSV = function () {
    const db = S.load();
    const headers = ['التاريخ','الوقت','الموقع','الوحدة','القراءة','الحد الأدنى','الحد الأقصى','الحالة','الإجراء التصحيحي','المسجّل'];
    const rows = (db.tempLogs||[]).map(t=>[t.date||'',t.time||'',t.location||'',t.unit||'',t.temp!=null?t.temp:'',t.minTemp!=null?t.minTemp:'',t.maxTemp!=null?t.maxTemp:'',t.status||'',t.corrective||'',t.by||'']);
    exportCSV(headers, rows, 'سجل_الحرارة_'+S.todayISO());
  };

  // ── TAB: الموردون والتتبع ─────────────────────────────────
  Views._rc_suppliers = function (db, m) {
    const suppliers = db.suppliers || [];
    const batches = db.batches || [];
    const approved = suppliers.filter(s=>s.status==='معتمد');
    const pending = suppliers.filter(s=>s.status!=='معتمد');

    const supRows = suppliers.slice(0,20).map(s => `<tr>
      <td>${esc(s.name||'')}</td>
      <td>${esc(s.category||'')}</td>
      <td>${s.status==='معتمد'?badge('معتمد','green'):badge(esc(s.status||'معلّق'),'amber')}</td>
      <td>${esc(s.contactName||'')}</td>
      <td>${esc(s.phone||'')}</td>
      <td>${esc(s.lastAudit||'—')}</td>
      <td>${esc(s.nextAudit||'—')}</td>
    </tr>`).join('');

    const batchRows = batches.slice(0,15).map(b => {
      const expired = S.daysFromToday(b.expiry) < 0;
      return `<tr style="${expired?'background:#fff5f5':''}">
        <td>${esc(b.lotNo||'')}</td>
        <td>${esc(b.product||'')}</td>
        <td>${esc(b.supplier||'')}</td>
        <td>${esc(b.receivedDate||'')}</td>
        <td>${esc(b.qty||'')} ${esc(b.unit||'')}</td>
        <td>${esc(b.expiry||'')} ${expired?'⚠️':''}</td>
        <td>${esc(b.storage||'')}</td>
        <td>${b.status==='مسحوب'?badge('مسحوب','red'):b.status==='في المخزون'?badge('في المخزون','green'):badge(esc(b.status||''),'blue')}</td>
      </tr>`;
    }).join('');

    return `
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <button class="btn-primary" onclick="printReport('rc-sup-wrap')">🖨️ طباعة</button>
        <button class="btn-secondary" onclick="Views._rcExportSuppliersCSV()">📥 موردون CSV</button>
        <button class="btn-secondary" onclick="Views._rcExportBatchesCSV()">📥 دفعات CSV</button>
      </div>
      <div id="rc-sup-wrap">
        <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;padding:10px 16px;margin-bottom:16px;font-size:12px;color:#78350f">⚠️ ${DISCLAIMER}</div>
        <div class="cols-3" style="gap:14px;margin-bottom:16px">
          <div class="card kpi"><div class="kpi-label">إجمالي الموردون</div><div class="kpi-value">${suppliers.length}</div></div>
          <div class="card kpi"><div class="kpi-label">معتمدون</div><div class="kpi-value" style="color:var(--green)">${approved.length}</div></div>
          <div class="card kpi"><div class="kpi-label">دفعات منتهية</div><div class="kpi-value" style="color:var(--red)">${m.expiredBatches}</div></div>
        </div>
        ${suppliers.length ? `<div class="card" style="margin-bottom:16px;padding:20px">
          <h2 style="font-size:15px;font-weight:800;margin-bottom:12px;color:var(--teal-dark)">سجل الموردون المعتمدون (آخر 20)</h2>
          <div class="table-wrap"><table>
            <thead><tr><th>المورد</th><th>الفئة</th><th>الحالة</th><th>المسؤول</th><th>الهاتف</th><th>آخر تدقيق</th><th>التدقيق القادم</th></tr></thead>
            <tbody>${supRows}</tbody>
          </table></div>
        </div>` : ''}
        ${batches.length ? `<div class="card" style="padding:20px">
          <h2 style="font-size:15px;font-weight:800;margin-bottom:12px;color:var(--teal-dark)">سجل تتبع الدفعات (آخر 15)</h2>
          <div class="table-wrap"><table>
            <thead><tr><th>رقم الدفعة</th><th>المنتج</th><th>المورد</th><th>تاريخ الاستلام</th><th>الكمية</th><th>الصلاحية</th><th>التخزين</th><th>الحالة</th></tr></thead>
            <tbody>${batchRows}</tbody>
          </table></div>
        </div>` : ''}
      </div>`;
  };

  Views._rcExportSuppliersCSV = function () {
    const db = S.load();
    const headers = ['المورد','الفئة','الحالة','المسؤول','الهاتف','البريد','آخر تدقيق','التدقيق القادم'];
    const rows = (db.suppliers||[]).map(s=>[s.name||'',s.category||'',s.status||'',s.contactName||'',s.phone||'',s.email||'',s.lastAudit||'',s.nextAudit||'']);
    exportCSV(headers, rows, 'الموردون_'+S.todayISO());
  };

  Views._rcExportBatchesCSV = function () {
    const db = S.load();
    const headers = ['رقم الدفعة','المنتج','المورد','تاريخ الاستلام','الكمية','الوحدة','الصلاحية','التخزين','الحالة'];
    const rows = (db.batches||[]).map(b=>[b.lotNo||'',b.product||'',b.supplier||'',b.receivedDate||'',b.qty||'',b.unit||'',b.expiry||'',b.storage||'',b.status||'']);
    exportCSV(headers, rows, 'الدفعات_'+S.todayISO());
  };

  // ── TAB: التدريب والشهادات ────────────────────────────────
  Views._rc_training = function (db, m) {
    const employees = db.employees || [];
    const expired = employees.filter(e => S.daysFromToday(e.healthCardExpiry) < 0);
    const expiringSoon = employees.filter(e => { const d = S.daysFromToday(e.healthCardExpiry); return d >= 0 && d <= 30; });
    const valid = employees.filter(e => S.daysFromToday(e.healthCardExpiry) > 30);

    const empRows = employees.map(e => {
      const days = S.daysFromToday(e.healthCardExpiry);
      const isExp = days < 0;
      const isSoon = days >= 0 && days <= 30;
      return `<tr style="${isExp?'background:#fff5f5':isSoon?'background:#fffbeb':''}">
        <td>${esc(e.name||'')}</td>
        <td>${esc(e.role||'')}</td>
        <td>${esc(e.branch||'')}</td>
        <td>${esc(e.healthCardExpiry||'')}</td>
        <td>${isExp?badge('منتهية','red'):isSoon?badge('تنتهي قريبًا','amber'):badge('سارية','green')}</td>
        <td class="muted" style="font-size:12px">${isExp?`منذ ${Math.abs(days)} يوم`:isSoon?`${days} يوم متبقي`:'صالحة'}</td>
      </tr>`;
    }).join('');

    return `
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <button class="btn-primary" onclick="printReport('rc-training-wrap')">🖨️ طباعة</button>
        <button class="btn-secondary" onclick="Views._rcExportTrainingCSV()">📥 CSV</button>
      </div>
      <div id="rc-training-wrap">
        <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;padding:10px 16px;margin-bottom:16px;font-size:12px;color:#78350f">⚠️ ${DISCLAIMER}</div>
        <div class="cols-3" style="gap:14px;margin-bottom:16px">
          <div class="card kpi"><div class="kpi-label">إجمالي العاملون</div><div class="kpi-value">${employees.length}</div></div>
          <div class="card kpi"><div class="kpi-label">شهادات منتهية</div><div class="kpi-value" style="color:var(--red)">${expired.length}</div></div>
          <div class="card kpi"><div class="kpi-label">تنتهي خلال 30 يوم</div><div class="kpi-value" style="color:var(--amber)">${expiringSoon.length}</div></div>
        </div>
        ${employees.length ? `<div class="card" style="padding:20px">
          <h2 style="font-size:15px;font-weight:800;margin-bottom:12px;color:var(--teal-dark)">سجل الشهادات الصحية للعاملين</h2>
          <div class="table-wrap"><table>
            <thead><tr><th>الاسم</th><th>المنصب</th><th>الفرع</th><th>تاريخ الانتهاء</th><th>الحالة</th><th>ملاحظة</th></tr></thead>
            <tbody>${empRows}</tbody>
          </table></div>
        </div>` : `<div class="card">${U.empty('لا يوجد عاملون مسجّلون','👥')}</div>`}
      </div>`;
  };

  Views._rcExportTrainingCSV = function () {
    const db = S.load();
    const headers = ['الاسم','المنصب','الفرع','تاريخ انتهاء الشهادة الصحية','الحالة'];
    const rows = (db.employees||[]).map(e => {
      const d = S.daysFromToday(e.healthCardExpiry);
      return [e.name||'',e.role||'',e.branch||'',e.healthCardExpiry||'',d<0?'منتهية':d<=30?'تنتهي قريبًا':'سارية'];
    });
    exportCSV(headers, rows, 'الشهادات_الصحية_'+S.todayISO());
  };

  // ── TAB: تقارير التفتيش ───────────────────────────────────
  Views._rc_inspections = function (db, m) {
    const inspections = db.inspections || [];
    const sorted = [...inspections].sort((a,b)=>b.date.localeCompare(a.date));

    const inspRows = sorted.slice(0,15).map(insp => {
      const score = S.inspectionScore(insp);
      const cl = classify(score);
      return `<tr>
        <td>${esc(insp.date||'')}</td>
        <td>${esc(insp.templateName||insp.template||'')}</td>
        <td>${esc(insp.by||'')}</td>
        <td><strong>${score}%</strong>${scoreBar(score,100)}</td>
        <td>${badge(cl.lbl,cl.cls)}</td>
        <td>${esc(insp.status||'')}</td>
        <td><button class="btn-secondary btn-sm" onclick="Views._rcPrintInspection('${insp.id}')">🖨️ طباعة</button></td>
      </tr>`;
    }).join('');

    return `
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <button class="btn-secondary" onclick="Views._rcExportInspCSV()">📥 CSV</button>
      </div>
      <div class="cols-3" style="gap:14px;margin-bottom:16px">
        <div class="card kpi"><div class="kpi-label">إجمالي جلسات التفتيش</div><div class="kpi-value">${inspections.length}</div></div>
        <div class="card kpi"><div class="kpi-label">آخر درجة امتثال</div><div class="kpi-value">${m.compliance}%</div></div>
        <div class="card kpi"><div class="kpi-label">آخر تفتيش</div><div class="kpi-value" style="font-size:15px">${m.lastInsp?m.lastInsp.date:'—'}</div></div>
      </div>
      ${inspections.length ? `<div class="card" style="padding:20px">
        <h2 style="font-size:15px;font-weight:800;margin-bottom:12px;color:var(--teal-dark)">سجل جلسات التفتيش (آخر 15)</h2>
        <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:8px;padding:8px 14px;margin-bottom:12px;font-size:12px;color:#78350f">⚠️ ${DISCLAIMER}</div>
        <div class="table-wrap"><table>
          <thead><tr><th>التاريخ</th><th>قائمة التفتيش</th><th>المفتش</th><th>الدرجة</th><th>التصنيف</th><th>الحالة</th><th></th></tr></thead>
          <tbody>${inspRows}</tbody>
        </table></div>
      </div>` : `<div class="card">${U.empty('لا توجد جلسات تفتيش مسجّلة','📋')}</div>`}`;
  };

  Views._rcPrintInspection = function (id) {
    const db = S.load();
    const insp = (db.inspections||[]).find(i=>i.id===id);
    if (!insp) return;
    const score = S.inspectionScore(insp);
    const cl = classify(score);

    const secHtml = (insp.sections||[]).map(sec => {
      const rows = sec.items.map(it => `<tr>
        <td>${esc(it.text)}</td>
        <td style="color:${it.result==='yes'?'#16a34a':it.result==='no'?'#dc2626':'#6b7280'};font-weight:700">${it.result==='yes'?'✅ مطابق':it.result==='no'?'❌ مخالف':'— لا ينطبق'}</td>
        <td>${esc(it.note||'')}</td>
      </tr>`).join('');
      return `<h3>${esc(sec.title)}</h3><table><thead><tr><th>البند</th><th>النتيجة</th><th>ملاحظة</th></tr></thead><tbody>${rows}</tbody></table>`;
    }).join('');

    const html = `<h1>تقرير التفتيش الذاتي</h1>
      <div class="header-meta">التاريخ: ${esc(insp.date)} · المفتش: ${esc(insp.by||'—')} · القائمة: ${esc(insp.templateName||insp.template)}</div>
      <div class="kpi-row">
        <div class="kpi-box"><div class="val" style="color:${cl.cls==='green'?'#16a34a':cl.cls==='amber'?'#d97706':'#dc2626'}">${score}%</div><div class="lbl">درجة الامتثال</div></div>
        <div class="kpi-box"><div class="val">${cl.lbl}</div><div class="lbl">التصنيف</div></div>
      </div>
      <div class="disclaimer">⚠️ ${DISCLAIMER}</div>
      ${secHtml}`;

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head>
      <meta charset="UTF-8"><title>تقرير التفتيش</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Cairo',sans-serif;font-size:13px;color:#0f172a;direction:rtl;padding:20mm}
        h1{font-size:22px;font-weight:900;margin-bottom:6px}
        h3{font-size:13px;font-weight:700;margin:14px 0 6px;color:#115e59}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px}
        th,td{border:1px solid #e2e8f0;padding:5px 9px;text-align:right}
        th{background:#f8fafc;font-weight:700}
        .disclaimer{background:#fffbeb;border:1.5px solid #fcd34d;border-radius:8px;padding:8px 14px;font-size:11px;color:#78350f;margin:12px 0}
        .kpi-row{display:flex;gap:10px;margin:10px 0}
        .kpi-box{border:1px solid #e2e8f0;border-radius:8px;padding:8px 14px}
        .kpi-box .val{font-size:20px;font-weight:900}.kpi-box .lbl{font-size:11px;color:#6b7280}
        .header-meta{font-size:11px;color:#6b7280;margin-bottom:12px}
        @page{size:A4;margin:18mm}
        @media print{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      </style></head><body>${html}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(()=>{w.print();w.close();},400);
  };

  Views._rcExportInspCSV = function () {
    const db = S.load();
    const headers = ['التاريخ','القائمة','المفتش','الدرجة','التصنيف','الحالة'];
    const rows = (db.inspections||[]).map(i => {
      const sc = S.inspectionScore(i);
      return [i.date||'',i.templateName||i.template||'',i.by||'',sc+'%',classify(sc).lbl,i.status||''];
    });
    exportCSV(headers, rows, 'جلسات_التفتيش_'+S.todayISO());
  };

  // ── TAB: النماذج القابلة للطباعة ─────────────────────────
  Views._rc_forms = function (db, m) {
    const meta = db.meta || {};
    const forms = [
      { id:'f-temp-log',    title:'نموذج سجل درجات الحرارة اليومي', desc:'جدول يومي لتسجيل قراءات درجات الحرارة في الثلاجات والمجمدات', icon:'🌡️' },
      { id:'f-cleaning',    title:'نموذج جدول التنظيف والتعقيم', desc:'قائمة مهام التنظيف اليومية والأسبوعية والشهرية', icon:'🧹' },
      { id:'f-pest',        title:'نموذج زيارة مكافحة الآفات', desc:'توثيق زيارة شركة مكافحة الحشرات والقوارض', icon:'🐛' },
      { id:'f-receiving',   title:'نموذج استلام البضائع', desc:'فحص وتوثيق استلام المواد الغذائية من الموردين', icon:'📦' },
      { id:'f-capa',        title:'نموذج الإجراء التصحيحي (CAPA)', desc:'توثيق المخالفة والسبب الجذري والإجراء التصحيحي', icon:'⚠️' },
      { id:'f-health-cert', title:'سجل الشهادات الصحية للعاملين', desc:'قائمة بأسماء العاملين وتواريخ انتهاء شهاداتهم الصحية', icon:'👤' },
      { id:'f-supplier-eval',title:'نموذج تقييم المورد', desc:'تقييم أداء وجودة الموردين', icon:'🚚' },
      { id:'f-haccp-sum',   title:'ملخص خطة HACCP', desc:'جدول موجز بنقاط التحكم الحرجة والحدود والمراقبة', icon:'🛡️' },
      { id:'f-audit-ready', title:'قائمة التحضير للتفتيش الرسمي', desc:'قائمة مراجعة شاملة قبل زيارة المفتش الرسمي', icon:'📋' },
      { id:'f-thaw-log',    title:'نموذج سجل إذابة التجميد', desc:'توثيق عمليات إذابة المنتجات المجمدة', icon:'🧊' },
      { id:'f-label',       title:'نموذج بطاقة تسمية الغذاء', desc:'بطاقة المنتج تتضمن التاريخ ووقت الإعداد والصلاحية', icon:'🏷️' },
      { id:'f-oil-change',  title:'نموذج تتبع تغيير زيت القلي', desc:'سجل تغيير وفحص جودة زيت القلي', icon:'🫙' },
    ];

    const cards = forms.map(f => `
      <div class="card" style="padding:18px;display:flex;flex-direction:column;gap:10px">
        <div style="font-size:28px">${f.icon}</div>
        <div>
          <h3 style="font-size:14px;font-weight:800;margin-bottom:4px">${f.title}</h3>
          <p class="muted" style="font-size:12px">${f.desc}</p>
        </div>
        <button class="btn-primary" style="margin-top:auto" onclick="Views._rcPrintForm('${f.id}')">🖨️ طباعة النموذج</button>
      </div>`).join('');

    return `
      <div class="card" style="margin-bottom:16px;padding:14px 18px;background:#f0fdf4;border-color:#86efac">
        <strong>النماذج القابلة للطباعة — A4</strong>
        <p class="muted" style="font-size:12px;margin-top:4px">كل نموذج يُفتح في نافذة جديدة جاهز للطباعة مباشرة أو التصدير كـ PDF من المتصفح. البيانات المملوءة مسبقًا تأتي من بيانات المنشأة في النظام.</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">${cards}</div>`;
  };

  Views._rcPrintForm = function (formId) {
    const db = S.load();
    const meta = db.meta || {};
    const facility = esc(meta.facilityName||'المنشأة');
    const today = new Date().toLocaleDateString('ar-SA');
    const headerHtml = `<div style="border-bottom:2px solid #0f766e;padding-bottom:12px;margin-bottom:16px">
      <h1 style="font-size:18px;font-weight:900">${facility}</h1>
      <p style="font-size:12px;color:#6b7280">تاريخ التقرير: ${today} · بيانات تجريبية Demo Data</p>
      <p style="font-size:11px;color:#78350f;background:#fffbeb;padding:6px 10px;border-radius:6px;margin-top:8px">⚠️ ${DISCLAIMER}</p>
    </div>`;

    const forms = {
      'f-temp-log': `${headerHtml}<h2 style="font-size:16px;font-weight:800;margin-bottom:12px">نموذج سجل درجات الحرارة اليومي</h2>
        <p style="font-size:12px;margin-bottom:10px">الوحدة: _____________ التاريخ: _____________ المسؤول: _____________</p>
        <table><thead><tr><th>الوقت</th><th>الثلاجة/المجمد</th><th>الموقع</th><th>درجة الحرارة</th><th>الحد المسموح</th><th>الحالة</th><th>الإجراء</th><th>التوقيع</th></tr></thead>
        <tbody>${Array(12).fill('<tr><td style="height:28px"></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('')}</tbody></table>`,

      'f-cleaning': `${headerHtml}<h2 style="font-size:16px;font-weight:800;margin-bottom:12px">نموذج جدول التنظيف والتعقيم</h2>
        <table><thead><tr><th>المنطقة/الجهاز</th><th>طريقة التنظيف</th><th>مواد التنظيف</th><th>التكرار</th><th>المنجز</th><th>التوقيع</th><th>ملاحظات</th></tr></thead>
        <tbody>${Array(15).fill('<tr><td style="height:28px"></td><td></td><td></td><td></td><td style="text-align:center">☐</td><td></td><td></td></tr>').join('')}</tbody></table>`,

      'f-pest': `${headerHtml}<h2 style="font-size:16px;font-weight:800;margin-bottom:12px">نموذج زيارة مكافحة الآفات</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;margin-bottom:14px">
          <p>اسم الشركة: _______________________</p><p>تاريخ الزيارة: _______________________</p>
          <p>اسم الفني: _______________________</p><p>رقم الترخيص: _______________________</p>
          <p>نوع المعالجة: _______________________</p><p>الموعد القادم: _______________________</p>
        </div>
        <table><thead><tr><th>المنطقة</th><th>نوع الآفة</th><th>مستوى الإصابة</th><th>المادة المستخدمة</th><th>الكمية</th><th>النتيجة</th></tr></thead>
        <tbody>${Array(8).fill('<tr><td style="height:30px"></td><td></td><td></td><td></td><td></td><td></td></tr>').join('')}</tbody></table>
        <p style="margin-top:14px;font-size:12px">توقيع الفني: _____________________ توقيع المشرف: _____________________</p>`,

      'f-receiving': `${headerHtml}<h2 style="font-size:16px;font-weight:800;margin-bottom:12px">نموذج استلام البضائع</h2>
        <p style="font-size:12px;margin-bottom:10px">المورد: _____________ التاريخ: _____________ المستلم: _____________</p>
        <table><thead><tr><th>المنتج</th><th>رقم الدفعة</th><th>الكمية</th><th>تاريخ الصلاحية</th><th>درجة الحرارة</th><th>حالة التغليف</th><th>القبول/الرفض</th><th>ملاحظات</th></tr></thead>
        <tbody>${Array(10).fill('<tr><td style="height:30px"></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('')}</tbody></table>`,

      'f-capa': `${headerHtml}<h2 style="font-size:16px;font-weight:800;margin-bottom:12px">نموذج الإجراء التصحيحي والوقائي (CAPA)</h2>
        <div style="font-size:13px">
          <p style="margin-bottom:8px"><strong>رقم CAPA:</strong> _____ <strong>التاريخ:</strong> _____ <strong>الفرع:</strong> _____</p>
          <p style="margin-bottom:8px"><strong>وصف المخالفة:</strong></p>
          <div style="border:1px solid #e2e8f0;border-radius:6px;height:60px;margin-bottom:10px"></div>
          <p style="margin-bottom:8px"><strong>الخطورة:</strong> ☐ حرجة  ☐ رئيسية  ☐ ثانوية</p>
          <p style="margin-bottom:8px"><strong>السبب الجذري:</strong></p>
          <div style="border:1px solid #e2e8f0;border-radius:6px;height:60px;margin-bottom:10px"></div>
          <p style="margin-bottom:8px"><strong>الإجراء التصحيحي:</strong></p>
          <div style="border:1px solid #e2e8f0;border-radius:6px;height:60px;margin-bottom:10px"></div>
          <p style="margin-bottom:8px"><strong>الإجراء الوقائي:</strong></p>
          <div style="border:1px solid #e2e8f0;border-radius:6px;height:60px;margin-bottom:10px"></div>
          <p><strong>المسؤول:</strong> _____________________ <strong>موعد الإغلاق:</strong> _____ <strong>توقيع المدير:</strong> _____</p>
        </div>`,

      'f-health-cert': `${headerHtml}<h2 style="font-size:16px;font-weight:800;margin-bottom:12px">سجل الشهادات الصحية للعاملين</h2>
        <table><thead><tr><th>#</th><th>اسم العامل</th><th>المنصب</th><th>الفرع</th><th>تاريخ الانتهاء</th><th>الحالة</th><th>ملاحظات</th></tr></thead>
        <tbody>${(db.employees||[]).map((e,i) => {
          const d = S.daysFromToday(e.healthCardExpiry);
          return `<tr><td>${i+1}</td><td>${esc(e.name||'')}</td><td>${esc(e.role||'')}</td><td>${esc(e.branch||'')}</td><td>${esc(e.healthCardExpiry||'')}</td><td style="color:${d<0?'#dc2626':d<=30?'#d97706':'#16a34a'};font-weight:700">${d<0?'منتهية':d<=30?'تنتهي قريبًا':'سارية'}</td><td></td></tr>`;
        }).join('')}${Array(Math.max(0,8-(db.employees||[]).length)).fill('<tr><td style="height:28px"></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('')}</tbody></table>`,

      'f-supplier-eval': `${headerHtml}<h2 style="font-size:16px;font-weight:800;margin-bottom:12px">نموذج تقييم المورد</h2>
        <div style="font-size:13px;margin-bottom:14px">
          <p><strong>اسم المورد:</strong> _____________________ <strong>الفئة:</strong> _____________________</p>
          <p style="margin-top:8px"><strong>تاريخ التقييم:</strong> _____________________ <strong>المقيّم:</strong> _____________________</p>
        </div>
        <table><thead><tr><th>معيار التقييم</th><th>الوزن</th><th>الدرجة (1-5)</th><th>المرجح</th><th>ملاحظات</th></tr></thead>
        <tbody>
          <tr><td>جودة المنتجات وطزاجتها</td><td>25%</td><td></td><td></td><td></td></tr>
          <tr><td>الالتزام بدرجات حرارة التسليم</td><td>20%</td><td></td><td></td><td></td></tr>
          <tr><td>الالتزام بمواعيد التسليم</td><td>15%</td><td></td><td></td><td></td></tr>
          <tr><td>سلامة التغليف والتوسيم</td><td>15%</td><td></td><td></td><td></td></tr>
          <tr><td>الاستجابة للشكاوى والمرتجعات</td><td>15%</td><td></td><td></td><td></td></tr>
          <tr><td>صحة الوثائق والفواتير</td><td>10%</td><td></td><td></td><td></td></tr>
          <tr style="font-weight:700"><td>المجموع</td><td>100%</td><td></td><td></td><td></td></tr>
        </tbody></table>
        <p style="margin-top:14px;font-size:12px">الحكم: ☐ معتمد (≥70%)  ☐ مشروط (50-69%)  ☐ غير معتمد (&lt;50%)</p>`,

      'f-haccp-sum': `${headerHtml}<h2 style="font-size:16px;font-weight:800;margin-bottom:12px">ملخص خطة HACCP — نقاط التحكم الحرجة</h2>
        <table><thead><tr><th>CCP#</th><th>خطوة العملية</th><th>الخطر</th><th>الحد الحرج</th><th>المراقبة</th><th>الإجراء التصحيحي</th><th>التحقق</th></tr></thead>
        <tbody>${(db.haccp||[]).filter(h=>h.isCCP).map(h=>`<tr><td>${esc(h.no||'')}</td><td>${esc(h.step||'')}</td><td>${esc(h.hazard||'')}</td><td style="font-size:11px">${esc(h.criticalLimit||'')}</td><td style="font-size:11px">${esc(h.monitorWhat||'')} ${esc(h.monitorFreq||'')}</td><td style="font-size:11px">${esc(h.corrective||'')}</td><td style="font-size:11px">${esc(h.verification||'')}</td></tr>`).join('')}
        ${Array(Math.max(0,5-(db.haccp||[]).filter(h=>h.isCCP).length)).fill('<tr><td style="height:28px"></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('')}</tbody></table>`,

      'f-audit-ready': `${headerHtml}<h2 style="font-size:16px;font-weight:800;margin-bottom:12px">قائمة التحضير للتفتيش الرسمي</h2>
        <p style="font-size:11px;color:#78350f;background:#fffbeb;padding:6px 10px;border-radius:6px;margin-bottom:12px">تنبيه: هذه قائمة مساعدة داخلية ولا تضمن اجتياز التفتيش الرسمي</p>
        <table><thead><tr><th>البند</th><th>المسؤول</th><th>الحالة</th><th>ملاحظة</th></tr></thead>
        <tbody>
          ${['شهادات العاملين الصحية سارية وجاهزة','سجلات درجات الحرارة محدّثة للأسابيع الأخيرة','جدول التنظيف منجز ومؤرشف','آخر تقرير مكافحة آفات جاهز','خطة HACCP موثّقة ومحدثة','سجلات استلام المواد الغذائية متاحة','الشهادات والتراخيص معروضة وسارية','إجراءات CAPA موثّقة ومُغلقة','فصل واضح بين المناطق النظيفة والملوثة','فحص الثلاجات والمجمدات وصيانتها','نظافة وترتيب المنشأة عامةً'].map(item=>`<tr><td>${item}</td><td></td><td style="text-align:center">☐</td><td></td></tr>`).join('')}
        </tbody></table>`,

      'f-thaw-log': `${headerHtml}<h2 style="font-size:16px;font-weight:800;margin-bottom:12px">نموذج سجل إذابة التجميد</h2>
        <table><thead><tr><th>التاريخ</th><th>المنتج</th><th>الكمية</th><th>طريقة الإذابة</th><th>وقت البداية</th><th>وقت الانتهاء</th><th>الحرارة عند الاكتمال</th><th>المسؤول</th></tr></thead>
        <tbody>${Array(12).fill('<tr><td style="height:28px"></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('')}</tbody></table>`,

      'f-label': `${headerHtml}<h2 style="font-size:16px;font-weight:800;margin-bottom:12px">نموذج بطاقات تسمية الغذاء</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          ${Array(6).fill(`<div style="border:2px solid #0f766e;border-radius:8px;padding:14px">
            <p style="font-size:12px;margin-bottom:6px"><strong>اسم المنتج:</strong> ________________________</p>
            <p style="font-size:12px;margin-bottom:6px"><strong>تاريخ الإعداد:</strong> ____________ <strong>الوقت:</strong> ______</p>
            <p style="font-size:12px;margin-bottom:6px"><strong>تاريخ الصلاحية:</strong> ____________</p>
            <p style="font-size:12px;margin-bottom:6px"><strong>درجة حفظ:</strong> ☐ ثلاجة ≤4°م  ☐ مجمد ≤-18°م</p>
            <p style="font-size:12px"><strong>المعدّ:</strong> ________________________</p>
          </div>`).join('')}
        </div>`,

      'f-oil-change': `${headerHtml}<h2 style="font-size:16px;font-weight:800;margin-bottom:12px">نموذج سجل تتبع زيت القلي</h2>
        <table><thead><tr><th>التاريخ</th><th>القلاية/الموقع</th><th>لون الزيت</th><th>نتيجة اختبار TPC%</th><th>هل يحتاج تغيير؟</th><th>تاريخ التغيير</th><th>الكمية (لتر)</th><th>المسؤول</th></tr></thead>
        <tbody>${Array(10).fill('<tr><td style="height:30px"></td><td></td><td></td><td></td><td style="text-align:center">☐ نعم  ☐ لا</td><td></td><td></td><td></td></tr>').join('')}</tbody></table>
        <p style="margin-top:10px;font-size:11px;color:#6b7280">معيار: استبدل الزيت عند TPC% > 24% أو عند ظهور دخان أو لون داكن أو رائحة كريهة</p>`,
    };

    const content = forms[formId];
    if (!content) { U.toast('النموذج غير متاح','err'); return; }

    const w = window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head>
      <meta charset="UTF-8"><title>نموذج تفتيش</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Cairo',sans-serif;font-size:13px;color:#0f172a;direction:rtl;padding:18mm}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px}
        th,td{border:1px solid #ccc;padding:6px 10px;text-align:right}
        th{background:#f0fdf4;font-weight:700}
        h1{font-size:18px;font-weight:900}h2{font-size:15px;font-weight:800;margin-bottom:10px}
        p{margin-bottom:6px}
        @page{size:A4;margin:16mm}
        @media print{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      </style></head><body>${content}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(()=>{w.print();w.close();},500);
  };

  // ── TAB: أرشيف التقارير ───────────────────────────────────
  Views._rc_archive = function (db, m) {
    const inspections = [...(db.inspections||[])].sort((a,b)=>b.date.localeCompare(a.date));
    const rows = inspections.map(i => {
      const score = S.inspectionScore(i);
      const cl = classify(score);
      return `<tr>
        <td>${esc(i.date||'')}</td>
        <td>${esc(i.templateName||i.template||'')}</td>
        <td>${esc(i.by||'—')}</td>
        <td><strong>${score}%</strong></td>
        <td>${badge(cl.lbl,cl.cls)}</td>
        <td><button class="btn-secondary btn-sm" onclick="Views._rcPrintInspection('${i.id}')">🖨️</button></td>
      </tr>`;
    }).join('');

    return `
      <div class="card" style="margin-bottom:16px;padding:14px 18px;background:#f0f9ff;border-color:#bae6fd">
        <strong>أرشيف التقارير</strong>
        <p class="muted" style="font-size:12px;margin-top:4px">جميع جلسات التفتيش المسجلة مرتبة من الأحدث للأقدم. اضغط 🖨️ لطباعة أي تقرير.</p>
      </div>
      ${inspections.length ? `<div class="card" style="padding:20px">
        <div class="table-wrap"><table>
          <thead><tr><th>التاريخ</th><th>نوع التفتيش</th><th>المفتش</th><th>الدرجة</th><th>التصنيف</th><th>طباعة</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>` : `<div class="card">${U.empty('لا توجد تقارير محفوظة في الأرشيف بعد','🗂️')}</div>`}`;
  };

  // أزرار الطباعة تستدعي printReport من onclick — يجب أن تكون عامة
  window.printReport = printReport;

  // inject CSS for tab bar
  if (!document.getElementById('rc-style')) {
    const style = document.createElement('style');
    style.id = 'rc-style';
    style.textContent = `
      .rc-tab {
        background: var(--surface); border: 1.5px solid var(--line);
        border-radius: 10px; padding: 8px 16px; font-family: inherit;
        font-size: 13px; font-weight: 700; color: var(--muted);
        cursor: pointer; transition: all .15s;
      }
      .rc-tab:hover { border-color: var(--teal); color: var(--teal); }
      .rc-tab.active { background: var(--teal); border-color: var(--teal); color: #fff; }
    `;
    document.head.appendChild(style);
  }

  window.Views = Views;
})();
