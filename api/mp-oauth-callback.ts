import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).json({ error: "Missing code or state" });
  }

  const userId = state as string; // Assuming state contains the user_id

  const SUPABASE_URL = process.env.SUPABASE_URL as string;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  
  // MP Credentials for the PLATFORM
  const MP_CLIENT_ID = process.env.MP_CLIENT_ID;
  const MP_CLIENT_SECRET = process.env.MP_CLIENT_SECRET;
  const MP_REDIRECT_URI = process.env.MP_REDIRECT_URI; // e.g., https://site.com/api/mp-oauth-callback

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MP_CLIENT_ID || !MP_CLIENT_SECRET || !MP_REDIRECT_URI) {
    return res.status(500).json({ error: "Server configuration missing" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Exchange code for token
    const tokenResp = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: MP_CLIENT_ID,
        client_secret: MP_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: MP_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResp.json();

    if (!tokenResp.ok) {
      console.error("MP OAuth Error:", tokenData);
      return res.status(400).json({ error: "Failed to exchange token", details: tokenData });
    }

    // Save tokens to DB
    const { access_token, refresh_token, public_key, user_id: mp_user_id, expires_in } = tokenData;

    const { error: dbError } = await supabase
      .from("mercado_pago_config")
      .upsert({
        user_id: userId,
        access_token: access_token,
        refresh_token: refresh_token, // Make sure to add this column to DB if missing
        public_key: public_key,       // Make sure to add this column to DB if missing
        mp_user_id: mp_user_id?.toString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (dbError) {
      console.error("DB Error:", dbError);
      return res.status(500).json({ error: "Failed to save credentials" });
    }

    // Redirect user back to dashboard
    const dashboardUrl = process.env.FRONTEND_URL || "https://goupay.com";
    return res.redirect(302, `${dashboardUrl}/dashboard?mp_connected=true`);

  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
