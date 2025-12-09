let _supabase: any;
async function getSupabase() {
  if (_supabase) return _supabase;
  const mod = await import("@/integrations/supabase/client");
  _supabase = mod.supabase;
  return _supabase;
}

export type SubscriptionInfo = {
  status: string;
  expires_at: string | null;
};

export async function getCurrentSubscription(): Promise<SubscriptionInfo | null> {
  const supabase = await getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const userId = session.user.id;
  const { data } = await supabase
    .from("subscriptions")
    .select("status,expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return { status: data.status, expires_at: data.expires_at };
}

export function isSubscriptionActive(info: SubscriptionInfo | null): boolean {
  if (!info) return false;
  if (info.status !== "active") return false;
  if (!info.expires_at) return false;
  const now = Date.now();
  const end = new Date(info.expires_at).getTime();
  const graceMs = 60_000; // 1 min de tolerância contra diferenças de fuso/latência
  return end - graceMs > now;
}

export async function markExpiredIfNeeded(info: SubscriptionInfo | null): Promise<void> {
  if (!info) return;
  if (!info.expires_at) return; // nunca expira sem data definida
  const end = new Date(info.expires_at).getTime();
  const now = Date.now();
  const graceMs = 60_000; // 1 min
  const expired = end + graceMs <= now;
  if (expired && info.status !== "expired") {
    const supabase = await getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("user_id", session.user.id);
  }
}

export function computeMonthlyExpiry(activatedAt: string | Date): string {
  const start = typeof activatedAt === "string" ? new Date(activatedAt).getTime() : new Date(activatedAt).getTime();
  const end = start + 30 * 24 * 60 * 60_000;
  return new Date(end).toISOString();
}

export function getRemainingMs(expiresAt: string | Date): number {
  const end = typeof expiresAt === "string" ? new Date(expiresAt).getTime() : new Date(expiresAt).getTime();
  return end - Date.now();
}

export function shouldNotify(remainingMs: number): boolean {
  const sevenDays = 7 * 24 * 60 * 60_000;
  return remainingMs > 0 && remainingMs <= sevenDays;
}

export function formatRemainingMessage(remainingMs: number): string {
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (remainingMs <= 0) return "Seu plano expirou";
  if (remainingMs >= day) {
    const d = Math.ceil(remainingMs / day);
    return `Seu plano expira em ${d} dia${d > 1 ? "s" : ""}`;
  }
  if (remainingMs >= hour) {
    const h = Math.ceil(remainingMs / hour);
    return `Seu plano expira em ${h} hora${h > 1 ? "s" : ""}`;
  }
  const m = Math.ceil(remainingMs / minute);
  return `Seu plano expira em ${m} minuto${m > 1 ? "s" : ""}`;
}

export function shouldShowUpgradeTabNotifications(info: SubscriptionInfo | null): boolean {
  return !isSubscriptionActive(info);
}

export function getReminderSchedule(expiresAt: string | Date): Array<{ label: string; at: number }> {
  const end = typeof expiresAt === "string" ? new Date(expiresAt).getTime() : new Date(expiresAt).getTime();
  const day = 24 * 60 * 60_000;
  return [
    { label: "Sua assinatura expira em 3 dias", at: end - 3 * day },
    { label: "Sua assinatura expira em 1 dia", at: end - 1 * day },
  ].filter((i) => i.at > Date.now());
}

export type SimpleStore = { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void };

function getStore(): SimpleStore | null {
  const w: unknown = typeof window !== "undefined" ? window : null;
  const ls = (w as { localStorage?: SimpleStore } | null)?.localStorage;
  if (ls) return ls;
  return null;
}

export function shouldSchedule(expiresAt: string, store?: SimpleStore): boolean {
  const s = store || getStore();
  if (!s) return true;
  const key = `subNotifScheduled:${expiresAt}`;
  return !s.getItem(key);
}

export function markScheduled(expiresAt: string, store?: SimpleStore): void {
  const s = store || getStore();
  if (!s) return;
  const key = `subNotifScheduled:${expiresAt}`;
  s.setItem(key, "1");
}
