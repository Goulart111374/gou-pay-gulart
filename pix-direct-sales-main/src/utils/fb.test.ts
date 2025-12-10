import { describe, it, expect, vi } from "vitest";
import { setPixelId, getPixelId, setApiToken, getApiToken, trackPixelEvent, getLog, sendConversionsAPI } from "./fb";

const memStore: Record<string, string> = {};
// @ts-ignore
globalThis.localStorage = globalThis.localStorage || {
  getItem: (k: string) => (k in memStore ? memStore[k] : null),
  setItem: (k: string, v: string) => { memStore[k] = String(v); },
  removeItem: (k: string) => { delete memStore[k]; },
  clear: () => { for (const k of Object.keys(memStore)) delete memStore[k]; },
};

describe("Facebook utils", () => {
  it("persiste e recupera Pixel ID e Token", async () => {
    await setPixelId("1234567890");
    expect(getPixelId()).toBe("1234567890");
    await setApiToken("EA-TEST-TOKEN-1234567890");
    const tok = await getApiToken();
    expect(tok).toBe("EA-TEST-TOKEN-1234567890");
  });

  it("registra evento via Pixel quando fbq está disponível", async () => {
    await setPixelId("1234567890");
    // @ts-ignore
    globalThis.window = globalThis.window || {};
    // @ts-ignore
    window.fbq = vi.fn();
    trackPixelEvent({ name: "PageView", time: Date.now(), sourceUrl: "https://example.com" });
    const log = getLog();
    const last = log[log.length - 1];
    expect(last?.via).toBe("pixel");
    expect(last?.status).toBe("success");
  });

  it("enfileira evento quando Conversions API falha", async () => {
    await setPixelId("1234567890");
    await setApiToken("EA-TEST-TOKEN-1234567890");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 404, text: async () => "" } as any));
    await sendConversionsAPI({ name: "Purchase", time: Date.now(), value: 10, currency: "BRL" });
    const queueRaw = localStorage.getItem("fb_event_queue");
    expect(queueRaw && JSON.parse(queueRaw || "[]").length).toBeGreaterThan(0);
    globalThis.fetch = originalFetch;
  });
});
