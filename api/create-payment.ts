import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { productId, buyerEmail, buyerName } = body;
    if (!productId || !buyerEmail || !buyerName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL as string;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "Supabase server env not configured" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id,name,price,user_id")
      .eq("id", productId)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status,expires_at")
      .eq("user_id", product.user_id)
      .maybeSingle();

    const expired = sub?.expires_at ? new Date(sub.expires_at) <= new Date() : true;
    if (!sub || sub.status !== "active" || expired) {
      return res.status(403).json({ error: "Seller subscription expired" });
    }

    const { data: mpConfig, error: mpError } = await supabase
      .from("mercado_pago_config")
      .select("access_token")
      .eq("user_id", product.user_id)
      .single();

    if (mpError || !mpConfig) {
      return res.status(400).json({ error: "Mercado Pago not configured for seller" });
    }

    const accessToken = mpConfig.access_token;

    // ---------------------------------------------------------
    // MARKETPLACE SPLIT LOGIC
    // ---------------------------------------------------------
    const PLATFORM_FEE_PERCENT = 0.10; // 10% commission
    const applicationFee = Number((Number(product.price) * PLATFORM_FEE_PERCENT).toFixed(2));
    // ---------------------------------------------------------

    const idempotencyKey = randomUUID();

    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
    const baseUrl = process.env.WEBHOOK_BASE_URL || vercelUrl || "";
    let notificationUrl: string | undefined = undefined;
    try {
      if (baseUrl) {
        const u = new URL(baseUrl);
        const full = `${u.origin}/api/mp-webhook`;
        // validate
        new URL(full);
        notificationUrl = full;
      }
    } catch {
      notificationUrl = undefined;
    }

    const mpResp = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify((() => {
        const payload: Record<string, unknown> = {
          transaction_amount: Number(product.price),
          description: product.name,
          payment_method_id: "pix", // Suggestion: Make this dynamic (body.paymentMethodId)
          payer: {
            email: buyerEmail,
            first_name: buyerName,
          },
          external_reference: `${product.id}-${buyerEmail}`,
          application_fee: applicationFee, // SPLIT: Commission for the platform
        };
        if (notificationUrl) payload.notification_url = notificationUrl;
        return payload;
      })()),
    });

    const mpData = await mpResp.json();

    if (!mpResp.ok) {
      console.error("MP Error:", mpData);
      return res.status(mpResp.status).json({ error: "Payment failed", details: mpData });
    }

    const paymentId = mpData.id?.toString?.() ?? null;
    const status = mpData.status ?? "pending";
    const qrCode = mpData?.point_of_interaction?.transaction_data?.qr_code ?? null;
    const qrCodeBase64 = mpData?.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;

    // Insert Sale with Split Info
    await supabase.from("sales").insert({
      product_id: product.id,
      seller_id: product.user_id,
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      amount: Number(product.price),
      payment_id: paymentId,
      payment_status: status,
      platform_fee: applicationFee,
      seller_net_amount: Number(product.price) - applicationFee,
      created_at: new Date().toISOString()
    });

    // Handle Membership Creation
    let buyerUserId: string | null = null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", buyerEmail)
      .maybeSingle();
    buyerUserId = profile?.id ?? null;

    await supabase
      .from("memberships")
      .upsert({
        product_id: product.id,
        buyer_user_id: buyerUserId,
        buyer_email: buyerEmail,
        status,
      });

    return res.status(200).json({
      payment_id: paymentId,
      status,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
    });
  } catch (e: any) {
    try {
      const message = typeof e?.message === "string" ? e.message : "Unexpected error";
      return res.status(500).json({ error: message });
    } catch {
      return res.status(500).json({ error: "Unexpected error" });
    }
  }
}
