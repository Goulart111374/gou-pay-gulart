import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { userId, buyerEmail, buyerName, planType } = body as {
      userId?: string;
      buyerEmail?: string;
      buyerName?: string;
      planType?: "trial" | "monthly";
    };

    if (!userId || !buyerEmail || !buyerName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL as string;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "Supabase server env not configured" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: mpConfig, error: mpError } = await supabase
      .from("mercado_pago_config")
      .select("access_token")
      .eq("user_id", userId)
      .single();

    if (mpError || !mpConfig) {
      return res.status(400).json({ error: "Mercado Pago not configured for seller" });
    }

    const amount = planType === "trial" ? 2.0 : 37.9;
    const description = planType === "trial" ? "Plano de Teste (5 min)" : "Plano Mensal (30 dias)";
    const externalRef = `subscription-${userId}-${planType || "monthly"}`;

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

    const mpResp = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpConfig.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction_amount: Number(amount),
        description,
        payment_method_id: "pix",
        payer: {
          email: buyerEmail,
          first_name: buyerName,
        },
        external_reference: externalRef,
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
      }),
    });

    if (!mpResp.ok) {
      const details = await mpResp.text();
      let parsed: unknown = details;
      try { parsed = JSON.parse(details); } catch { parsed = details }
      return res.status(mpResp.status).json({ error: "Mercado Pago API error", details: parsed });
    }

    const mpData = await mpResp.json();
    const paymentId = mpData?.id?.toString?.() ?? null;
    const status = mpData?.status ?? "pending";
    const qrCode = mpData?.point_of_interaction?.transaction_data?.qr_code ?? null;
    const qrCodeBase64 = mpData?.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;

    const { data: current } = await supabase
      .from("subscriptions")
      .select("status,expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    const keepActive = current && current.status === "active";

    await supabase
      .from("subscriptions")
      .upsert({
        user_id: userId,
        status: status === "approved" ? "active" : (keepActive ? "active" : "pending"),
        last_payment_id: paymentId,
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
