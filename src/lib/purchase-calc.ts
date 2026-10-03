import type { Purchase, PurchaseItem, PurchaseOpExpenses } from "@/types";

/**
 * Single source of truth for purchase COST vs EXPENSE.
 * COST    = product + Alibaba fee + China freight + Mastercard fee + cargo cost (capitalized).
 * EXPENSE = Xamaali + transportation + other (operational, never in unit cost).
 */
const n = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0);
const r2 = (v: number) => Math.round(v * 100) / 100;

export const sumExpenses = (e?: PurchaseOpExpenses) =>
  r2(n(e?.xamaali) + n(e?.transportation) + n(e?.other));

export type PurchaseCalcInput = Pick<Purchase, "items" | "discount" | "directCosts" | "expenses" | "cargo" | "purchaseType">;

export function calcPurchase(p: PurchaseCalcInput) {
  const intl = p.purchaseType === "INTERNATIONAL";
  const productCost = r2(Math.max(0, p.items.reduce((s, i) => s + n(i.total), 0) - n(p.discount)));
  const dc = intl ? p.directCosts ?? {} : {};
  const directFees = r2(n(dc.alibabaFee) + n(dc.chinaFreight) + n(dc.mastercardFee));
  const cargoCost = intl ? r2(n(p.cargo?.cargoCost)) : 0;
  const landedCost = r2(productCost + directFees + cargoCost);
  const purchaseExpenses = sumExpenses(p.expenses);
  const cargoExpenses = intl ? sumExpenses(p.cargo?.expenses) : 0;
  const operationalExpenses = r2(purchaseExpenses + cargoExpenses);
  const quantity = p.items.reduce((s, i) => s + n(i.quantity), 0);
  return {
    productCost,
    directFees,
    cargoCost,
    landedCost,
    purchaseExpenses,
    cargoExpenses,
    operationalExpenses,
    totalCashOutflow: r2(landedCost + operationalExpenses),
    /** Owed to the supplier: products + supplier-side fees (cargo is paid to the agent). */
    supplierPayable: r2(productCost + directFees),
    quantity,
    avgLandedUnitCost: quantity > 0 ? r2(landedCost / quantity) : 0,
  };
}

/** Spread extra direct costs over items by value share → landed unit cost per item. */
export function withLandedUnitCosts<T extends PurchaseItem>(p: PurchaseCalcInput & { items: T[] }): T[] {
  const c = calcPurchase(p);
  const gross = p.items.reduce((s, i) => s + n(i.total), 0);
  const extra = c.landedCost - gross; // fees + cargo − discount
  return p.items.map((i) => {
    const share = gross > 0 ? n(i.total) / gross : 1 / Math.max(1, p.items.length);
    const lineLanded = n(i.total) + extra * share;
    return { ...i, landedUnitCost: n(i.quantity) > 0 ? r2(lineLanded / n(i.quantity)) : n(i.costPrice) };
  });
}

export const LOCAL_STAGES = ["Draft", "Ordered", "Paid", "Received"] as const;
export const INTL_STAGES = ["Ordered", "Paid", "Shipped", "In Transit", "Arrived", "Received"] as const;
