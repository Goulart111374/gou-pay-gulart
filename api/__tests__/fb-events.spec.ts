import handler from "../fb-events";

function createMockRes() {
  const result: { status?: number; json?: any } = {};
  const res: any = {
    status(code: number) { result.status = code; return this; },
    json(payload: any) { result.json = payload; return this; },
  };
  return { res, result };
}

describe("api/fb-events handler", () => {
  it("rejects non-POST methods", async () => {
    const { res, result } = createMockRes();
    await handler({ method: "GET" } as any, res);
    expect(result.status).toBe(405);
    expect(result.json.error).toBeDefined();
  });

  it("validates required fields", async () => {
    const { res, result } = createMockRes();
    await handler({ method: "POST", body: {} } as any, res);
    expect(result.status).toBe(400);
    expect(result.json.error).toBe("Invalid or missing pixel_id");
  });

  it("validates token length", async () => {
    const { res, result } = createMockRes();
    await handler({ method: "POST", body: { pixel_id: "12345678", token: "short", event: { name: "PageView", time: Date.now() } } } as any, res);
    expect(result.status).toBe(400);
    expect(result.json.error).toBe("Invalid or missing token");
  });

  it("validates event presence", async () => {
    const { res, result } = createMockRes();
    await handler({ method: "POST", body: { pixel_id: "12345678", token: "A".repeat(30) } } as any, res);
    expect(result.status).toBe(400);
    expect(result.json.error).toBe("Invalid or missing event");
  });
});

