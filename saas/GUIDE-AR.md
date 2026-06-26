# دليل التشغيل الكامل — نظام سلامة الغذاء و GMP (SaaS)

دليل عملي من الصفر حتى تشغيل النظام على **دومين حقيقي** وتفعيله **لأي عميل** يطلبه.
لا يتطلب خبرة متقدمة — اتبع الخطوات بالترتيب. الوقت التقديري: **30–60 دقيقة**.

---

## 0) كيف يعمل النظام (المعمارية)

```
   ┌─────────────────────────┐        ┌──────────────────────────────┐
   │  الواجهة (ملفات ثابتة)   │  HTTPS │  Supabase (الخلفية السحابية)  │
   │  HTML/CSS/JS — دومينك    │ ─────▶ │  • قاعدة بيانات PostgreSQL    │
   │  (Netlify/Vercel/CF)     │        │  • تسجيل دخول (Auth)          │
   └─────────────────────────┘        │  • عزل بيانات لكل منشأة (RLS) │
              │                        │  • دوال حافة (Edge Functions) │
              │                        └──────────────────────────────┘
              │                                      │
              ▼                                      ▼
   لا حاجة لخادم تديره أنت            claude-proxy → Claude API (مفتاح بالخادم)
                                      create-checkout / webhook → Moyasar (الدفع)
```

- **متعدد المستأجرين (Multi-tenant):** كل عميل = «منشأة» معزولة ببياناتها وحسابها. العزل مفروض على مستوى قاعدة البيانات (RLS)، لا الواجهة فقط.
- **بلا خادم تديره:** Supabase يتكفّل بالبيانات والمصادقة والدوال. أنت تستضيف ملفات ثابتة فقط.
- **وضعان:**
  - **وضع العرض المحلي** (بلا Supabase): يعمل بالكامل من المتصفح، بيانات على الجهاز — مثالي للتجربة والعروض.
  - **وضع SaaS السحابي** (مع Supabase): حسابات حقيقية، مزامنة، خطط واشتراكات — هذا ما يُفعَّل للعملاء.

---

## 1) المتطلبات

- حساب **Supabase** (مجاني للبدء) — <https://supabase.com>
- حساب استضافة ثابتة: **Netlify** أو **Vercel** أو **Cloudflare Pages** (مجاني)
- **دومين** (من أي مزوّد: Namecheap، GoDaddy، Name.com…)
- (اختياري) **Node.js** على جهازك لتثبيت Supabase CLI ونشر الدوال
- (اختياري) مفتاح **Anthropic** للذكاء الاصطناعي — <https://console.anthropic.com>
- (اختياري) حساب **Moyasar** لتحصيل المدفوعات — <https://moyasar.com>

> الذكاء الاصطناعي والدفع **اختياريان**. يعمل النظام كاملًا بدونهما، وتضيفهما متى شئت.

---

## 2) تجهيز الخلفية السحابية (Supabase)

### 2-1 أنشئ المشروع
1. ادخل <https://supabase.com> → **New Project**. اختر اسمًا وكلمة مرور لقاعدة البيانات ومنطقة قريبة (مثل Frankfurt).
2. انتظر دقيقة حتى يجهز، ثم من **Project Settings → API** انسخ:
   - **Project URL** (مثل `https://abcd.supabase.co`)
   - **anon public key** (مفتاح عام — آمن للواجهة)

### 2-2 أنشئ قاعدة البيانات (3 ملفات SQL بالترتيب)
افتح **SQL Editor** في Supabase والصق محتوى كل ملف ثم **Run**:

| الترتيب | الملف | ماذا يفعل |
|---|---|---|
| 1 | [`schema.sql`](./schema.sql) | الجداول + عزل البيانات (RLS) + دالة إنشاء المنشأة |
| 2 | [`02_team_and_billing.sql`](./02_team_and_billing.sql) | ملفات التعريف، الدعوات، الأدوار (مالك/مدير/مفتش) |
| 3 | [`03_admin_activation.sql`](./03_admin_activation.sql) | أدوات تفعيل العملاء (تستخدمها أنت لاحقًا) |

### 2-3 إعداد تسجيل الدخول
- **Authentication → Providers → Email**: فعّل الدخول بالبريد.
- **Authentication → URL Configuration**: ضع **Site URL** = دومينك (بعد النشر في الخطوة 4).
- للتجربة السريعة فقط: يمكن تعطيل **Confirm email** ليدخل المستخدم فورًا. **في الإنتاج أبقِه مفعّلًا.**

---

## 3) اربط التطبيق بمشروعك

في ملفات المشروع، انسخ `assets/js/config.example.js` إلى **`assets/js/config.js`** وأدخل مفاتيحك:

```js
window.SAAS = {
  url: 'https://abcd.supabase.co',
  anonKey: 'eyJ...انسخ anon public key هنا...',
};
```

