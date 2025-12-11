/* eslint-disable */
import { supabase } from "@/integrations/supabase/client";
const LS_KEYS = {
  pixelId: "fb_pixel_id",
  tokenEnc: "fb_api_token_enc",
  eventQueue: "fb_event_queue",
  eventLog: "fb_event_log",
} as const;

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

const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_PUBLIC_API_BASE) ? (import.meta as any).env.VITE_PUBLIC_API_BASE as string : "";
function endpoint(path: string) { return API_BASE ? `${API_BASE}${path}` : path; }

export function getPixelId(): string | null {
  try { return localStorage.getItem(LS_KEYS.pixelId); } catch { return null; }
}

export async function setPixelId(id: string) {
  localStorage.setItem(LS_KEYS.pixelId, id);
}

// Simple AES-GCM encryption using a static salt; for demo purposes.
// In production, derive per-user keys or store token server-side.
async function getCryptoKey(): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("goupay-fb-token-key-v1"),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new TextEncoder().encode("goupay-salt"), iterations: 100000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function setApiToken(token: string) {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token));
  const blob = new Uint8Array(enc);
  const packed = btoa(String.fromCharCode(...iv)) + "." + btoa(String.fromCharCode(...blob));
  localStorage.setItem(LS_KEYS.tokenEnc, packed);
}

export async function packApiToken(token: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token));
  const blob = new Uint8Array(enc);
  const packed = btoa(String.fromCharCode(...iv)) + "." + btoa(String.fromCharCode(...blob));
  return packed;
}

export async function unpackApiToken(packed: string): Promise<string | null> {
  try {
    const [ivb64, ctb64] = packed.split(".");
    const iv = Uint8Array.from(atob(ivb64), (c) => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(ctb64), (c) => c.charCodeAt(0));
    const key = await getCryptoKey();
    const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(dec);
  } catch {
    return null;
  }
}

export async function getApiToken(): Promise<string | null> {
  const packed = localStorage.getItem(LS_KEYS.tokenEnc);
  if (!packed) return null;
  const [ivb64, ctb64] = packed.split(".");
  try {
    const iv = Uint8Array.from(atob(ivb64), (c) => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(ctb64), (c) => c.charCodeAt(0));
    const key = await getCryptoKey();
    const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(dec);
  } catch {
    return null;
  }
}

declare global { interface Window { fbq?: (...args: any[]) => void } }

export function initPixel() {
  const pid = getPixelId();
  if (!pid) return;
  if (window.fbq) return;
  (function(f,b,e,v,n,t,s){
    if (f.fbq) return; n = f.fbq = function(){ n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = true; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode!.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  window.fbq!('init', pid);
}

export function trackPixelEvent(ev: FbEvent) {
  try {
    initPixel();
    const pid = getPixelId();
    if (!pid || !window.fbq) return;
    const cd = { ...ev.customData };
    if (typeof ev.value === 'number') cd['value'] = ev.value;
    if (ev.currency) cd['currency'] = ev.currency;
    window.fbq('track', ev.name, cd);
    logEvent({ ...ev, status: 'success', via: 'pixel' });
  } catch (e) {
    logEvent({ ...ev, status: 'failed', via: 'pixel', error: (e as Error)?.message });
  }
}

export async function sendConversionsAPI(ev: FbEvent) {
  try {
    const pid = getPixelId();
    const token = await getApiToken();
    if (!pid || !token) throw new Error('Config ausente');
    const resp = await fetch(endpoint('/api/fb-events'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pixel_id: pid, token, event: ev }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      let details: any = undefined; try { details = JSON.parse(text); } catch {}
      const message = typeof details?.error === 'string' ? details.error : 'Falha ao enviar para API';
      throw new Error(message + (details?.details ? ' — ' + JSON.stringify(details.details) : ''));
    }
    logEvent({ ...ev, status: 'success', via: 'capi' });
  } catch (e) {
    enqueueEvent(ev);
    logEvent({ ...ev, status: 'failed', via: 'capi', error: (e as Error)?.message });
  }
}

function readQueue(): FbEvent[] {
  try { return JSON.parse(localStorage.getItem(LS_KEYS.eventQueue) || '[]'); } catch { return []; }
}
function writeQueue(q: FbEvent[]) {
  localStorage.setItem(LS_KEYS.eventQueue, JSON.stringify(q.slice(0, 500)));
}
export function enqueueEvent(ev: FbEvent) {
  const q = readQueue(); q.push(ev); writeQueue(q);
}
export async function flushQueue() {
  const q = readQueue();
  if (!q.length) return;
  const pid = getPixelId();
  const token = await getApiToken();
  if (!pid || !token) return;
  const next: FbEvent[] = [];
  for (const ev of q) {
    try {
      const resp = await fetch(endpoint('/api/fb-events'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pixel_id: pid, token, event: ev }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        let details: any = undefined; try { details = JSON.parse(text); } catch {}
        const message = typeof details?.error === 'string' ? details.error : ('HTTP ' + resp.status);
        throw new Error(message + (details?.details ? ' — ' + JSON.stringify(details.details) : ''));
      }
      logEvent({ ...ev, status: 'success', via: 'capi-retry' });
    } catch (e) {
      next.push(ev);
      logEvent({ ...ev, status: 'failed', via: 'capi-retry', error: (e as Error)?.message });
    }
  }
  writeQueue(next);
}

type LogEntry = FbEvent & { status: 'success' | 'failed'; via: string; error?: string };
function readLog(): LogEntry[] { try { return JSON.parse(localStorage.getItem(LS_KEYS.eventLog) || '[]'); } catch { return []; } }
function writeLog(l: LogEntry[]) { localStorage.setItem(LS_KEYS.eventLog, JSON.stringify(l.slice(-2000))); }
export function logEvent(entry: LogEntry) { const l = readLog(); l.push(entry); writeLog(l); }
export function getLog(): LogEntry[] { return readLog(); }

export function getCampaignFromUrl(u: string): string | undefined {
  try { const url = new URL(u); return url.searchParams.get('utm_campaign') || undefined; } catch { return undefined; }
}

export async function ensureProductFbConfig(productId: string): Promise<boolean> {
  try {
    const { data: link } = await supabase
      .from("fb_product_configs")
      .select("fb_config_id,is_active")
      .eq("product_id", productId)
      .eq("is_active", true)
      .limit(1)
      .single();
    if (!link || !link.is_active) return false;
    const { data: cfg } = await supabase
      .from("fb_configs")
      .select("pixel_id,token_enc")
      .eq("id", (link as any).fb_config_id)
      .limit(1)
      .single();
    if (!cfg) return false;
    await setPixelId((cfg as any).pixel_id);
    const tok = await unpackApiToken((cfg as any).token_enc);
    if (!tok) return false;
    await setApiToken(tok);
    return true;
  } catch {
    return false;
  }
}
