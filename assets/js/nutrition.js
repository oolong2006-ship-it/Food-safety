/* ============================================================
   nutrition.js — قاعدة المكوّنات الغذائية + حساب السعرات والحساسية
   القيم تقريبية لكل 100غ (قيم غذائية عامة) — قابلة للتوسعة من الواجهة
   ============================================================ */
(function () {
  // مسببات الحساسية المعتمدة (متوافقة مع متطلبات الوسم GSO 2233 / SFDA)
  const ALLERGENS = ['ألبان', 'بيض', 'جلوتين', 'مكسرات', 'فول سوداني', 'سمسم', 'صويا', 'أسماك', 'قشريات', 'خردل'];

  // قاعدة المكوّنات: kcal/p(بروتين)/c(كربوهيدرات)/f(دهون) لكل 100غ
  const INGREDIENTS = [
    // حبوب ونشويات
    { name: 'أرز أبيض مطبوخ', kcal: 130, p: 2.7, c: 28, f: 0.3, a: [] },
    { name: 'أرز بسمتي مطبوخ', kcal: 121, p: 3, c: 25, f: 0.4, a: [] },
    { name: 'برغل مطبوخ', kcal: 83, p: 3, c: 19, f: 0.2, a: ['جلوتين'] },
    { name: 'مكرونة مطبوخة', kcal: 158, p: 6, c: 31, f: 0.9, a: ['جلوتين'] },
    { name: 'خبز أبيض', kcal: 265, p: 9, c: 49, f: 3.2, a: ['جلوتين'] },
    { name: 'خبز عربي', kcal: 275, p: 9, c: 55, f: 1.2, a: ['جلوتين'] },
    { name: 'طحين قمح', kcal: 364, p: 10, c: 76, f: 1, a: ['جلوتين'] },
    { name: 'بطاطس مطبوخة', kcal: 87, p: 2, c: 20, f: 0.1, a: [] },
    { name: 'بطاطس مقلية', kcal: 312, p: 3.4, c: 41, f: 15, a: [] },
    // لحوم ودواجن
    { name: 'صدر دجاج مطبوخ', kcal: 165, p: 31, c: 0, f: 3.6, a: [] },
    { name: 'فخذ دجاج مطبوخ', kcal: 209, p: 26, c: 0, f: 11, a: [] },
    { name: 'لحم بقري مطبوخ', kcal: 250, p: 26, c: 0, f: 15, a: [] },
    { name: 'لحم غنم مطبوخ', kcal: 294, p: 25, c: 0, f: 21, a: [] },
    { name: 'كبدة', kcal: 175, p: 27, c: 4, f: 5, a: [] },
    { name: 'لحم مفروم', kcal: 270, p: 26, c: 0, f: 18, a: [] },
    // أسماك وبحريات
    { name: 'سمك (فيليه)', kcal: 206, p: 22, c: 0, f: 12, a: ['أسماك'] },
    { name: 'تونة معلبة', kcal: 132, p: 28, c: 0, f: 1, a: ['أسماك'] },
    { name: 'روبيان', kcal: 99, p: 24, c: 0.2, f: 0.3, a: ['قشريات'] },
    // بيض وألبان
    { name: 'بيض كامل', kcal: 155, p: 13, c: 1.1, f: 11, a: ['بيض'] },
    { name: 'حليب كامل', kcal: 61, p: 3.2, c: 4.8, f: 3.3, a: ['ألبان'] },
    { name: 'لبن زبادي', kcal: 59, p: 10, c: 3.6, f: 0.4, a: ['ألبان'] },
    { name: 'جبن شيدر', kcal: 403, p: 25, c: 1.3, f: 33, a: ['ألبان'] },
    { name: 'جبن موزاريلا', kcal: 280, p: 28, c: 3.1, f: 17, a: ['ألبان'] },
    { name: 'قشطة/كريمة', kcal: 340, p: 2.1, c: 2.8, f: 36, a: ['ألبان'] },
    { name: 'زبدة', kcal: 717, p: 0.9, c: 0.1, f: 81, a: ['ألبان'] },
    // خضار
    { name: 'طماطم', kcal: 18, p: 0.9, c: 3.9, f: 0.2, a: [] },
    { name: 'بصل', kcal: 40, p: 1.1, c: 9, f: 0.1, a: [] },
    { name: 'خيار', kcal: 15, p: 0.7, c: 3.6, f: 0.1, a: [] },
    { name: 'خس', kcal: 15, p: 1.4, c: 2.9, f: 0.2, a: [] },
    { name: 'جزر', kcal: 41, p: 0.9, c: 10, f: 0.2, a: [] },
    { name: 'فلفل حلو', kcal: 31, p: 1, c: 6, f: 0.3, a: [] },
    { name: 'باذنجان', kcal: 25, p: 1, c: 6, f: 0.2, a: [] },
    { name: 'كوسة', kcal: 17, p: 1.2, c: 3.1, f: 0.3, a: [] },
    { name: 'ثوم', kcal: 149, p: 6.4, c: 33, f: 0.5, a: [] },
    // بقوليات ومكسرات
    { name: 'حمص مطبوخ', kcal: 164, p: 9, c: 27, f: 2.6, a: [] },
    { name: 'فول مطبوخ', kcal: 110, p: 8, c: 19, f: 0.4, a: [] },
    { name: 'عدس مطبوخ', kcal: 116, p: 9, c: 20, f: 0.4, a: [] },
    { name: 'طحينة (سمسم)', kcal: 595, p: 17, c: 21, f: 54, a: ['سمسم'] },
    { name: 'لوز', kcal: 579, p: 21, c: 22, f: 50, a: ['مكسرات'] },
    { name: 'فول سوداني', kcal: 567, p: 26, c: 16, f: 49, a: ['فول سوداني'] },
    { name: 'كاجو', kcal: 553, p: 18, c: 30, f: 44, a: ['مكسرات'] },
    // زيوت ودهون وسكريات
    { name: 'زيت نباتي', kcal: 884, p: 0, c: 0, f: 100, a: [] },
    { name: 'زيت زيتون', kcal: 884, p: 0, c: 0, f: 100, a: [] },
    { name: 'سكر أبيض', kcal: 387, p: 0, c: 100, f: 0, a: [] },
    { name: 'عسل', kcal: 304, p: 0.3, c: 82, f: 0, a: [] },
    { name: 'صلصة صويا', kcal: 53, p: 8, c: 5, f: 0.6, a: ['صويا', 'جلوتين'] },
    { name: 'مايونيز', kcal: 680, p: 1, c: 1, f: 75, a: ['بيض'] },
    { name: 'كاتشب', kcal: 112, p: 1.2, c: 26, f: 0.2, a: [] },
  ];

  function find(name) { return INGREDIENTS.find(i => i.name === name); }

  // حساب وصفة: items = [{name, grams}]
  function compute(items, servings) {
    const t = { kcal: 0, p: 0, c: 0, f: 0, grams: 0 };
    const allergens = new Set();
    const rows = [];
    items.forEach(it => {
      const ing = find(it.name); if (!ing) return;
      const factor = (it.grams || 0) / 100;
      const row = {
        name: it.name, grams: it.grams,
        kcal: Math.round(ing.kcal * factor),
        p: +(ing.p * factor).toFixed(1), c: +(ing.c * factor).toFixed(1), f: +(ing.f * factor).toFixed(1),
      };
      rows.push(row);
      t.kcal += ing.kcal * factor; t.p += ing.p * factor; t.c += ing.c * factor; t.f += ing.f * factor; t.grams += (it.grams || 0);
      (ing.a || []).forEach(x => allergens.add(x));
    });
    const s = Math.max(1, servings || 1);
    const total = { kcal: Math.round(t.kcal), p: +t.p.toFixed(1), c: +t.c.toFixed(1), f: +t.f.toFixed(1), grams: Math.round(t.grams) };
    const per = { kcal: Math.round(t.kcal / s), p: +(t.p / s).toFixed(1), c: +(t.c / s).toFixed(1), f: +(t.f / s).toFixed(1), grams: Math.round(t.grams / s) };
    return { rows, total, per, allergens: [...allergens] };
  }

  window.Nutrition = { ALLERGENS, INGREDIENTS, find, compute };
})();
