import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { pixel_id, token, event } = body;
    if (!pixel_id || !token || !event?.name) return res.status(400).json({ error: "Missing fields" });
    const ev = event || {};
    const payload = {
      data: [
        {
          event_name: ev.name,
          event_time: Math.floor((ev.time || Date.now()) / 1000),
          event_source_url: ev.sourceUrl || req.headers["referer"] || "",
          action_source: "website",
          user_data: ev.userData || {},
          custom_data: ev.customData || {},
        },
      ],
    };
    const url = `https://graph.facebook.com/v18.0/${pixel_id}/events?access_token=${encodeURIComponent(token)}`;
    const fb = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const text = await fb.text();
    if (!fb.ok) {
      let details: unknown = text; try { details = JSON.parse(text); } catch {}
      return res.status(fb.status).json({ error: "Facebook API error", details });
    }
    let data: unknown = text; try { data = JSON.parse(text); } catch {}
    return res.status(200).json({ ok: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
