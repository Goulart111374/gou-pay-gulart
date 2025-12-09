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
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,X-Csrf-Token,X-Admin-Email");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const auth = await authorize(req);
  if (!auth.ok) return res.status(auth.status).json({ error: "Unauthorized" });
  try {
    const { data, error } = await auth.supabase
      .from("profiles")
      .select("id,email,name,created_at")
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: "Failed to load users" });
    return res.status(200).json({ users: data || [] });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
