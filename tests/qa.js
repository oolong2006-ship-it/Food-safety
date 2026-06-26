const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1340, height: 940 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // استثناء خطأ شهادة الخط الخارجي (شبكة، ليس من التطبيق)
    if (/ERR_CERT|fonts\.g|Failed to load resource/i.test(t)) return;
    consoleErrors.push(t);
  });
  page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message));

  const results = [];
  const ok = (name, pass, detail = '') => results.push({ name, pass: !!pass, detail });

  const base = 'http://localhost:8123/index.html';
  await page.goto(base, { waitUntil: 'networkidle' });
  // تهيئة نظيفة
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  /* ===== 1) اختبارات المنطق النقي (نتائج محسوبة) ===== */
  const logic = await page.evaluate(() => {
    const S = window.Store, U = window.UI, A = window.AI, St = window.Standards;
    const out = [];
    const t = (name, pass, detail = '') => out.push({ name, pass: !!pass, detail: String(detail) });

    S.reset(); // بيانات تجريبية معروفة

    // أ) دوال التاريخ
    t('daysFromToday(+5)=5', S.daysFromToday(S.shift(5)) === 5);
    t('daysFromToday(-3)=-3', S.daysFromToday(S.shift(-3)) === -3);

    // ب) احتساب نتيجة التدقيق (يتجاهل لا ينطبق)
    const insp = { sections: [{ items: [
      { result: 'yes' }, { result: 'yes' }, { result: 'yes' }, { result: 'no' }, { result: 'na' },
    ] }] };
    const score = S.inspectionScore(insp); // 3 من 4 = 75
    t('inspectionScore=75 (na مستثنى)', score === 75, 'got ' + score);
    t('inspectionScore فارغ=0', S.inspectionScore({ sections: [{ items: [{ result: 'na' }] }] }) === 0);

    // ج) صحة تصنيف الحرارة في البيانات التجريبية
    const db = S.load();
    let tempOk = true, bad = '';
    db.tempLogs.forEach(l => {
      let exp;
      if (l.type === 'مجمد') exp = l.value <= -18 ? 'مطابق' : 'مخالف';
      else if (l.type === 'حفظ ساخن') exp = l.value >= 63 ? 'مطابق' : 'مخالف';
      else exp = (l.value >= 0 && l.value <= 5) ? 'مطابق' : 'مخالف';
      if (exp !== l.status) { tempOk = false; bad = `${l.unit} ${l.value} type=${l.type} exp=${exp} got=${l.status}`; }
    });
    t('تصنيف حرارة البيانات صحيح', tempOk, bad);

    // د) المؤشرات تطابق العدّ الفعلي
    const m = S.metrics();
    t('openNCs يطابق العدّ', m.openNCs === db.ncs.filter(n => n.status !== 'مغلقة').length, m.openNCs);
    t('tempBreaches يطابق العدّ', m.tempBreaches === db.tempLogs.filter(x => x.status === 'مخالف').length, m.tempBreaches);
    t('readiness ضمن 0..100', m.readiness >= 0 && m.readiness <= 100, m.readiness);
    t('compliance ضمن 0..100', m.compliance >= 0 && m.compliance <= 100, m.compliance);
    t('expiredCards صحيح', m.expiredCards === db.employees.filter(e => S.daysFromToday(e.healthCardExpiry) < 0).length);

    // هـ) قاعدة المواصفات: مطابقة الإجراءات
    const cap = St.matchCapa('درجة حرارة الثلاجة مرتفعة');
    t('matchCapa حرارة → تصنيف صحيح', cap.category === 'ضبط درجات الحرارة', cap.category);
    t('matchCapa يعطي تصحيحي ووقائي', !!cap.corrective && !!cap.preventive);
    const capDef = St.matchCapa('نص غير معروف تمامًا xyz');
    t('matchCapa افتراضي يعمل', !!capDef.corrective && !!capDef.preventive);
    t('CRITICAL_LIMITS موجودة', St.CRITICAL_LIMITS.length >= 5);
    t('STANDARDS سعودية/خليجية/عالمية', ['سعودية','خليجية','عالمية'].every(r => St.STANDARDS.some(s => s.region === r)));

    // و) الذكاء الاصطناعي (وضع محلي بلا مفتاح)
    t('AI.enabled=false بلا مفتاح', A.enabled() === false);
    t('AI.MODEL=claude-opus-4-8', A.MODEL === 'claude-opus-4-8', A.MODEL);

    // ز) شارات الصلاحية
    t('expiryBadge منتهية', U.expiryBadge(S.shift(-2)).includes('منتهية'));
    t('expiryBadge قريبة الانتهاء', /تنتهي خلال/.test(U.expiryBadge(S.shift(10))));
    t('expiryBadge سارية', U.expiryBadge(S.shift(120)).includes('سارية'));

    // ح) fmtDate لا يرمي
    t('fmtDate يعمل', typeof U.fmtDate(S.todayISO()) === 'string' && U.fmtDate('') === '—');

    return out;
  });
  logic.forEach(r => ok('[منطق] ' + r.name, r.pass, r.detail));

  // اختبارات async للذكاء الاصطناعي (وضع محلي)
  const aiLogic = await page.evaluate(async () => {
    const A = window.AI; const out = [];
    const t = (n, p, d = '') => out.push({ name: n, pass: !!p, detail: String(d) });
    const capa = await A.generateCapa('تجاوز حراري في ثلاجة اللحوم');
    t('generateCapa(local) يعطي تصحيحي+وقائي', !!capa.corrective && !!capa.preventive && capa.source === 'local');
    const ev = await A.evaluateItem('الأرضيات نظيفة');
    t('evaluateItem(local) يعيد كائنًا', !!ev && typeof ev.improved === 'string');
    const ph1 = await A.analyzePhoto({ mediaType: 'image/jpeg', data: '' }, 'بقايا طعام على سطح التحضير');
    t('analyzePhoto(local+note) يرصد مخالفة', Array.isArray(ph1.violations) && ph1.violations.length === 1 && !!ph1.violations[0].preventive);
    const ph2 = await A.analyzePhoto({ mediaType: 'image/jpeg', data: '' }, '');
    t('analyzePhoto(local بلا note) يطلب المفتاح', ph2.needsKey === true);
    return out;
  });
  aiLogic.forEach(r => ok('[AI] ' + r.name, r.pass, r.detail));

  /* ===== 2) تدفقات واجهة حقيقية ===== */
  // إعادة تحميل لبدء App نظيف ثم الدخول
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.evaluate(() => window.Store.reset());
  await page.click('.role-btn[data-role="مدير الجودة"]');
  await page.waitForSelector('#app:not(.hidden)');
  await page.waitForTimeout(400);
  ok('[واجهة] تسجيل الدخول يعرض التطبيق', await page.isVisible('#app'));

  // كل المسارات تُعرض دون خطأ ومحتوى غير فارغ
  const routes = ['dashboard','inspections','haccp','monitor','temperature','employees','nc','traceability','suppliers','cleaning','nutrition','standards','reports','settings'];
  for (const k of routes) {
    await page.click(`.nav-item[data-key="${k}"]`);
    await page.waitForTimeout(250);
    const len = await page.evaluate(() => document.querySelector('#content').innerHTML.trim().length);
    ok(`[واجهة] المسار "${k}" يُعرض`, len > 50, 'len=' + len);
  }

  // تدفق: التفتيش الذاتي → إنشاء مخالفات تلقائيًا من البنود المخالفة
  await page.click('.nav-item[data-key="inspections"]'); await page.waitForTimeout(200);
  const ncBefore = await page.evaluate(() => window.Store.col('ncs').length);
  await page.click('.page-head .btn-primary'); await page.waitForTimeout(200); // تدقيق جديد
  await page.click('#start'); await page.waitForTimeout(400); // بدء (gmp افتراضي)
  // ضبط أول بندين على "مخالف"
  const segNoButtons = await page.$$('#insp-run .check-item .seg button[data-v="no"]');
  await segNoButtons[0].click(); await segNoButtons[1].click();
  await page.waitForTimeout(150);
  await page.click('#save-insp'); await page.waitForTimeout(400);
  const ncAfter = await page.evaluate(() => window.Store.col('ncs').length);
  ok('[تدفق] تدقيق GMP أنشأ مخالفتين من بندين مخالفين', ncAfter === ncBefore + 2, `before=${ncBefore} after=${ncAfter}`);

  // تدفق: قراءة حرارة خارج النطاق → مخالفة + تجاوز
  await page.click('.nav-item[data-key="temperature"]'); await page.waitForTimeout(200);
  const before = await page.evaluate(() => ({ nc: window.Store.col('ncs').length, tl: window.Store.col('tempLogs').length, br: window.Store.metrics().tempBreaches }));
  await page.click('.page-head .btn-primary'); await page.waitForTimeout(250);
  await page.fill('input[name="unit"]', 'ثلاجة اختبار QA');
  await page.selectOption('select[name="type"]', 'ثلاجة');
  await page.fill('input[name="value"]', '22'); // خارج 0..5 → مخالف
  await page.click('#save'); await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({ nc: window.Store.col('ncs').length, tl: window.Store.col('tempLogs').length, br: window.Store.metrics().tempBreaches }));
  ok('[تدفق] قراءة حرارة مخالفة أُضيفت', after.tl === before.tl + 1, `${before.tl}->${after.tl}`);
  ok('[تدفق] قراءة مخالفة فتحت حالة عدم مطابقة', after.nc === before.nc + 1, `${before.nc}->${after.nc}`);
  ok('[تدفق] عدّاد التجاوزات زاد', after.br === before.br + 1, `${before.br}->${after.br}`);

  // تدفق: CAPA → زر اقتراح الذكاء الاصطناعي (محلي) يملأ الإجراءات
  await page.click('.nav-item[data-key="nc"]'); await page.waitForTimeout(200);
  await page.click('.page-head .btn-primary'); await page.waitForTimeout(250); // حالة جديدة
  await page.fill('input[name="title"]', 'تسرب مياه قرب منطقة التحضير');
  await page.click('#ai-capa'); await page.waitForTimeout(500);
  const capaFilled = await page.evaluate(() => {
    const root = document.querySelector('#modal-body');
    return {
      corr: root.querySelector('[name=action]').value.trim().length > 0,
      prev: root.querySelector('[name=preventiveAction]').value.trim().length > 0,
    };
  });
  ok('[تدفق] CAPA: الذكاء الاصطناعي ملأ الإجراء التصحيحي', capaFilled.corr);
  ok('[تدفق] CAPA: الذكاء الاصطناعي ملأ الإجراء الوقائي', capaFilled.prev);
  await page.keyboard.press('Escape');

  // تدفق: الرصد بالتصوير (محلي + ملاحظة) → مخالفة → إنشاء NC
  await page.click('.nav-item[data-key="monitor"]'); await page.waitForTimeout(250);
  await page.fill('#mon-note', 'باب الثلاجة مفتوح والحرارة مرتفعة');
  await page.click('#mon-analyze'); await page.waitForTimeout(500);
  const monViol = await page.evaluate(() => (window.Views._monViolations || []).length);
  ok('[تدفق] الرصد المحلي رصد مخالفة من الملاحظة', monViol >= 1, 'viol=' + monViol);
  const ncPreMon = await page.evaluate(() => window.Store.col('ncs').length);
  const mkBtn = await page.$('#mon-results .btn-primary');
  if (mkBtn) { await mkBtn.click(); await page.waitForTimeout(300); }
  const ncPostMon = await page.evaluate(() => window.Store.col('ncs').length);
  ok('[تدفق] إنشاء NC من المخالفة المرصودة', ncPostMon === ncPreMon + 1, `${ncPreMon}->${ncPostMon}`);

  // تدفق: التنظيف → "تم التنفيذ" يعيد جدولة الموعد
  await page.click('.nav-item[data-key="cleaning"]'); await page.waitForTimeout(250);
  const cl = await page.evaluate(() => {
    const c = window.Store.col('cleaning')[0]; return { id: c.id, nextDue: c.nextDue };
  });
  await page.click('#content table tbody tr .btn-secondary'); await page.waitForTimeout(300);
  const clAfter = await page.evaluate((id) => {
    const c = window.Store.col('cleaning').find(x => x.id === id); return { nextDue: c.nextDue, lastDone: c.lastDone };
  }, cl.id);
  ok('[تدفق] التنظيف: lastDone=اليوم بعد التنفيذ', clAfter.lastDone === await page.evaluate(() => window.Store.todayISO()));
  ok('[تدفق] التنظيف: nextDue أُعيد جدولته', !!clAfter.nextDue);

  // تدفق: الإعدادات → حفظ بيانات المنشأة
  await page.click('.nav-item[data-key="settings"]'); await page.waitForTimeout(250);
  await page.fill('#set-name', 'منشأة اختبار QA');
  await page.click('#save-meta'); await page.waitForTimeout(200);
  const metaName = await page.evaluate(() => window.Store.load().meta.facilityName);
  ok('[تدفق] الإعدادات: حُفظ اسم المنشأة', metaName === 'منشأة اختبار QA', metaName);

  // تدفق: تصدير/استيراد (round-trip)
  const io = await page.evaluate(() => {
    const json = window.Store.exportJSON();
    const obj = JSON.parse(json);
    obj.meta.facilityName = 'مستورد QA';
    window.Store.importJSON(JSON.stringify(obj));
    return window.Store.load().meta.facilityName;
  });
  ok('[تدفق] تصدير/استيراد JSON يعمل', io === 'مستورد QA', io);

  // تدفق: خطة HACCP — وجود نقاط تحكم حرجة في البيانات والمؤشرات
  const ccp = await page.evaluate(() => ({ rows: window.Store.col('haccp').length, ccps: window.Store.metrics().ccpCount }));
  ok('[تدفق] HACCP: نقاط تحكم محمّلة', ccp.rows >= 4 && ccp.ccps >= 3, JSON.stringify(ccp));

  // تدفق: تتبّع الدفعات — استدعاء دفعة يحوّل حالتها ويفتح حالة عدم مطابقة
  const recall = await page.evaluate(() => {
    const b = window.Store.col('batches')[0];
    const ncBefore = window.Store.col('ncs').length;
    window.Views.recallBatch(b.id);
    document.querySelector('#cf-yes').click();
    return { status: window.Store.get('batches', b.id).status, ncAdded: window.Store.col('ncs').length - ncBefore };
  });
  await page.waitForTimeout(150);
  ok('[تدفق] الاستدعاء: الدفعة أصبحت مسحوبة', recall.status === 'مسحوب', recall.status);
  ok('[تدفق] الاستدعاء: فُتحت حالة عدم مطابقة', recall.ncAdded === 1, 'added=' + recall.ncAdded);
  await page.evaluate(() => window.UI.closeModal());

  // تدفق: تقدير وجبة بالذكاء الاصطناعي (محرك محلي يطابق مكوّنًا معروفًا)
  const est = await page.evaluate(async () => {
    const r = await window.AI.estimateNutrition('طبق أرز أبيض مطبوخ مع صدر دجاج مطبوخ', 2);
    return { kcal: r.perServing && r.perServing.kcal, source: r.source };
  });
  ok('[AI] تقدير الوجبة المحلي يعطي سعرات', est.kcal > 0, JSON.stringify(est));

  // إعادة الضبط النهائية حتى لا تتلوث بيانات العرض
  await page.evaluate(() => window.Store.reset());

  ok('[سلامة] لا أخطاء في الكونسول طوال الاختبارات', consoleErrors.length === 0, consoleErrors.join(' | '));

  await browser.close();

  /* ===== تقرير ===== */
  const pass = results.filter(r => r.pass).length;
  const fail = results.filter(r => !r.pass);
  console.log('\n==================== تقرير فريق ضمان الجودة ====================');
  results.forEach(r => console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail && !r.pass ? '  →  ' + r.detail : ''}`));
  console.log('---------------------------------------------------------------');
  console.log(`الإجمالي: ${results.length}  |  ناجح: ${pass}  |  فاشل: ${fail.length}`);
  if (consoleErrors.length) { console.log('\nأخطاء كونسول:'); consoleErrors.forEach(e => console.log('  - ' + e)); }
  console.log('===============================================================\n');
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error('TEST HARNESS ERROR:', e); process.exit(2); });
