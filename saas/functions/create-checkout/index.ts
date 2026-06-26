// ============================================================
//  create-checkout — Supabase Edge Function (Deno)
//  ينشئ فاتورة اشتراك في Moyasar ويُعيد رابط الدفع.
//  النشر:  supabase functions deploy create-checkout
//  الأسرار: MOYASAR_SECRET_KEY, APP_URL
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PLANS: Record<string, { amount: number; name: string }> = {
  basic: { amount: 19900, name: "الخطة الأساسية" },      // المبلغ بالهللة (199.00 ر.س)
  pro:   { amount: 39900, name: "الخطة الاحترافية" },     // 399.00 ر.س
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { plan } = await req.json();
    const p = PLANS[plan];
    if (!p) return json({ error: "خطة غير صالحة" }, 400);

    // التحقق من هوية المستخدم ومنشأته
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ error: "غير مصرّح" }, 401);
    const { data: orgs } = await supabase.from("organizations").select("id,name").limit(1);
    const org = orgs?.[0];
    if (!org) return json({ error: "لا توجد منشأة" }, 400);

    // إنشاء فاتورة Moyasar
    const secret = Deno.env.get("MOYASAR_SECRET_KEY")!;
    const appUrl = Deno.env.get("APP_URL") ?? "";
    const res = await fetch("https://api.moyasar.com/v1/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(secret + ":"),
      },
      body: JSON.stringify({
        amount: p.amount,
        currency: "SAR",
        description: `${p.name} — ${org.name}`,
        callback_url: appUrl,
        metadata: { org_id: org.id, plan },
      }),
    });
    const inv = await res.json();
    if (!res.ok) return json({ error: inv?.message ?? "تعذّر إنشاء الفاتورة" }, 400);
    return json({ url: inv.url, id: inv.id });
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