بمجرد ضبط القيمتين يتحوّل التطبيق تلقائيًا إلى **الوضع السحابي**: شاشة تسجيل/دخول حقيقية بدل أدوار العرض.

> أبقِ `config.js` خارج المستودع العام إن أردت (مدرج في `.gitignore`)، وأضِفه مباشرة في الاستضافة.

---

## 4) انشر الواجهة على دومين حقيقي

اختر أحد الخيارات (كلها مجانية وتدعم HTTPS تلقائيًا):

### الخيار أ — Netlify (الأسهل، بالسحب والإفلات)
1. ادخل <https://app.netlify.com> → **Add new site → Deploy manually**.
2. اسحب **مجلد المشروع كاملًا** (الذي يحتوي `index.html`) إلى الصفحة.
3. **Site settings → Domain management → Add custom domain**: أدخل دومينك واتبع تعليمات DNS (سجلّ CNAME/A). يصدر HTTPS تلقائيًا.

### الخيار ب — Vercel
1. ادخل <https://vercel.com> → **Add New → Project** واربط مستودع Git (أو استخدم `vercel` CLI).
2. **Root Directory** = جذر المشروع (حيث `index.html`). لا حاجة لأمر بناء (مشروع ثابت).
3. **Settings → Domains**: أضِف دومينك واتبع تعليمات DNS.

### الخيار ج — Cloudflare Pages
1. <https://pages.cloudflare.com> → **Create project** → اربط Git أو ارفع مباشرة.
2. Build command: (اتركه فارغًا) — Output directory: `/`.
3. **Custom domains**: أضِف دومينك (إن كان دومينك على Cloudflare يُربط تلقائيًا).

> بعد النشر، ارجع إلى **Supabase → Authentication → URL Configuration** واضبط **Site URL** و**Redirect URLs** على دومينك.

تحقّق: افتح دومينك → ستظهر شاشة **«أنشئ منشأة / تسجيل دخول»** (وضع سحابي يعمل).

---

## 5) (اختياري) دوال الحافة: الذكاء الاصطناعي والدفع

تتطلب **Supabase CLI**. ثبّتها وادخل مرة واحدة:

```bash
npm i -g supabase
supabase login
supabase link --project-ref <PROJECT_REF>   # PROJECT_REF من رابط مشروعك
```

### 5-أ الذكاء الاصطناعي عبر بوابة آمنة (claude-proxy) — موصى به
المفتاح يبقى **في الخادم** ولا يظهر للمتصفح إطلاقًا.

```bash
supabase functions deploy claude-proxy
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# اختياري: ANTHROPIC_MODEL=claude-opus-4-8  MAX_TOKENS_CAP=3000
```
بعدها تعمل ميزات التحليل والتصوير وتقدير التغذية تلقائيًا لكل عميل **تتيح خطته** الذكاء الاصطناعي (trial/pro/enterprise) دون أن يُدخل أحد مفتاحًا.

### 5-ب الدفع الإلكتروني (Moyasar)
```bash
supabase functions deploy create-checkout
supabase functions deploy moyasar-webhook --no-verify-jwt
supabase secrets set MOYASAR_SECRET_KEY=sk_... APP_URL=https://دومينك \
  MOYASAR_WEBHOOK_SECRET=سر-عشوائي SUPABASE_SERVICE_ROLE_KEY=service_role_key
```
- في لوحة Moyasar → **Webhooks**: أضِف رابط دالة `moyasar-webhook` لحدث `payment_paid` مع ترويسة `x-webhook-secret`.
- الأسعار في `functions/create-checkout/index.ts` (بالهللة) — عدّلها لباقاتك.
- عند نجاح الدفع تُفعَّل خطة العميل تلقائيًا عبر الـ Webhook.

> **service_role key** (من Project Settings → API) سرّي تمامًا — يُستخدم داخل الدوال فقط ولا يُكشف للعميل أبدًا.

---

## 6) ⭐ تفعيل النظام لأي عميل جديد

### المسار 1 — تفعيل ذاتي (الأنسب)
1. أرسل للعميل رابط دومينك.
2. يضغط **«أنشئ منشأة جديدة»** ويُدخل (بريد + كلمة مرور + اسم المنشأة).
3. يُنشأ له حساب ومنشأة معزولة على خطة **تجريبية 14 يومًا** تلقائيًا — يبدأ العمل فورًا.
4. من داخل النظام: صفحة **الفريق والأدوار** يدعو موظفيه ويحدد أدوارهم.

### المسار 2 — تفعيل/ترقية يدوية (عند الاشتراك المدفوع أو اتفاق خاص)
افتح **Supabase → SQL Editor** واستخدم أدوات [`03_admin_activation.sql`](./03_admin_activation.sql):

