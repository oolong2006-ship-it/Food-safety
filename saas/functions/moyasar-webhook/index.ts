// ============================================================
//  moyasar-webhook — Supabase Edge Function (Deno)
//  يستقبل إشعار الدفع من Moyasar ويفعّل اشتراك المنشأة.
//  النشر:  supabase functions deploy moyasar-webhook --no-verify-jwt
//  الأسرار: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MOYASAR_WEBHOOK_SECRET
//  في لوحة Moyasar: أضِف هذا الرابط كـ Webhook لحدث payment_paid.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    // تحقق بسيط من السر المشترك (يُرسل ضمن الترويسة أو الحمولة حسب إعدادك)
    const secret = Deno.env.get("MOYASAR_WEBHOOK_SECRET");
    const sent = req.headers.get("x-webhook-secret");
    if (secret && sent !== secret) return new Response("unauthorized", { status: 401 });

    const evt = await req.json();
    const type = evt?.type ?? "";
    const payment = evt?.data ?? evt;
    const status = payment?.status;
    const meta = payment?.metadata ?? {};
    const orgId = meta.org_id;
    const plan = meta.plan;

    // نفعّل عند نجاح الدفع فقط
    if (orgId && plan && (type === "payment_paid" || status === "paid")) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // يتجاوز RLS — لا يُكشف للعميل أبدًا
      );
      // تمديد فترة الاشتراك شهرًا من تاريخ الدفع (عدّلها لو كانت باقتك سنوية)
      const periodEnd = new Date(Date.now() + 30 * 864e5).toISOString();
      const { error } = await admin
        .from("organizations")
        .update({ plan, subscription_status: "active", current_period_end: periodEnd })
        .eq("id", orgId);
      if (error) return new Response("db error: " + error.message, { status: 500 });
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response("error: " + String(e), { status: 500 });
  }
});
