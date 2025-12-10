import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { setApiToken, setPixelId } from "@/utils/fb";
import { beforeAll } from "vitest";

const memStore: Record<string, string> = {};
// @ts-ignore
globalThis.localStorage = globalThis.localStorage || {
  getItem: (k: string) => (k in memStore ? memStore[k] : null),
  setItem: (k: string, v: string) => { memStore[k] = String(v); },
  removeItem: (k: string) => { delete memStore[k]; },
  clear: () => { for (const k of Object.keys(memStore)) delete memStore[k]; },
};

let Integration: any;
beforeAll(async () => {
  Integration = (await import("../Integration")).default;
});

describe("Aba Integração", () => {
  it("renderiza com título e campos do Facebook Pixel", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/dashboard/integration"]}>
        <Integration />
      </MemoryRouter>
    );
    expect(html).toContain("Integração");
    expect(html).toContain("Facebook Pixel");
    expect(html).toContain("ID Pixel");
    expect(html).toContain("Token Pixel API");
  });

  // Render SSR validates a11y labels and static structure
});
