import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { userId, buyerEmail, buyerName, planType } = body;
    if (!userId || !buyerEmail || !buyerName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL as string;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "Supabase server env not configured" });
    }

    const MP_PLATFORM_ACCESS_TOKEN = process.env.MP_PLATFORM_ACCESS_TOKEN as string;
    if (!MP_PLATFORM_ACCESS_TOKEN) {
      return res.status(500).json({ error: "Mercado Pago platform token not configured" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const idempotencyKey = randomUUID();

    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
    const baseUrl = process.env.WEBHOOK_BASE_URL || vercelUrl || "";
    let notificationUrl: string | undefined = undefined;
    try {
      if (baseUrl) {
        const u = new URL(baseUrl);
        const full = `${u.origin}/api/mp-webhook`;
        new URL(full);
        notificationUrl = full;
      }
    } catch {
      notificationUrl = undefined;
    }

    const enableTrial = String(process.env.ENABLE_TRIAL_PLAN ?? "true").toLowerCase() !== "false";
    const isTrial = planType === "trial" && enableTrial;
    const amount = isTrial ? 2 : 37.9;

    const mpResp = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_PLATFORM_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify((() => {
        const payload: Record<string, unknown> = {
          transaction_amount: Number(amount),
          description: isTrial ? "Plano de teste - 5 minutos" : "Assinatura Mensal",
          payment_method_id: "pix",
          payer: {
            email: buyerEmail,
            first_name: buyerName,
          },
          external_reference: isTrial ? `subscription-${userId}-trial` : `subscription-${userId}`,
        };
        if (notificationUrl) payload.notification_url = notificationUrl;
        return payload;
      })()),
    });

    if (!mpResp.ok) {
      const errText = await mpResp.text();
      let details: unknown = errText;
      try { details = JSON.parse(errText); } catch { /* ignore */ }
      return res.status(mpResp.status).json({ error: "Mercado Pago API error", details });
    }

    const mpData = await mpResp.json();

    const paymentId = mpData.id?.toString?.() ?? null;
    const status = mpData.status ?? "pending";
    const qrCode = mpData?.point_of_interaction?.transaction_data?.qr_code ?? null;
    const qrCodeBase64 = mpData?.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;

    await supabase
      .from("subscriptions")
      .upsert({
        user_id: userId,
        status,
        last_payment_id: paymentId,
        activated_at: null,
        expires_at: null,
      }, { onConflict: "user_id" });

    return res.status(200).json({
      payment_id: paymentId,
      status,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
