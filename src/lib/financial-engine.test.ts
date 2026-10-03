import { describe, it, expect } from "vitest";
import {
  computeEngine,
  monthlyPlanFor,
  daysInMonth,
  pettyCashFundBalance,
  type FinEngineConfig,
} from "./financial-engine";

const cfg: FinEngineConfig = {
  systemStartDate: "2026-10-03",
  monthlyBaseTarget: 93.5,
  rentAmount: 250,
  rentStartDate: "2027-02-01",
};

// October 2026, start Oct 3 → 29 days, base daily = 93.50 / 29 ≈ 3.2241
const BASE = 93.5 / 29;

describe("monthly plan", () => {
  it("is $93.50 before rent starts", () => {
    expect(monthlyPlanFor("2026-10", cfg)).toBe(93.5);
    expect(monthlyPlanFor("2027-01", cfg)).toBe(93.5);
  });
  it("is $343.50 from February 2027", () => {
    expect(monthlyPlanFor("2027-02", cfg)).toBe(343.5);
    expect(monthlyPlanFor("2027-03", cfg)).toBe(343.5);
  });
  it("daysInMonth is correct", () => {
    expect(daysInMonth("2026-10")).toBe(31);
    expect(daysInMonth("2027-02")).toBe(28);
  });
});

describe("daily target engine", () => {
  it("Test 1 — target fully met: no deficit, no surplus", () => {
    const r = computeEngine("2026-10-03", cfg, { "2026-10-03": BASE });
    expect(r.today!.adjustedTarget).toBeCloseTo(BASE, 2);
    expect(r.today!.deficit).toBe(0);
    expect(r.today!.surplus).toBe(0);
  });

  it("Test 2 — target missed: deficit carries to next day", () => {
    const r = computeEngine("2026-10-04", cfg, { "2026-10-03": 2.0 });
    const d1 = r.activeCycle!.days[0];
    const d2 = r.activeCycle!.days[1];
    expect(d1.deficit).toBeCloseTo(BASE - 2.0, 2);
    expect(d2.adjustedTarget).toBeCloseTo(BASE + (BASE - 2.0), 2);
  });

  it("Test 3 — target exceeded: surplus reduces next day", () => {
    const r = computeEngine("2026-10-04", cfg, { "2026-10-03": 5.0 });
    const d1 = r.activeCycle!.days[0];
    const d2 = r.activeCycle!.days[1];
    expect(d1.surplus).toBeCloseTo(5.0 - BASE, 2);
    expect(d2.adjustedTarget).toBeCloseTo(Math.max(0, BASE - (5.0 - BASE)), 2);
  });

  it("Test 4 — surplus larger than next day target: target floors at $0, remainder carries", () => {
    const r = computeEngine("2026-10-04", cfg, { "2026-10-03": BASE + 10 });
    const d2 = r.activeCycle!.days[1];
    expect(d2.adjustedTarget).toBe(0);
    expect(d2.surplusCarryAfter).toBeCloseTo(10 - BASE, 2);
  });

  it("Test 5 — surplus covers prior deficit first", () => {
    // Day1: achieve 1.22 → deficit 2.00. Day2: achieve adjusted+5 → surplus 5, deficit gone.
    const r = computeEngine("2026-10-04", cfg, {
      "2026-10-03": BASE - 2.0,
      "2026-10-04": BASE + 2.0 + 5.0,
    });
    const d2 = r.activeCycle!.days[1];
    expect(d2.deficit).toBe(0);
    expect(d2.surplus).toBeCloseTo(5.0, 2);
    expect(d2.surplusCarryAfter).toBeCloseTo(5.0, 2);
  });
});

describe("month-end closing", () => {
  const novCfg: FinEngineConfig = { ...cfg, systemStartDate: "2026-10-01" };

  it("Test 6 — closing deficit carries into next month burden", () => {
    // October: no achievement at all → closing deficit = full 93.50.
    // Use a smaller scenario: achieve all but $20.
    const dailyNet: Record<string, number> = {};
    // Give October exactly 73.50 total achievement on Oct 1.
    dailyNet["2026-10-01"] = 73.5;
    const r = computeEngine("2026-11-01", novCfg, dailyNet);
    const oct = r.cycles.find((c) => c.monthKey === "2026-10")!;
    const nov = r.cycles.find((c) => c.monthKey === "2026-11")!;
    expect(oct.closed).toBe(true);
    expect(oct.closingDeficit).toBeCloseTo(20.0, 1);
    expect(nov.openingDeficit).toBeCloseTo(oct.closingDeficit, 2);
    expect(nov.burden).toBeCloseTo(93.5 + oct.closingDeficit, 2);
    expect(nov.baseDailyTarget).toBeCloseTo(nov.burden / 30, 2);
  });

  it("Test 7 — closing surplus does NOT carry into next month", () => {
    const dailyNet: Record<string, number> = { "2026-10-01": 113.5 }; // 20 over plan
    const r = computeEngine("2026-11-01", novCfg, dailyNet);
    const oct = r.cycles.find((c) => c.monthKey === "2026-10")!;
    const nov = r.cycles.find((c) => c.monthKey === "2026-11")!;
    expect(oct.closingSurplus).toBeGreaterThan(0);
    expect(nov.openingDeficit).toBe(0);
    expect(nov.burden).toBe(93.5);
    expect(nov.baseDailyTarget).toBeCloseTo(93.5 / 30, 2);
  });

  it("Test 12 — rollover is idempotent: same inputs, same outputs", () => {
    const dailyNet: Record<string, number> = { "2026-10-01": 50 };
    const a = computeEngine("2026-11-01", novCfg, dailyNet);
    const b = computeEngine("2026-11-01", novCfg, dailyNet);
    expect(a.cycles.length).toBe(b.cycles.length);
    expect(a.cycles.find((c) => c.monthKey === "2026-11")!.openingDeficit).toBe(
      b.cycles.find((c) => c.monthKey === "2026-11")!.openingDeficit,
    );
    // October record preserved unchanged
    expect(a.cycles[0].totalAchievement).toBe(b.cycles[0].totalAchievement);
  });
});

describe("petty cash fund", () => {
  it("Test 8/9 — funding is not an expense; spending reduces the fund", () => {
    const transfers = [
      { id: "t1", date: "2026-10-03", fromAccountId: "a1", fromAccountName: "EVC Plus", amount: 20, createdBy: "u", createdAt: "" },
    ];
    expect(pettyCashFundBalance(transfers, 0)).toBe(20);
    expect(pettyCashFundBalance(transfers, 5)).toBe(15);
  });
});
