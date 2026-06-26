# دليل النشر والتشغيل — نظام سلامة الغذاء و GMP (SaaS)

دليل تسليم للمبرمج لرفع النظام على **دومين خاص ومساحة سحابية** وتشغيله كخدمة SaaS لعملاء متعددين.

---

## 1) نظرة عامة على المعمار

| الطبقة | التقنية | ملاحظات |
|---|---|---|
| الواجهة (Frontend) | HTML/CSS/JS **ثابت** بدون مكتبات بناء | يُرفع على أي استضافة ثابتة |
| الخلفية (Backend) | **Supabase** (PostgreSQL + Auth + RLS) | تعدد مستأجرين + عزل بيانات |
| الدفع | **Moyasar** عبر Supabase Edge Functions | اختياري — لتفعيل الاشتراكات |
| الذكاء الاصطناعي | **Claude API** (يُستدعى من المتصفح) | اختياري — لكل منشأة مفتاحها |

لا يوجد خادم تطبيقات تديره بنفسك؛ Supabase يتولّى البيانات والمصادقة، والواجهة ملفات ثابتة.

---

## 2) محتويات الحزمة

```
index.html              # التطبيق (نقطة الدخول)
manifest.webmanifest    # تعريف PWA
sw.js                   # Service Worker (عمل دون اتصال)
assets/
  css/style.css
  js/  icons, store, standards, ai, ui, cloud, views, app .js
  js/config.js          # ← مفاتيح Supabase (يُضبط عند النشر)
  js/config.example.js  # نموذج الإعداد
  icons/                # أيقونات PWA
marketing/              # صفحة تسويقية (Landing) لعرض المنتج
saas/
  schema.sql                  # قاعدة البيانات (المرحلة 1)
  02_team_and_billing.sql     # الأدوار/الدعوات/الفوترة (المرحلة 2)
  functions/                  # دوال الدفع (Edge Functions)
    create-checkout/index.ts
    moyasar-webhook/index.ts
  README.md                   # دليل الـ SaaS المختصر
tests/                  # اختبارات QA آلية (Playwright)
DEPLOY.md               # هذا الملف
README.md
```

---

## 3) المتطلبات قبل البدء
- حساب استضافة ثابتة: **Netlify** أو **Vercel** أو **Cloudflare Pages** (أو خادم VPS + Nginx).
- مشروع **Supabase** (الخطة المجانية تكفي للبدء).
- دومين خاص (للربط و HTTPS).
- (اختياري للدفع) حساب **Moyasar** + الـ CLI: `supabase`.
- (اختياري للـ AI) مفتاح **Claude API**.

---

## 4) خطوات النشر

### الخطوة أ — قاعدة البيانات (Supabase)
1. أنشئ مشروعًا على <https://supabase.com>.
2. **SQL Editor** → الصق وشغّل `saas/schema.sql` ثم `saas/02_team_and_billing.sql`.
3. **Authentication → Providers → Email**: فعّل تسجيل الدخول بالبريد. (للتجربة السريعة عطّل تأكيد البريد؛ في الإنتاج أبقِه مفعّلًا.)
4. من **Project Settings → API** انسخ: `Project URL` و`anon public key`.

### الخطوة ب — ربط الواجهة
عدّل `assets/js/config.js`:
```js
window.SAAS = {
  url: 'https://YOUR-PROJECT.supabase.co',
  anonKey: 'YOUR-ANON-PUBLIC-KEY',
};
```
> اتركه فارغًا = وضع عرض محلي تجريبي (بدون حسابات). املأه = وضع SaaS سحابي.

### الخطوة ج — رفع الواجهة على الدومين
**خيار Netlify/Vercel/Cloudflare Pages (موصى به):**
1. ارفع المجلد كاملًا (سحب وإفلات أو ربط مستودع Git).
2. لا يوجد أمر بناء — المخرجات هي جذر المشروع.
3. **اربط الدومين الخاص** من إعدادات المزوّد، وفعّل HTTPS (تلقائي غالبًا).

