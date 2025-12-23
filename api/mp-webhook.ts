import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL as string;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(200).json({ ok: true });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let paymentId = "";
    if (req.method === "POST") {
      const bodyUnknown = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const body = bodyUnknown as Record<string, unknown>;
      paymentId = (body?.data as Record<string, unknown> | undefined)?.id as string || (body?.id as string) || (body?.resource as Record<string, unknown> | undefined)?.id as string || (body?.payment as Record<string, unknown> | undefined)?.id as string || "";
    } else {
      const q = (req.query || {}) as Record<string, string | string[]>;
      const idParam = q["id"];
      const dataIdParam = q["data_id"];
      paymentId = typeof idParam === "string" ? idParam : Array.isArray(idParam) ? idParam[0] : (typeof dataIdParam === "string" ? dataIdParam : Array.isArray(dataIdParam) ? dataIdParam[0] : "");
    }

    if (!paymentId) {
      return res.status(200).json({ ok: true });
    }

    const { data: sale } = await supabase
      .from("sales")
      .select("product_id,seller_id,buyer_email")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (!sale) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("user_id,last_payment_id,status")
        .eq("last_payment_id", paymentId)
        .maybeSingle();
      if (!sub) {
        return res.status(200).json({ ok: true });
      }
      const MP_PLATFORM_ACCESS_TOKEN = process.env.MP_PLATFORM_ACCESS_TOKEN as string;
      if (!MP_PLATFORM_ACCESS_TOKEN) {
        return res.status(200).json({ ok: true });
      }
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${MP_PLATFORM_ACCESS_TOKEN}` },
      });
      const d = await r.json();
      if (!r.ok) {
        return res.status(200).json({ ok: true });
      }
      const st = d?.status || sub.status || "pending";
      if (st === "approved") {
        const now = new Date();
        const exp = new Date(now);
        exp.setDate(exp.getDate() + 30);
        await supabase
          .from("subscriptions")
          .update({ status: "active", activated_at: now.toISOString(), expires_at: exp.toISOString() })
          .eq("user_id", sub.user_id);
      } else {
        await supabase
          .from("subscriptions")
          .update({ status: st })
          .eq("user_id", sub.user_id);
      }
      return res.status(200).json({ ok: true });
    }

    const { data: mpConfig } = await supabase
      .from("mercado_pago_config")
      .select("access_token")
      .eq("user_id", sale.seller_id)
      .single();

    if (!mpConfig) {
      return res.status(200).json({ ok: true });
    }

    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpConfig.access_token}` },
    });
    const data = await resp.json();
    if (!resp.ok) {
      return res.status(200).json({ ok: true });
    }

    const status = data?.status || "pending";
    const releaseStatus = status === "approved" ? "confirmed" : "pending";

    await supabase.from("sales")
      .update({ 
        payment_status: status,
        release_status: releaseStatus
      })
      .eq("payment_id", paymentId);
    await supabase
      .from("memberships")
      .update({ status })
      .eq("product_id", sale.product_id)
      .eq("buyer_email", sale.buyer_email);

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: true });
  }
}

