# حزمة نظام سلامة الغذاء و GMP — SaaS كامل

هذه حزمة جاهزة لرفع النظام على دومين حقيقي وتشغيله كخدمة (SaaS) لأي عميل.

## ابدأ من هنا 👇
- **دليل التشغيل الكامل خطوة بخطوة:** [`GUIDE-AR.md`](./GUIDE-AR.md) ← اقرأه أولًا.
- **نسخة PDF جاهزة للطباعة/التسليم:** [`GUIDE-AR.pdf`](./GUIDE-AR.pdf)

## محتويات الحزمة

```
الجذر/
├─ index.html              ← التطبيق (افتحه مباشرة لتجربة الوضع المحلي)
├─ sw.js, manifest.webmanifest   ← دعم التثبيت والعمل دون اتصال (PWA)
├─ assets/
│   ├─ css/style.css
│   ├─ js/                 ← كود التطبيق (store, views, ai, cloud, ...)
│   │   ├─ config.js       ← فارغ = وضع محلي. املأه لتفعيل السحابة
│   │   └─ config.example.js
│   └─ icons/
├─ marketing/              ← صفحة تسويقية جاهزة (اختياري للنشر)
├─ tests/                  ← اختبارات الجودة (Playwright) — اختياري
└─ saas/
    ├─ GUIDE-AR.md             ← الدليل الكامل ⭐
    ├─ schema.sql             ← (1) الجداول + العزل (RLS)
    ├─ 02_team_and_billing.sql ← (2) الفريق والأدوار والدعوات
    ├─ 03_admin_activation.sql ← (3) أدوات تفعيل العملاء
    ├─ README.md              ← مرجع مختصر
    └─ functions/             ← دوال الحافة (Deno) لـ Supabase
        ├─ claude-proxy/      ← بوابة الذكاء الاصطناعي الآمنة
        ├─ create-checkout/   ← بدء دفع Moyasar
        └─ moyasar-webhook/   ← تفعيل الخطة بعد الدفع
```

## أسرع طريق للتشغيل (ملخص)
1. أنشئ مشروع Supabase وانسخ URL + anon key.
2. شغّل ملفات SQL الثلاثة في SQL Editor بالترتيب.
3. املأ `assets/js/config.js` بمفاتيح Supabase.
4. ارفع ملفات الجذر على Netlify/Vercel/Cloudflare واربط دومينك.
5. (اختياري) انشر دوال الحافة لتفعيل الذكاء الاصطناعي والدفع.
6. فعّل أي عميل: تسجيل ذاتي، أو `select admin_activate('email','pro',12);`

التفاصيل الكاملة في [`GUIDE-AR.md`](./GUIDE-AR.md).
