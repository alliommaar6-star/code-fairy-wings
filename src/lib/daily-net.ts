import type { Sale, Order, Expense, Income } from "../types";
import { getBranchState } from "./branch-store";

/**
 * Delivery cost paid by the business (not charged to the customer).
 * Treated as a sale expense: it is deducted from net profit and never
 * added to the customer's payable amount.
 */
export function businessDeliveryCost(x: {
  deliveryFeePayer?: "Customer" | "Business";
  deliveryRate?: number;
  deliveryFee?: number;
  cargoFee?: number;
  fulfillmentType?: string;
}): number {
  if (x.deliveryFeePayer !== "Business") return 0;
  if (x.fulfillmentType === "Cargo") return x.cargoFee || 0;
  return x.deliveryRate ?? x.deliveryFee ?? 0;
}

/**
 * Daily net profit map for the Financial Engine.
 * Per date: sale gross profit (completed sales + delivered unconverted orders)
 * − business-paid delivery expense + branch profit (total − cost − commission)
 * + other income − expenses.
 * This mirrors getTodayStats in StoreContext so the whole app uses one rule.
 */
export function buildDailyNetMap(
  sales: Sale[],
  orders: Order[],
  expenses: Expense[],
  incomes: Income[],
): Record<string, number> {
  const map: Record<string, number> = {};
  const add = (date: string, amount: number) => {
    if (!date) return;
    map[date] = (map[date] || 0) + amount;
  };

  for (const s of sales) {
    if (s.status === "Completed")
      add(s.date, s.grossProfit - businessDeliveryCost(s));
  }
  for (const o of orders) {
    if (o.status === "delivered" && !o.convertedSaleId) {
      const cost = (o.items || []).reduce(
        (sum, it) => sum + (it.costPrice || 0) * it.quantity,
        0,
      );
      add(o.date, o.total - cost - businessDeliveryCost(o));
    }
  }
  for (const bs of getBranchState().sales) {
    add(bs.date, bs.total - bs.cost - bs.commission);
  }
  for (const i of incomes) add(i.date, i.amount);
  for (const e of expenses) add(e.date, -e.amount);

  return map;
}
