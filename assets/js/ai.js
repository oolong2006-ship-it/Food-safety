/* ============================================================
   ai.js — طبقة الذكاء الاصطناعي (Gemini Flash + محرك احتياطي محلي)
   - تقييم بنود التفتيش وتحديثها
   - تحليل الصور ورصد المخالفات تلقائيًا
   - توليد الإجراء التصحيحي والوقائي
   مدعوم بالمواصفات السعودية والخليجية والعالمية (standards.js)
   ============================================================ */
(function () {
  const CFG_KEY = 'fs_ai_cfg_v1';
  const MODEL = 'gemini-2.0-flash';
  const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent';

  function cfg() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { return {}; }
  }
  function setCfg(patch) {
    const c = { ...cfg(), ...patch };
    localStorage.setItem(CFG_KEY, JSON.stringify(c));
    return c;
  }
  function resolvedKey() {
    return (cfg().apiKey && cfg().apiKey.trim()) || (window.SAAS && window.SAAS.geminiKey) || '';
  }
  function hasKey() { return !!resolvedKey(); }
  function cloudAI() {
    return !!(window.Cloud && window.Cloud.active && window.Cloud.active() && window.Cloud.feature('ai') && window.Cloud.aiProxy);
  }
  function enabled() {
    if (cloudAI()) return true;
    return hasKey() && cfg().enabled !== false;
  }

  function systemPrompt() {
    return `أنت خبير سلامة غذاء و GMP و HACCP معتمد، تعمل ضمن نظام رقابة للمطاعم والكافيهات والمصانع الغذائية في السعودية والخليج.
مهمتك تقييم الامتثال ورصد المخالفات وفق المواصفات السعودية (هيئة الغذاء والدواء SFDA)، والخليجية (هيئة التقييس GSO مثل GSO 1694 و GSO 21 و GSO 2233)، والعالمية (Codex Alimentarius، ISO 22000، HACCP).
استند دائمًا إلى هذه المراجع وحدودها الحرجة:
${window.Standards.knowledgeContext()}

أجب بالعربية الفصحى المهنية، وكن دقيقًا وعمليًا. عند رصد عدم مطابقة قدّم دائمًا إجراءً تصحيحيًا فوريًا وإجراءً وقائيًا لمنع التكرار، مع الإشارة إلى المرجع/المواصفة المناسبة.
عندما يُطلب منك صيغة JSON، أعِد JSON صالحًا فقط دون أي نص إضافي أو علامات تنسيق.`;
  }

  // تحويل تنسيق Claude إلى تنسيق Gemini
  function buildGeminiParts(content) {
    if (typeof content === 'string') return [{ text: content }];
    return content.map(item => {
      if (item.type === 'image') {
        return { inlineData: { mimeType: item.source.media_type, data: item.source.data } };
      }
      return { text: item.text || '' };
    });
  }

  async function callGemini(content, { maxTokens = 1500 } = {}) {
    // الوضع السحابي: جرّب البوابة أولاً، وارجع للمفتاح المحلي عند الفشل
    if (cloudAI()) {
      try {
        return await window.Cloud.aiProxy({
          system: systemPrompt(),
          messages: [{ role: 'user', content }],
          max_tokens: maxTokens,
          model: MODEL,
        });
      } catch (_) {
        if (!resolvedKey()) throw new Error('خدمة الذكاء الاصطناعي غير متاحة — أضف مفتاح Gemini في الإعدادات');
      }
    }
    const key = resolvedKey();
    if (!key) throw new Error('لا يوجد مفتاح Gemini API — أضفه من الإعدادات');
    const res = await fetch(GEMINI_URL + '?key=' + key, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt() }] },
        contents: [{ parts: buildGeminiParts(content) }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error('تجاوزت الحد المؤقت لـ Gemini — انتظر دقيقة وأعد المحاولة');
      if (res.status === 401 || res.status === 403) throw new Error('مفتاح Gemini غير صالح أو منتهي الصلاحية');
      let msg = 'فشل الاتصال بخدمة الذكاء الاصطناعي (' + res.status + ')';
      try { const e = await res.json(); if (e.error && e.error.message) msg += ': ' + e.error.message; } catch (_) {}
      throw new Error(msg);
    }
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('\n');
    return text;
  }

  // اسم داخلي موحّد للاستدعاء
  const callClaude = callGemini;

  // استخراج JSON من رد النموذج بأمان
  function parseJSON(text) {
    if (!text) return null;
    let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();
    const s = t.indexOf('{'), s2 = t.indexOf('[');
    let start = (s === -1) ? s2 : (s2 === -1 ? s : Math.min(s, s2));
    const e = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
    if (start > -1 && e > -1) t = t.slice(start, e + 1);
    try { return JSON.parse(t); } catch (err) { return null; }
  }

  /* ============ 1) توليد الإجراء التصحيحي والوقائي ============ */
  async function generateCapa(violationText) {
    if (enabled()) {
      try {
        const text = await callClaude(
          `رُصدت حالة عدم مطابقة في منشأة غذائية: "${violationText}".
أعِد JSON فقط بالشكل:
{"severity":"حرجة|عالية|متوسطة|منخفضة","category":"تصنيف موجز","rootCause":"السبب الجذري المحتمل","corrective":"الإجراء التصحيحي الفوري","preventive":"الإجراء الوقائي لمنع التكرار","reference":"المواصفة/المرجع"}`,
          { maxTokens: 900 }
        );
        const j = parseJSON(text);
        if (j && j.corrective) return { ...j, source: 'ai' };
      } catch (e) { /* تجاوز للمحرك المحلي */ }
    }
    // محرك احتياطي محلي
    const m = window.Standards.matchCapa(violationText);
    return { severity: m.severity, category: m.category, rootCause: '', corrective: m.corrective, preventive: m.preventive, reference: m.ref, source: 'local' };
  }

  /* ============ 2) تقييم بند تفتيش وتحديثه ============ */
  async function evaluateItem(itemText) {
    if (enabled()) {
      try {
        const text = await callClaude(
          `قيّم بند التفتيش التالي في قائمة تدقيق GMP: "${itemText}".
أعِد JSON فقط:
{"clarity":"تقييم وضوح البند","risk":"عالٍ|متوسط|منخفض","improved":"صياغة محسّنة وأدق للبند قابلة للقياس","guidance":"إرشاد للمفتش حول كيفية التحقق","reference":"المرجع"}`,
          { maxTokens: 700 }
        );
        const j = parseJSON(text);
        if (j) return { ...j, source: 'ai' };
      } catch (e) { /* تجاوز */ }
    }
    const m = window.Standards.matchCapa(itemText);
    return {
      clarity: 'يُنصح بجعل البند قابلًا للقياس (رقم/حد واضح).',
      risk: m.severity === 'حرجة' ? 'عالٍ' : m.severity === 'عالية' ? 'متوسط' : 'منخفض',
      improved: itemText + ' — مع تحديد الحد المرجعي وآلية التحقق.',
      guidance: 'تحقق ميدانيًا وسجّل القراءة/الدليل الموضوعي.',
      reference: m.ref, source: 'local',
    };
  }

  /* ============ 3) تحليل صورة ورصد المخالفات ============ */
  // image: { data: base64 (بدون بادئة), mediaType }
  async function analyzePhoto(image, note) {
    if (enabled()) {
      try {
        const content = [
          { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
          { type: 'text', text:
            `حلّل هذه الصورة من منشأة غذائية ورصد أي مخالفات لسلامة الغذاء و GMP.${note ? ' ملاحظة المفتش: ' + note : ''}
أعِد JSON فقط بالشكل:
{"summary":"وصف عام موجز للمشهد","violations":[{"title":"المخالفة المرصودة","severity":"حرجة|عالية|متوسطة|منخفضة","corrective":"الإجراء التصحيحي الفوري","preventive":"الإجراء الوقائي لمنع التكرار","reference":"المواصفة/المرجع"}]}
إن لم توجد مخالفات اجعل القائمة فارغة.` },
        ];
        const text = await callClaude(content, { maxTokens: 1800 });
        const j = parseJSON(text);
        if (j && Array.isArray(j.violations)) return { ...j, source: 'ai' };
      } catch (e) {
        return { summary: '', violations: [], error: e.message, source: 'ai' };
      }
    }
    // محرك احتياطي: لا يمكن رؤية الصورة فعليًا دون مفتاح — يعتمد على ملاحظة المفتش
    if (note && note.trim()) {
      const m = window.Standards.matchCapa(note);
      return {
        summary: 'تحليل مبني على ملاحظة المفتش (الوضع المحلي — لرصد آلي من الصورة فعّل خدمة الذكاء الاصطناعي).',
        violations: [{ title: note, severity: m.severity, corrective: m.corrective, preventive: m.preventive, reference: m.ref }],
        source: 'local',
      };
    }
    return {
      summary: '', violations: [], needsKey: true, source: 'local',
      hint: 'الرصد الآلي للمخالفات من الصور يتطلب تفعيل خدمة الذكاء الاصطناعي من الإعدادات. يمكنك حاليًا إدخال ملاحظة نصية ليقترح النظام الإجراءات.',
    };
  }

  /* ============ 4) تفتيش العامل بالتصوير ============ */
  const WORKER_CRITERIA = [
    'ارتداء الزي النظيف المخصّص للعمل',
    'تغطية الشعر بالكامل (غطاء رأس/شبكة)',
    'ارتداء الكمامة بشكل صحيح يغطي الأنف والفم',
    'ارتداء القفازات عند مناولة الغذاء الجاهز (عند الحاجة)',
    'خلو اليدين من المجوهرات والساعات والأظافر الطويلة/الطلاء',
    'نظافة اليدين والزي بشكل عام',
    'عدم وجود جروح مكشوفة أو ضمادات غير محكمة',
    'المريول/الإيبرون نظيف وسليم',
    'عدم التدخين أو الأكل أثناء العمل',
  ];

  // image: { data: base64 (بدون بادئة), mediaType }
  async function inspectWorker(image, note, employeeName) {
    if (enabled()) {
      try {
        const content = [
          { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
          { type: 'text', text:
            `أنت مفتش سلامة غذاء. قيّم التزام العامل في الصورة باشتراطات النظافة الصحية لمتداولي الغذاء${employeeName ? ' (العامل: ' + employeeName + ')' : ''}.${note ? ' ملاحظة المفتش: ' + note : ''}
قيّم كل معيار من المعايير التالية بدقة بناءً على ما يظهر في الصورة:
${WORKER_CRITERIA.map((c, i) => (i + 1) + '. ' + c).join('\n')}
أعِد JSON فقط بالشكل:
{"summary":"وصف موجز لمظهر العامل","result":"مطابق|مخالف","score":0-100,"items":[{"criterion":"نص المعيار","status":"مطابق|مخالف|غير واضح","note":"ملاحظة موجزة"}],"corrective":"الإجراء التصحيحي الفوري للمخالفات","preventive":"الإجراء الوقائي لمنع التكرار","reference":"المرجع/المواصفة"}
قيّم status لكل معيار: "مطابق" إن ظهر الالتزام، "مخالف" إن ظهرت مخالفة، "غير واضح" إن لم يظهر في الصورة.` },
        ];
        const text = await callClaude(content, { maxTokens: 2000 });
        const j = parseJSON(text);
        if (j && Array.isArray(j.items)) return { ...j, source: 'ai' };
      } catch (e) {
        return { items: [], error: e.message, source: 'ai' };
      }
    }
    // محرك احتياطي: لا يمكن رؤية الصورة دون مفتاح
    if (note && note.trim()) {
      const m = window.Standards.matchCapa(note);
      return {
        summary: 'تقييم مبني على ملاحظة المفتش (الوضع المحلي).',
        result: 'مخالف', score: 60,
        items: WORKER_CRITERIA.map(c => ({ criterion: c, status: 'غير واضح', note: '' })),
        corrective: m.corrective, preventive: m.preventive, reference: m.ref, source: 'local',
      };
    }
    return {
      items: [], needsKey: true, source: 'local',
      hint: 'تفتيش العامل بالتصوير يتطلب تفعيل خدمة الذكاء الاصطناعي من الإعدادات.',
    };
  }

  /* ============ 5) تقدير القيمة الغذائية لوجبة من وصف نصّي ============ */
  // description: نص حر يصف الوجبة/المكوّنات؛ servings: عدد الحصص
  async function estimateNutrition(description, servings) {
    const s = Math.max(1, parseInt(servings) || 1);
    if (enabled()) {
      try {
        const text = await callClaude(
          `قدّر القيمة الغذائية للوجبة التالية بناءً على خبرتك ومتوسط القيم الغذائية المعروفة: "${description}".
الوجبة مقسّمة على ${s} حصة/حصص. قدّر القيم لكل حصة واحدة.
أعِد JSON فقط بالشكل:
{"dish":"اسم مختصر للوجبة","perServing":{"kcal":رقم,"protein":رقم بالغرام,"carbs":رقم بالغرام,"fat":رقم بالغرام},"allergens":["قائمة مسببات الحساسية المحتملة من: ألبان، بيض، جلوتين، مكسرات، فول سوداني، سمسم، صويا، أسماك، قشريات، خردل"],"confidence":"عالية|متوسطة|منخفضة","notes":"ملاحظة موجزة عن أساس التقدير ودقته"}
كن واقعيًا في التقدير واذكر أنه تقديري.`,
          { maxTokens: 900 }
        );
        const j = parseJSON(text);
        if (j && j.perServing) return { ...j, servings: s, source: 'ai' };
      } catch (e) { /* تجاوز للمحرك المحلي */ }
    }
    // محرك احتياطي محلي: مطابقة المكوّنات المعروفة من النص لتقدير تقريبي
    if (window.Nutrition) {
      const found = [];
      window.Nutrition.INGREDIENTS.forEach(ing => { if (description && description.includes(ing.name)) found.push(ing); });
      if (found.length) {
        const t = found.reduce((a, ing) => ({ kcal: a.kcal + ing.kcal, p: a.p + ing.p, c: a.c + ing.c, f: a.f + ing.f }), { kcal: 0, p: 0, c: 0, f: 0 });
        const allergens = [...new Set(found.flatMap(i => i.a || []))];
        // افتراض حصة ~200غ لكل مكوّن مذكور، موزّعة على الحصص
        const factor = (2) / s;
        return {
          dish: 'تقدير محلي', servings: s,
          perServing: { kcal: Math.round(t.kcal * factor), protein: +(t.p * factor).toFixed(1), carbs: +(t.c * factor).toFixed(1), fat: +(t.f * factor).toFixed(1) },
          allergens, confidence: 'منخفضة',
          notes: 'تقدير تقريبي محلي مبني على مطابقة المكوّنات المعروفة (افتراض ~200غ لكل مكوّن). فعّل خدمة الذكاء الاصطناعي للحصول على تقدير أدق لأي وجبة.',
          source: 'local',
        };
      }
    }
    return { needsKey: true, source: 'local', hint: 'تقدير وجبة من وصف نصّي حر يتطلب تفعيل خدمة الذكاء الاصطناعي من الإعدادات، أو ذكر مكوّنات معروفة في الوصف.' };
  }

  window.AI = { cfg, setCfg, hasKey, enabled, MODEL, generateCapa, evaluateItem, analyzePhoto, inspectWorker, estimateNutrition, WORKER_CRITERIA };
})();