**خيار VPS + Nginx:**
```nginx
server {
  listen 443 ssl;
  server_name app.yourdomain.com;
  root /var/www/foodsafety;   # ضع ملفات المشروع هنا
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
}
```
ثم فعّل شهادة SSL (Let's Encrypt / certbot).

### الخطوة د — الدفع (اختياري، Moyasar)
```bash
supabase link --project-ref <your-ref>
supabase functions deploy create-checkout
supabase functions deploy moyasar-webhook --no-verify-jwt
supabase secrets set MOYASAR_SECRET_KEY=sk_... APP_URL=https://app.yourdomain.com \
  MOYASAR_WEBHOOK_SECRET=<random> SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```
في لوحة Moyasar → **Webhooks**: أضِف رابط دالة `moyasar-webhook` لحدث `payment_paid` مع ترويسة `x-webhook-secret`.

### الخطوة هـ — الذكاء الاصطناعي (اختياري)
يُدخل كل عميل مفتاح Claude من **الإعدادات → الذكاء الاصطناعي** (يُحفظ على جهازه). للإنتاج يُفضّل لاحقًا وكيل خلفي يُخفي المفتاح ويحتسب الاستهلاك.

---

## 5) كيف يعمل النظام

- **التسجيل:** عميل جديد يفتح الدومين → «أنشئ منشأة جديدة» (بريد + كلمة مرور + اسم المنشأة) → تُنشأ منشأة معزولة على خطة تجريبية 14 يومًا.
- **العزل (Multi-tenant):** كل سجل مرتبط بـ `org_id`، وسياسات **RLS** في قاعدة البيانات تمنع أي منشأة من رؤية بيانات أخرى — يُفرض على مستوى القاعدة لا الواجهة.
- **الأدوار:** مالك / مدير / مفتش. المالك والمدير يدعوان الأعضاء بالبريد من صفحة «الفريق والأدوار»، وينضمون تلقائيًا عند الدخول بنفس البريد.
- **الاشتراك:** صفحة «الاشتراك» → اختيار الخطة → دفع آمن عبر Moyasar → تفعيل آلي عبر الـ Webhook.
- **العمل دون اتصال (PWA):** قابل للتثبيت على الجوال؛ في الوضع السحابي البيانات مصدرها Supabase.

---

## 6) نموذج خدمة عدة عملاء
نشر واحد يخدم كل العملاء: كل عميل = منشأة معزولة داخل نفس قاعدة البيانات (RLS). لا تحتاج نشرًا منفصلًا لكل عميل. (اختياريًا يمكن منح كل عميل دومينًا فرعيًا يشير لنفس النشر.)

---

## 7) الصيانة والأمان والنسخ الاحتياطي
- **النسخ الاحتياطي:** Supabase يوفّر نسخًا احتياطية؛ ويمكن للعميل تصدير نسخة JSON من داخل التطبيق.
- **الأمان:** مفتاح `anon` عام وآمن للواجهة (الحماية عبر RLS). مفتاح `service_role` يبقى داخل دوال الحافة فقط ولا يُكشف أبدًا.
- **التحديثات:** أعد رفع الملفات الثابتة عند أي تحديث (لا يلزم ترحيل بيانات إلا عند تغيير المخطط).

---

## 8) التحقق (QA)
```bash
npm install
npx playwright install chromium
python3 -m http.server 8123 &
node tests/qa.js     # يجب أن تنجح كل الاختبارات
```

---

## 9) قائمة تحقق سريعة للإطلاق
- [ ] مشروع Supabase أُنشئ وشُغّل ملفّا SQL.
- [ ] `config.js` مضبوط بمفاتيح Supabase.
- [ ] الواجهة مرفوعة والدومين مربوط مع HTTPS.
- [ ] (اختياري) دوال الدفع منشورة والأسرار والـ Webhook مضبوطة.
- [ ] تجربة: إنشاء منشأة → دعوة عضو → تنفيذ تفتيش → (اختياري) دفعة تجريبية.

> للأسئلة التقنية، ابدأ من `saas/README.md` و `README.md`.
