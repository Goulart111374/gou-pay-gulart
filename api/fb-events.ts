import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function normalizeEmail(v?: unknown) {
  if (typeof v !== "string") return undefined;
  const s = v.trim().toLowerCase();
  if (!s || !s.includes("@")) return undefined;
  return sha256(s);
}

function normalizePhone(v?: unknown) {
  if (typeof v !== "string") return undefined;
  const digits = v.replace(/\D+/g, "");
  if (digits.length < 10) return undefined;
  return sha256(digits);
}

function normalizeName(v?: unknown) {
  if (typeof v !== "string") return undefined;
  const s = v.trim().toLowerCase();
  if (!s) return undefined;
  return sha256(s);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { pixel_id, token, event, test_event_code } = body;
    if (!pixel_id || !/^[0-9]{8,20}$/.test(String(pixel_id))) return res.status(400).json({ error: "Invalid or missing pixel_id" });
    if (!token || typeof token !== "string" || token.length < 20) return res.status(400).json({ error: "Invalid or missing token" });
    if (!event || !event.name) return res.status(400).json({ error: "Invalid or missing event" });

    const ev = event || {};
    const cd = ev.customData || {};
    const ud = ev.userData || {};

    const mappedUserData: Record<string, string> = {} as any;
    const em = normalizeEmail(ud.em ?? cd.email);
    const ph = normalizePhone(ud.ph ?? cd.phone);
    const fn = normalizeName(ud.fn ?? cd.first_name ?? cd.name);
    const ln = normalizeName(ud.ln ?? cd.last_name);
    if (em) mappedUserData.em = em;
    if (ph) mappedUserData.ph = ph;
    if (fn) mappedUserData.fn = fn;
    if (ln) mappedUserData.ln = ln;

    const ipHeader = (req.headers["x-forwarded-for"] as string | undefined) || (req.headers["X-Forwarded-For"] as string | undefined) || "";
    const ip = ipHeader.split(",").map((s) => s.trim()).filter(Boolean)[0] || "";
    const ua = (req.headers["user-agent"] as string | undefined) || (req.headers["User-Agent"] as string | undefined) || "";
    if (ip) (mappedUserData as any).client_ip_address = ip;
    if (ua) (mappedUserData as any).client_user_agent = ua;

    const origin = (req.headers["origin"] as string | undefined) || (req.headers["Origin"] as string | undefined) || "";
    const host = (req.headers["host"] as string | undefined) || (req.headers["Host"] as string | undefined) || "";
    const fallbackUrl = origin || (host ? `https://${host}` : "");

    const payload = {
      data: [
        {
          event_name: ev.name,
          event_time: Math.floor((ev.time || Date.now()) / 1000),
          event_source_url: ev.sourceUrl || (req.headers["referer"] as string) || fallbackUrl,
          action_source: "website",
          user_data: mappedUserData,
          custom_data: cd,
        },
      ],
    };

    let url = `https://graph.facebook.com/v18.0/${pixel_id}/events?access_token=${encodeURIComponent(token)}`;
    if (test_event_code && typeof test_event_code === "string" && test_event_code.length) {
      url += `&test_event_code=${encodeURIComponent(test_event_code)}`;
    }

    const fb = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const text = await fb.text();
    if (!fb.ok) {
      let details: any = text; try { details = JSON.parse(text); } catch {}
      const msg = (details && typeof details === 'object' && details.error && details.error.message) ? details.error.message : "Facebook API error";
      return res.status(fb.status).json({ error: msg, details });
    }
    let data: unknown = text; try { data = JSON.parse(text); } catch {}
    return res.status(200).json({ ok: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
