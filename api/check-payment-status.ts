import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const paymentId = (req.query?.paymentId as string) || "";
    if (!paymentId) return res.status(400).json({ error: "Missing paymentId" });

    const SUPABASE_URL = process.env.SUPABASE_URL as string;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "Supabase server env not configured" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .select("payment_id, product_id, seller_id, payment_status")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (saleError || !sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    const { data: mpConfig, error: mpError } = await supabase
      .from("mercado_pago_config")
      .select("access_token")
      .eq("user_id", sale.seller_id)
      .single();

    if (mpError || !mpConfig) {
      return res.status(400).json({ error: "Mercado Pago not configured for seller" });
    }

    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpConfig.access_token}` },
    });
    const data = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json({ error: "Mercado Pago API error", details: data });
    }

    const status = data?.status || sale.payment_status || "pending";

    await supabase.from("sales").update({ payment_status: status }).eq("payment_id", paymentId);
    await supabase
      .from("memberships")
      .update({ status })
      .eq("product_id", sale.product_id)
      .eq("buyer_email", data?.payer?.email ?? "");

    return res.status(200).json({ status });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}

