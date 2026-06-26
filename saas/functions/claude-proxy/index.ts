// ============================================================
//  claude-proxy — Supabase Edge Function (Deno)
//  وسيط آمن لاستدعاء Claude API: يحفظ المفتاح في الخادم ولا
//  يُعرّضه للمتصفح إطلاقًا. يتحقق من هوية المستخدم وأن خطته
//  تتيح ميزة الذكاء الاصطناعي قبل تمرير الطلب لـ Anthropic.
//
//  النشر:   supabase functions deploy claude-proxy
//  الأسرار: ANTHROPIC_API_KEY  (مفتاح حسابك من console.anthropic.com)
//           SUPABASE_URL, SUPABASE_ANON_KEY  (يُضافان تلقائيًا)
//  اختياري: ANTHROPIC_MODEL (افتراضي claude-opus-4-8)
//           MAX_TOKENS_CAP (سقف أعلى للحماية، افتراضي 3000)
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// الخطط التي تتيح الذكاء الاصطناعي (مطابقة لـ PLAN_LIMITS في cloud.js)
const AI_PLANS = new Set(["trial", "pro", "enterprise"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "الطريقة غير مدعومة" }, 405);

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "لم يُضبط مفتاح Anthropic على الخادم" }, 500);

    // 1) التحقق من هوية المستخدم عبر توكن Supabase
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "غير مصرّح" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ error: "غير مصرّح" }, 401);

    // 2) التحقق أن خطة منشأة المستخدم تتيح الذكاء الاصطناعي (RLS يقصر الرؤية على منشآته)
    const { data: orgs } = await supabase
      .from("organizations").select("id,plan,subscription_status").limit(1);
    const org = orgs?.[0];
    if (!org) return json({ error: "لا توجد منشأة" }, 400);
    const plan = (org.plan as string) || "trial";
    if (!AI_PLANS.has(plan)) {
      return json({ error: "خطتك الحالية لا تتضمّن ميزة الذكاء الاصطناعي — يرجى الترقية" }, 403);
    }

    // 3) قراءة الطلب وتمريره إلى Anthropic
    const body = await req.json();
    const cap = parseInt(Deno.env.get("MAX_TOKENS_CAP") ?? "3000", 10);
    const payload = {
      model: Deno.env.get("ANTHROPIC_MODEL") ?? body.model ?? "claude-opus-4-8",
      max_tokens: Math.min(parseInt(body.max_tokens ?? 1500, 10) || 1500, cap),
      system: body.system,
      messages: body.messages,
    };
    if (!Array.isArray(payload.messages) || !payload.messages.length) {
      return json({ error: "طلب غير صالح: messages مطلوبة" }, 400);
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return json({ error: data?.error?.message ?? "فشل الاتصال بخدمة Claude" }, res.status);
    }
    // نُعيد المحتوى النصّي فقط للعميل
    const text = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text).join("\n");
    return json({ text });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
