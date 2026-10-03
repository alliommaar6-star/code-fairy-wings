import { describe, it, expect } from "vitest";
import { calcPurchase, withLandedUnitCosts } from "./purchase-calc";

const item = { productId: "a", productName: "A", quantity: 100, unit: "PCS", costPrice: 10, total: 1000 };

describe("purchase-calc", () => {
  it("international: spec example", () => {
    const p = {
      purchaseType: "INTERNATIONAL" as const, items: [item], discount: 0,
      directCosts: { alibabaFee: 20, chinaFreight: 50, mastercardFee: 15 },
      cargo: { cargoCost: 300, expenses: { xamaali: 20, transportation: 15, other: 5 } },
    };
    const c = calcPurchase(p);
    expect(c.landedCost).toBe(1385);
    expect(c.operationalExpenses).toBe(40);
    expect(c.totalCashOutflow).toBe(1425);
    expect(withLandedUnitCosts(p)[0].landedUnitCost).toBe(13.85);
  });
  it("local: expenses never in unit cost", () => {
    const p = { purchaseType: "LOCAL" as const, items: [item], discount: 0, expenses: { xamaali: 10 },
      directCosts: { alibabaFee: 99 }, cargo: { cargoCost: 99 } };
    expect(calcPurchase(p).landedCost).toBe(1000);
    expect(withLandedUnitCosts(p)[0].landedUnitCost).toBe(10);
  });
});
