import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import createSubscriptionHandler from "../create-subscription";
import checkSubscriptionStatusHandler from "../check-subscription-status";

const mockSupabase = () => {
  const calls: any[] = [];
  const client = {
    from: (table: string) => {
      return {
        select: (..._args: any[]) => ({ eq: (_k: string, _v: any) => ({ maybeSingle: async () => ({ data: { user_id: "u1", status: "pending", last_payment_id: "p1" } }) }) }),
        upsert: async (payload: any) => { calls.push({ table, action: "upsert", payload }); return { data: null, error: null }; },
        update: (payload: any) => ({ eq: (_k: string, _v: any) => { calls.push({ table, action: "update", payload }); return Promise.resolve({ data: null, error: null }); } }),
      } as any;
    },
  } as any;
  return { client, calls };
};

const makeRes = () => {
  let statusCode = 200;
  let jsonBody: any = null;
  const res: any = {
    status(code: number) { statusCode = code; return this; },
    json(body: any) { jsonBody = body; return this; },
  } as any;
  return { res, getStatus: () => statusCode, getBody: () => jsonBody };
};

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.SUPABASE_URL = "http://localhost";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "key";
  process.env.MP_PLATFORM_ACCESS_TOKEN = "mp_token";
});

describe("create-subscription handler", () => {
  it("creates trial plan with correct payload", async () => {
    const fetchSpy = vi.spyOn(global, "fetch" as any).mockResolvedValue({ ok: true, json: async () => ({ id: 123, status: "pending", point_of_interaction: { transaction_data: { qr_code: "code", qr_code_base64: "b64" } } }) } as any);
    const { client } = mockSupabase();
    vi.mock("@supabase/supabase-js", () => ({ createClient: () => client }));

    const req: any = { method: "POST", body: { userId: "u1", buyerEmail: "e@x.com", buyerName: "John", planType: "trial" } } as any;
    const { res, getStatus, getBody } = makeRes();
    await createSubscriptionHandler(req, res);
    expect(getStatus()).toBe(200);
    expect(getBody().payment_id).toBe("123");
    const bodyArg = (fetchSpy.mock.calls[0]?.[1]?.body) as string;
    const payload = JSON.parse(bodyArg);
    expect(payload.transaction_amount).toBe(2);
    expect(payload.description).toBe("Plano de teste - 5 minutos");
    expect(payload.external_reference).toContain("-trial");
  });

  it("creates monthly plan with correct payload", async () => {
    const fetchSpy = vi.spyOn(global, "fetch" as any).mockResolvedValue({ ok: true, json: async () => ({ id: 456, status: "pending", point_of_interaction: { transaction_data: { qr_code: "code", qr_code_base64: "b64" } } }) } as any);
    const { client } = mockSupabase();
    vi.mock("@supabase/supabase-js", () => ({ createClient: () => client }));

    const req: any = { method: "POST", body: { userId: "u2", buyerEmail: "y@x.com", buyerName: "Ana" } } as any;
    const { res, getStatus } = makeRes();
    await createSubscriptionHandler(req, res);
    expect(getStatus()).toBe(200);
    const bodyArg = (fetchSpy.mock.calls[0]?.[1]?.body) as string;
    const payload = JSON.parse(bodyArg);
    expect(payload.transaction_amount).toBe(37.9);
    expect(payload.description).toBe("Assinatura Mensal");
    expect(String(payload.external_reference)).not.toContain("trial");
  });
});

describe("check-subscription-status handler", () => {
  it("activates trial with 5 minutes expiration", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const { client, calls } = mockSupabase();
    vi.mock("@supabase/supabase-js", () => ({ createClient: () => client }));
    vi.spyOn(global, "fetch" as any).mockResolvedValue({ ok: true, json: async () => ({ status: "approved", external_reference: "subscription-u1-trial" }) } as any);
    const req: any = { method: "GET", query: { userId: "u1" } } as any;
    const { res, getStatus } = makeRes();
    await checkSubscriptionStatusHandler(req, res);
    expect(getStatus()).toBe(200);
    const update = calls.find(c => c.action === "update" && c.table === "subscriptions");
    expect(update).toBeTruthy();
    const exp = new Date(update.payload.expires_at);
    expect(exp.getTime()).toBe(new Date("2025-01-01T00:05:00Z").getTime());
    vi.useRealTimers();
  });

  it("activates monthly with 30 days expiration", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const { client, calls } = mockSupabase();
    vi.mock("@supabase/supabase-js", () => ({ createClient: () => client }));
    vi.spyOn(global, "fetch" as any).mockResolvedValue({ ok: true, json: async () => ({ status: "approved", external_reference: "subscription-u1" }) } as any);
    const req: any = { method: "GET", query: { userId: "u1" } } as any;
    const { res, getStatus } = makeRes();
    await checkSubscriptionStatusHandler(req, res);
    expect(getStatus()).toBe(200);
    const update = calls.find(c => c.action === "update" && c.table === "subscriptions");
    expect(update).toBeTruthy();
    const exp = new Date(update.payload.expires_at);
    expect(exp.getTime()).toBe(new Date("2025-01-31T00:00:00Z").getTime());
    vi.useRealTimers();
  });
});
