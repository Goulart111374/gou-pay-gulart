import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";

type FbEventName = "PageView" | "ViewContent" | "AddToCart" | "Purchase" | "Lead";
type FbEvent = {
  name: FbEventName;
  time: number;
  sourceUrl?: string;
  userData?: Record<string, unknown>;
  customData?: Record<string, unknown>;
  value?: number;
  currency?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const pixelId = body?.pixel_id as string | undefined;
    const token = body?.token as string | undefined;
    const event = body?.event as FbEvent | undefined;
    const testEventCode = body?.test_event_code as string | undefined;

    if (!pixelId || !/^[0-9]{8,20}$/.test(pixelId)) {
      return res.status(400).json({ error: "Invalid or missing pixel_id" });
    }
    if (!token || token.length < 20) {
      return res.status(400).json({ error: "Invalid or missing token" });
    }
    if (!event || !event.name || !event.time) {
      return res.status(400).json({ error: "Invalid or missing event" });
    }

    const eventTimeSeconds = Math.floor(Number(event.time) / 1000);

    const clientIp = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
      || (req.socket as any)?.remoteAddress
      || undefined;
    const userAgent = req.headers["user-agent"] as string | undefined;

    const eventId = randomUUID();

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name: event.name,
          event_time: eventTimeSeconds,
          event_source_url: event.sourceUrl,
          action_source: "website",
          event_id: eventId,
          user_data: {
            client_ip_address: clientIp,
            client_user_agent: userAgent,
            ...(event.userData || {}),
          },
          custom_data: {
            currency: event.currency || "BRL",
            value: typeof event.value === "number" ? event.value : undefined,
            ...(event.customData || {}),
          },
        },
      ],
    };

    const version = process.env.FB_GRAPH_VERSION || "v20.0";
    const url = `https://graph.facebook.com/${version}/${pixelId}/events?access_token=${encodeURIComponent(token)}`;

    if (testEventCode) {
      (payload as any).test_event_code = testEventCode;
    } else if (process.env.FB_TEST_EVENT_CODE) {
      (payload as any).test_event_code = process.env.FB_TEST_EVENT_CODE;
    }

    const fbResp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await fbResp.text();
    let json: any = text;
    try { json = JSON.parse(text); } catch { /* keep raw text */ }

    if (!fbResp.ok) {
      return res.status(fbResp.status).json({ error: "Facebook Graph API error", details: json });
    }

    return res.status(200).json({ ok: true, result: json });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}