- **عرض كل العملاء** ومعرفة `org_id` والبريد:
  ```sql
  -- استعلام رقم (1) في الملف
  ```
- **تفعيل عميل بالبريد بسطر واحد** (بعد تشغيل الملف مرة):
  ```sql
  select admin_activate('customer@example.com', 'pro', 12);  -- خطة احترافية 12 شهرًا
  ```
- **تمديد التجربة** أو **الإيقاف عند عدم السداد**: استعلامات (4) و(5) في الملف.

### الخطط المتاحة
| الخطة | المعرّف | الذكاء الاصطناعي | حد الموظفين |
|---|---|---|---|
| تجريبية | `trial` | ✓ | غير محدود (14 يومًا) |
| الأساسية | `basic` | ✗ | 30 |
| الاحترافية | `pro` | ✓ | 200 |
| المؤسسية | `enterprise` | ✓ | غير محدود |

> الحدود مُعرّفة في `assets/js/cloud.js → PLAN_LIMITS` — عدّلها كما تشاء، وعدّل الأسعار في دالة `create-checkout`.

---

## 7) قائمة تحقق الإطلاق

- [ ] شغّلت ملفات SQL الثلاثة بالترتيب دون أخطاء.
- [ ] `config.js` يحوي URL و anon key الصحيحين.
- [ ] الدومين منشور بـ HTTPS، و**Site URL** مضبوط في Supabase.
- [ ] **Confirm email** مفعّل (إنتاج).
- [ ] جرّبت إنشاء منشأة تجريبية ودخولها وتسجيل بيانات.
- [ ] (إن فعّلت AI) نشرت `claude-proxy` وضبطت `ANTHROPIC_API_KEY`.
- [ ] (إن فعّلت الدفع) نشرت الدالتين وضبطت أسرار Moyasar والـ Webhook.
- [ ] وضعت حدًّا شهريًا في console.anthropic.com لضبط تكلفة AI.
- [ ] جدول نسخ احتياطي لقاعدة Supabase (Database → Backups).

---

## 8) الأمان والنسخ الاحتياطي

- **anon key** عام وآمن للواجهة؛ الحماية الحقيقية عبر RLS (كل منشأة ترى بياناتها فقط).
- **service_role** و **ANTHROPIC_API_KEY** و **MOYASAR_SECRET_KEY**: أسرار خادم فقط — لا تضعها في الواجهة إطلاقًا.
- **النسخ الاحتياطي:** Supabase يوفّر نسخًا تلقائية (Database → Backups). يمكن للعميل أيضًا **تصدير نسخة JSON** من داخل النظام (قائمة «المزيد»).
- لا تمنح أدوار العملاء صلاحية تنفيذ `admin_activate` (الملف يلغيها تلقائيًا).

---

## 9) استكشاف الأخطاء

| العَرَض | السبب المحتمل | الحل |
|---|---|---|
| تظهر شاشة الأدوار التجريبية لا تسجيل الدخول | `config.js` غير مضبوط | تأكد من URL/anonKey وأن الملف مُحمّل |
| «فشل التسجيل/الدخول» | Email provider غير مفعّل، أو Confirm email | فعّل Email، وتحقق من بريد التأكيد |
| لا تظهر بيانات بعد الدخول | ملفات SQL لم تُشغّل بالكامل | أعد تشغيل `schema.sql` ثم البقية |
| AI لا يعمل للعميل | الخطة لا تتيح AI، أو الدالة غير منشورة | رقِّ الخطة، وتأكد من نشر `claude-proxy` و`ANTHROPIC_API_KEY` |
| الدفع لا يفعّل الخطة | الـ Webhook غير مضبوط | تحقق من رابط `moyasar-webhook` و`x-webhook-secret` |
| 404 بعد النشر | مجلد الجذر خاطئ | اجعل جذر النشر حيث يوجد `index.html` |

---

## ملخص الأوامر (نسخ سريع)

```bash
# دوال الحافة (مرة واحدة)
npm i -g supabase && supabase login && supabase link --project-ref <REF>

supabase functions deploy claude-proxy
supabase functions deploy create-checkout
supabase functions deploy moyasar-webhook --no-verify-jwt

supabase secrets set ANTHROPIC_API_KEY=sk-ant-... \
  MOYASAR_SECRET_KEY=sk_... APP_URL=https://دومينك \
  MOYASAR_WEBHOOK_SECRET=سر-عشوائي SUPABASE_SERVICE_ROLE_KEY=service_role_key
```

```sql
-- تفعيل عميل بالبريد (في SQL Editor، بعد تشغيل 03_admin_activation.sql)
select admin_activate('customer@example.com', 'pro', 12);
```

بهذا يصبح النظام جاهزًا للبيع والتشغيل لأي عدد من العملاء على دومينك. 🎉
