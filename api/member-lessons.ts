import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { productId, buyerEmail } = body as { productId?: string; buyerEmail?: string };
    if (!productId || !buyerEmail) return res.status(400).json({ error: "Missing fields" });

    const SUPABASE_URL = process.env.SUPABASE_URL as string;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "Supabase server env not configured" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", buyerEmail)
      .maybeSingle();
    const buyerUserId = profile?.id ?? null;

    const { data: membership } = await supabase
      .from("memberships")
      .select("status,buyer_user_id,buyer_email")
      .eq("product_id", productId)
      .or(`buyer_email.eq.${buyerEmail}${buyerUserId ? ",buyer_user_id.eq." + buyerUserId : ""}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!membership || membership.status !== "approved") {
      return res.status(403).json({ error: "Access not approved" });
    }

    const { data: lessons, error } = await supabase
      .from("lessons")
      .select("id,product_id,module_id,title,description,order_index,content_type,content_url")
      .eq("product_id", productId)
      .order("order_index", { ascending: true });

    if (error) return res.status(500).json({ error: "Failed to load lessons" });
    return res.status(200).json({ lessons: lessons || [] });
  } catch (e: any) {
    try {
      const message = typeof e?.message === "string" ? e.message : "Unexpected error";
      return res.status(500).json({ error: message });
    } catch {
      return res.status(500).json({ error: "Unexpected error" });
    }
  }
}
