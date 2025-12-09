import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

async function authorize(req: VercelRequest) {
  const SUPABASE_URL = process.env.SUPABASE_URL as string;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { ok: false, status: 500 } as const;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const token = typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const raw = process.env.ADMIN_EMAILS || "authgou@gmail.com";
  const admins = raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.email) return { ok: false, status: 401 } as const;
    const email = (data.user.email || "").toLowerCase();
    const candidateHeader = (req.headers["x-admin-email"] || req.headers["X-Admin-Email"]) as string | undefined;
    const candidate = (candidateHeader || "").toLowerCase();
    const isAdmin = admins.includes(email) || (!!candidate && candidate === email);
    if (!isAdmin) return { ok: false, status: 403 } as const;
    return { ok: true, supabase, email: data.user.email! } as const;
  }
  const csrfHeader = (req.headers["x-csrf-token"] || req.headers["X-Csrf-Token"]) as string | undefined;
  const cookieHeader = (req.headers["cookie"] || req.headers["Cookie"]) as string | undefined;
  const csrfCookie = (cookieHeader || "").split(";").map((s) => s.trim()).find((s) => s.startsWith("csrf_token="));
  const csrfValue = csrfCookie ? csrfCookie.split("=")[1] : "";
  if (!csrfHeader || !csrfValue || csrfHeader !== csrfValue) return { ok: false, status: 401 } as const;
  const localEmailHeader = (req.headers["x-admin-email"] || req.headers["X-Admin-Email"]) as string | undefined;
  const expectedLocal = (process.env.ADMIN_LOCAL_EMAIL || "authgou@gmail.com").toLowerCase();
  const candidate = (localEmailHeader || "").toLowerCase();
  const isAdmin = !!candidate && (candidate === expectedLocal || admins.includes(candidate));
  if (!isAdmin) return { ok: false, status: 403 } as const;
  return { ok: true, supabase, email: candidate } as const;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,X-Csrf-Token,X-Admin-Email");
  if (req.method === "OPTIONS") return res.status(204).end();
  const auth = await authorize(req);
  if (!auth.ok) return res.status(auth.status).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    try {
      const { data } = await auth.supabase
        .from("admin_logs")
        .select("id,actor,action,details,created_at")
        .order("created_at", { ascending: false });
      return res.status(200).json({ logs: data || [] });
    } catch {
      return res.status(200).json({ logs: [] });
    }
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const { action, details } = body;
      if (!action) return res.status(400).json({ error: "Missing action" });
      await auth.supabase.from("admin_logs").insert({ actor: auth.email, action, details });
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(200).json({ ok: true });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
