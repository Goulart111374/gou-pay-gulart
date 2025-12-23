import { createClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL as string) || "";
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "";

export const SUPABASE_CONFIGURED = !!(url && key);

export const supabase = createClient(url || "https://example.supabase.co", key || "public-anon-key", {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
});
