import { describe, it, expect } from "vitest";
import { computeMonthlyExpiry, formatRemainingMessage, shouldShowUpgradeTabNotifications, getReminderSchedule, shouldSchedule, markScheduled, type SimpleStore } from "./subscription";

describe("subscription notification", () => {
  it("computes monthly expiry 30 days after activation", () => {
    const start = new Date("2025-12-01T00:00:00.000Z");
    const expiry = new Date(computeMonthlyExpiry(start));
    const diff = (expiry.getTime() - start.getTime());
    expect(Math.round(diff / (24 * 60 * 60_000))).toBe(30);
  });

  it("suppress upgrade notifications when subscription is active", () => {
    const info = { status: "active", expires_at: new Date(Date.now() + 5 * 24 * 60 * 60_000).toISOString() };
    expect(shouldShowUpgradeTabNotifications(info)).toBe(false);
  });

  it("schedules reminders exactly 3 days and 1 day before", () => {
    const now = new Date("2025-12-01T00:00:00.000Z").getTime();
    const end = new Date(now + 30 * 24 * 60 * 60_000).toISOString();
    const sched = getReminderSchedule(end);
    expect(sched.length).toBe(2);
    const labels = sched.map((s) => s.label.toLowerCase());
    expect(labels).toContain("sua assinatura expira em 3 dias");
    expect(labels).toContain("sua assinatura expira em 1 dia");
    const atTimes = sched.map((s) => s.at);
    const expected3d = new Date(end).getTime() - 3 * 24 * 60 * 60_000;
    const expected1d = new Date(end).getTime() - 24 * 60 * 60_000;
    expect(atTimes).toContain(expected3d);
    expect(atTimes).toContain(expected1d);
  });

  it("does not reschedule reminders repeatedly for same expiration", () => {
    const mem: Record<string, string> = {};
    const store: SimpleStore = {
      getItem(k) { return mem[k] ?? null; },
      setItem(k, v) { mem[k] = v; },
    };
    const exp = new Date("2025-12-31T00:00:00.000Z").toISOString();
    expect(shouldSchedule(exp, store)).toBe(true);
    markScheduled(exp, store);
    expect(shouldSchedule(exp, store)).toBe(false);
  });

  it("formats remaining message correctly", () => {
    const sixDaysMs = 6 * 24 * 60 * 60_000;
    const msgDays = formatRemainingMessage(sixDaysMs);
    expect(msgDays.toLowerCase()).toContain("6 dia");

    const fiveHoursMs = 5 * 60 * 60_000;
    const msgHours = formatRemainingMessage(fiveHoursMs);
    expect(msgHours.toLowerCase()).toContain("5 hora");

    const fifteenMinutesMs = 15 * 60_000;
    const msgMinutes = formatRemainingMessage(fifteenMinutesMs);
    expect(msgMinutes.toLowerCase()).toContain("15 minuto");
  });
});
