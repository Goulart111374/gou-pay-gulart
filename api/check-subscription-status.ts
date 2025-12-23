import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const paymentId = (req.query?.paymentId as string) || "";
    const userId = (req.query?.userId as string) || "";
    if (!paymentId && !userId) return res.status(400).json({ error: "Missing paymentId or userId" });

    const SUPABASE_URL = process.env.SUPABASE_URL as string;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const MP_PLATFORM_ACCESS_TOKEN = process.env.MP_PLATFORM_ACCESS_TOKEN as string;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MP_PLATFORM_ACCESS_TOKEN) {
      return res.status(500).json({ error: "Server env not configured" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let sub: any = null;
    if (userId) {
      const { data } = await supabase
        .from("subscriptions")
        .select("user_id,status,last_payment_id")
        .eq("user_id", userId)
        .maybeSingle();
      sub = data;
    }
    if (!sub && paymentId) {
      const { data } = await supabase
        .from("subscriptions")
        .select("user_id,status,last_payment_id")
        .eq("last_payment_id", paymentId)
        .maybeSingle();
      sub = data;
    }

    if (!sub?.last_payment_id) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${sub.last_payment_id}`, {
      headers: { Authorization: `Bearer ${MP_PLATFORM_ACCESS_TOKEN}` },
    });
    const data = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json({ error: "Mercado Pago API error", details: data });
    }

    const status = data?.status || sub.status || "pending";
    const ref: string = typeof data?.external_reference === "string" ? data.external_reference : "";
    const isTrial = ref.includes("trial");

    if (status === "approved") {
      const now = new Date();
      const exp = new Date(now);
      if (isTrial) {
        exp.setMinutes(exp.getMinutes() + 5);
      } else {
        exp.setDate(exp.getDate() + 30);
      }
      console.log("[subscription] activate", { user_id: sub.user_id, status, isTrial, activated_at: now.toISOString(), expires_at: exp.toISOString() });
      await supabase
        .from("subscriptions")
        .update({ status: "active", activated_at: now.toISOString(), expires_at: exp.toISOString() })
        .eq("user_id", sub.user_id);
    } else {
      console.log("[subscription] update", { user_id: sub.user_id, status });
      await supabase
        .from("subscriptions")
        .update({ status })
        .eq("user_id", sub.user_id);
    }

    return res.status(200).json({ status });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
