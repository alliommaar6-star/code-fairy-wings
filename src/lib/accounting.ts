import { useSyncExternalStore } from "react";
import type {
  Sale,
  Order,
  Purchase,
  Expense,
  Income,
  SaleReturn,
  PaymentAccount,
  Product,
  SupplierPayment,
  InventoryMovement,
  Customer,
  Supplier,
} from "../types";

// ---------- Chart of accounts ----------
export type AccType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
export const CHART: Record<string, AccType> = {
  "Cash & Bank": "Asset",
  "Accounts Receivable": "Asset",
  Inventory: "Asset",
  "Accounts Payable": "Liability",
  "Customer Deposits": "Liability",
  "Owner's Equity": "Equity",
  "Sales Revenue": "Revenue",
  "Delivery Income": "Revenue",
  "Other Income": "Revenue",
  "Sales Returns": "Expense",
  "Inventory Shrinkage": "Expense",
  "Inventory Gain": "Revenue",
  "Cost of Goods Sold": "Expense",
};
export const CASH = "Cash & Bank";
export const AR = "Accounts Receivable";
export const INV = "Inventory";
export const AP = "Accounts Payable";
export const DEP = "Customer Deposits";
export const EQ = "Owner's Equity";

export function accType(name: string): AccType {
  if (CHART[name]) return CHART[name];
  if (/^Expense:/i.test(name)) return "Expense";
  if (/^Income:/i.test(name)) return "Revenue";
  if (/payable|loan|deposit|deyn/i.test(name)) return "Liability";
  if (/equity|capital|raasumaal|drawing/i.test(name)) return "Equity";
  if (/revenue|income|dakhli/i.test(name)) return "Revenue";
  if (/expense|kharash|cost/i.test(name)) return "Expense";
  return "Asset";
}

export type JLine = { account: string; debit: number; credit: number };
export type JEntry = {
  id: string;
  date: string;
  ref: string;
  memo: string;
  source: string;
  lines: JLine[];
};

// ---------- Manual journal store (synced via cloud-sync: benadir_ prefix) ----------
const MKEY = "benadir_journal_manual_v1";
let manual: JEntry[] = [];
let loaded = false;
const listeners = new Set<() => void>();
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const r = localStorage.getItem(MKEY);
    if (r) manual = JSON.parse(r);
  } catch {
    /* ignore */
  }
  window.addEventListener("benadir-remote-update", () => {
    try {
      const r = localStorage.getItem(MKEY);
      manual = r ? JSON.parse(r) : [];
      listeners.forEach((l) => l());
    } catch {
      /* ignore */
    }
  });
}
export function useManualJournal() {
  load();
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => manual,
    () => manual,
  );
}
export function addManualEntry(e: Omit<JEntry, "id" | "source">) {
  load();
  const dr = e.lines.reduce((s, l) => s + (+l.debit || 0), 0);
  const cr = e.lines.reduce((s, l) => s + (+l.credit || 0), 0);
  if (Math.abs(dr - cr) > 0.005 || dr <= 0) throw new Error("Debits must equal credits.");
  manual = [...manual, { ...e, id: `JE-${Date.now().toString(36)}`, source: "Manual / AI" }];
  try {
    localStorage.setItem(MKEY, JSON.stringify(manual));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}
export function removeManualEntry(id: string) {
  load();
  manual = manual.filter((m) => m.id !== id);
  try {
    localStorage.setItem(MKEY, JSON.stringify(manual));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

// ---------- Engine ----------
export type BookData = {
  sales: Sale[];
  orders: Order[];
  purchases: Purchase[];
  expenses: Expense[];
  incomes: Income[];
  returns: SaleReturn[];
  accounts: PaymentAccount[];
  products: Product[];
  supplierPayments: SupplierPayment[];
  inventoryMovements: InventoryMovement[];
  customers: Customer[];
  suppliers: Supplier[];
};
const r2 = (n: number) => Math.round((n || 0) * 100) / 100;

export function buildBooks(d: BookData, manualEntries: JEntry[]) {
  const E: JEntry[] = [];
  const push = (date: string, ref: string, memo: string, source: string, lines: JLine[]) => {
    const ls = lines
      .filter((l) => r2(l.debit) || r2(l.credit))
      .map((l) => ({ ...l, debit: r2(l.debit), credit: r2(l.credit) }));
    if (ls.length) E.push({ id: `${source}-${ref}`, date, ref, memo, source, lines: ls });
  };
  const soldOrderIds = new Set(d.sales.map((s) => s.orderId).filter(Boolean));

  for (const s of d.sales) {
    if ((s.status as string) === "voided" || (s.status as string) === "cancelled") continue;
    const del = s.deliveryFee || 0;
    push(s.date, s.invoiceNo, `Sale — ${s.customerName}`, "Sale", [
      { account: CASH, debit: s.amountPaid || 0, credit: 0 },
      { account: AR, debit: Math.max(0, s.remainingBalance || 0), credit: 0 },
      { account: "Sales Revenue", debit: 0, credit: (s.grandTotal || 0) - del },
      { account: "Delivery Income", debit: 0, credit: del },
    ]);
    if (s.costOfGoods)
      push(s.date, `${s.invoiceNo}-C`, `Cost of goods sold — ${s.invoiceNo}`, "COGS", [
        { account: "Cost of Goods Sold", debit: s.costOfGoods, credit: 0 },
        { account: INV, debit: 0, credit: s.costOfGoods },
      ]);
  }
  for (const o of d.orders) {
    if (
      soldOrderIds.has(o.id) ||
      o.status === "cancelled" ||
      o.status === "converted" ||
      !(o.paidAmount > 0)
    )
      continue;
    push(o.date, o.orderNo, `Order advance — ${o.customerName}`, "Order", [
      { account: CASH, debit: o.paidAmount, credit: 0 },
      { account: DEP, debit: 0, credit: o.paidAmount },
    ]);
  }
  for (const p of d.purchases) {
    if ((p as { status?: string }).status === "cancelled") continue;
    push(p.date, p.purchaseNo, `Purchase — ${p.supplierName}`, "Purchase", [
      { account: INV, debit: p.totalAmount || 0, credit: 0 },
      { account: CASH, debit: 0, credit: p.paidAmount || 0 },
      { account: AP, debit: 0, credit: Math.max(0, p.supplierBalance || 0) },
    ]);
  }
  for (const x of d.expenses) {
    const expenseAccount = x.customExpenseName?.trim()
      ? `Expense: Other / ${x.customExpenseName.trim()}`
      : `Expense: ${x.category}`;
    const creditAccount = x.paidFromAccountName?.trim() || CASH;
    push(x.date, x.id.slice(-6), x.title, x.isPettyCash ? "Petty Cash" : "Expense", [
      { account: expenseAccount, debit: x.amount, credit: 0 },
      { account: creditAccount, debit: 0, credit: x.amount },
    ]);
  }
  for (const x of d.incomes)
    push(x.date, x.id.slice(-6), x.title, "Income", [
      { account: CASH, debit: x.amount, credit: 0 },
      { account: `Income: ${x.category}`, debit: 0, credit: x.amount },
    ]);
  for (const x of d.returns)
    push(x.date, x.returnNo, `Sales return — ${x.customerName}`, "Return", [
      { account: "Sales Returns", debit: x.totalRefund, credit: 0 },
      { account: CASH, debit: 0, credit: x.totalRefund },
    ]);
  for (const sp of d.supplierPayments || [])
    push(
      sp.date,
      sp.paymentNo || sp.id.slice(-6),
      `Supplier payment — ${sp.supplierName}`,
      "SupplierPay",
      [
        { account: AP, debit: sp.amount, credit: 0 },
        { account: CASH, debit: 0, credit: sp.amount },
      ],
    );
  const purchaseNos = new Set(d.purchases.map((p) => p.purchaseNo));
  for (const mv of d.inventoryMovements || []) {
    const val = Math.abs(mv.quantityChange || 0) * (mv.costPrice || 0);
    if (!val) continue;
    const ref = mv.referenceNo || mv.id.slice(-6);
    if (
      (mv.type === "purchase" && !purchaseNos.has(mv.referenceNo || "")) ||
      mv.type === "opening"
    ) {
      push(
        mv.date,
        ref,
        `${mv.type === "opening" ? "Opening stock" : "Restock"} — ${mv.productName} (+${mv.quantityChange})`,
        mv.type === "opening" ? "OpeningStock" : "Restock",
        [
          { account: INV, debit: val, credit: 0 },
          { account: EQ, debit: 0, credit: val },
        ],
      );
    } else if (mv.type === "adjustment" || mv.type === "damage" || mv.type === "loss") {
      const up = (mv.quantityChange || 0) > 0;
      push(
        mv.date,
        ref,
        `Stock ${mv.type} — ${mv.productName} (${mv.quantityChange})${mv.reason ? " · " + mv.reason : ""}`,
        "StockAdj",
        up
          ? [
              { account: INV, debit: val, credit: 0 },
              { account: "Inventory Gain", debit: 0, credit: val },
            ]
          : [
              { account: "Inventory Shrinkage", debit: val, credit: 0 },
              { account: INV, debit: 0, credit: val },
            ],
      );
    }
  }
  E.push(...manualEntries);

  // Opening balances: reconcile books to actual account balances & stock value.
  const bal = (acc: string) =>
    E.reduce(
      (s, e) =>
        s + e.lines.filter((l) => l.account === acc).reduce((a, l) => a + l.debit - l.credit, 0),
      0,
    );
  const actualCash = d.accounts
    .filter((a) => a.isActive !== false)
    .reduce((s, a) => s + (a.balance || 0), 0);
  const actualInv = d.products.reduce(
    (s, p) => s + (p.costPrice || 0) * Math.max(0, p.stock || 0),
    0,
  );
  const cashAdj = r2(actualCash - bal(CASH));
  const invAdj = r2(actualInv - bal(INV));
  const first = E.reduce((m, e) => (e.date && e.date < m ? e.date : m), "9999-12-31");
  const openLines: JLine[] = [];
  if (cashAdj)
    openLines.push(
      cashAdj > 0
        ? { account: CASH, debit: cashAdj, credit: 0 }
        : { account: CASH, debit: 0, credit: -cashAdj },
    );
  if (invAdj)
    openLines.push(
      invAdj > 0
        ? { account: INV, debit: invAdj, credit: 0 }
        : { account: INV, debit: 0, credit: -invAdj },
    );
  const net = openLines.reduce((s, l) => s + l.debit - l.credit, 0);
  if (openLines.length) {
    openLines.push(
      net > 0
        ? { account: EQ, debit: 0, credit: r2(net) }
        : { account: EQ, debit: r2(-net), credit: 0 },
    );
    E.unshift({
      id: "OPEN",
      date: first === "9999-12-31" ? new Date().toISOString().slice(0, 10) : first,
      ref: "OPEN",
      memo: "Opening balance / reconciliation to actual account & stock balances",
      source: "Opening",
      lines: openLines,
    });
  }
  E.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  // Ledger + trial balance
  const ledger: Record<
    string,
    { date: string; ref: string; memo: string; debit: number; credit: number; balance: number }[]
  > = {};
  const totals: Record<string, { debit: number; credit: number }> = {};
  for (const e of E)
    for (const l of e.lines) {
      const t = (totals[l.account] ??= { debit: 0, credit: 0 });
      t.debit += l.debit;
      t.credit += l.credit;
      const rows = (ledger[l.account] ??= []);
      const prev = rows.length ? rows[rows.length - 1].balance : 0;
      const normalDebit = ["Asset", "Expense"].includes(accType(l.account));
      rows.push({
        date: e.date,
        ref: e.ref,
        memo: e.memo,
        debit: l.debit,
        credit: l.credit,
        balance: r2(prev + (normalDebit ? l.debit - l.credit : l.credit - l.debit)),
      });
    }
  const trial = Object.entries(totals)
    .map(([account, t]) => {
      const net = r2(t.debit - t.credit);
      return {
        account,
        type: accType(account),
        debit: net > 0 ? net : 0,
        credit: net < 0 ? -net : 0,
      };
    })
    .sort(
      (a, b) =>
        ["Asset", "Liability", "Equity", "Revenue", "Expense"].indexOf(a.type) -
        ["Asset", "Liability", "Equity", "Revenue", "Expense"].indexOf(b.type),
    );
  const tbDebit = r2(trial.reduce((s, t) => s + t.debit, 0));
  const tbCredit = r2(trial.reduce((s, t) => s + t.credit, 0));

  const sum = (type: AccType) =>
    trial
      .filter((t) => t.type === type)
      .map((t) => ({
        account: t.account,
        amount: r2(["Asset", "Expense"].includes(type) ? t.debit - t.credit : t.credit - t.debit),
      }));
  const revenue = sum("Revenue"),
    expenses = sum("Expense");
  const totalRevenue = r2(revenue.reduce((s, x) => s + x.amount, 0));
  const totalExpenses = r2(expenses.reduce((s, x) => s + x.amount, 0));
  const netIncome = r2(totalRevenue - totalExpenses);
  const assets = sum("Asset"),
    liabilities = sum("Liability"),
    equity = sum("Equity");
  const totalAssets = r2(assets.reduce((s, x) => s + x.amount, 0));
  const totalLiab = r2(liabilities.reduce((s, x) => s + x.amount, 0));
  const totalEquity = r2(equity.reduce((s, x) => s + x.amount, 0) + netIncome);

  return {
    entries: E,
    ledger,
    trial,
    tbDebit,
    tbCredit,
    pnl: { revenue, expenses, totalRevenue, totalExpenses, netIncome },
    bs: { assets, liabilities, equity, totalAssets, totalLiab, totalEquity },
  };
}
export type Books = ReturnType<typeof buildBooks>;

export function booksSnapshot(b: Books, d: BookData) {
  const receivables = d.sales
    .filter((s) => (s.remainingBalance || 0) > 0)
    .map((s) => ({
      inv: s.invoiceNo,
      customer: s.customerName,
      due: s.remainingBalance,
      date: s.date,
    }))
    .slice(0, 40);
  const payables = d.purchases
    .filter((p) => (p.supplierBalance || 0) > 0)
    .map((p) => ({
      po: p.purchaseNo,
      supplier: p.supplierName,
      due: p.supplierBalance,
      date: p.date,
    }))
    .slice(0, 40);
  const monthly: Record<string, { sales: number; expenses: number }> = {};
  for (const s of d.sales) {
    const m = (s.date || "").slice(0, 7);
    (monthly[m] ??= { sales: 0, expenses: 0 }).sales += s.grandTotal || 0;
  }
  for (const x of d.expenses) {
    const m = (x.date || "").slice(0, 7);
    (monthly[m] ??= { sales: 0, expenses: 0 }).expenses += x.amount || 0;
  }
  return {
    today: new Date().toISOString().slice(0, 10),
    currency: "USD",
    paymentAccounts: d.accounts.map((a) => ({ name: a.name, type: a.type, balance: a.balance })),
    counts: {
      sales: d.sales.length,
      orders: d.orders.length,
      purchases: d.purchases.length,
      expenses: d.expenses.length,
      incomes: d.incomes.length,
      returns: d.returns.length,
      products: d.products.length,
    },
    trialBalance: { rows: b.trial, totalDebit: b.tbDebit, totalCredit: b.tbCredit },
    profitAndLoss: b.pnl,
    balanceSheet: b.bs,
    monthly,
    receivables,
    payables,
    ratios: (() => {
      const g = (n: string) => b.trial.find((t) => t.account === n);
      const sales = b.pnl.revenue.find((r) => r.account === "Sales Revenue")?.amount || 0;
      const cogs = b.pnl.expenses.find((r) => r.account === "Cost of Goods Sold")?.amount || 0;
      const ca = (g(CASH)?.debit || 0) + (g(AR)?.debit || 0) + (g(INV)?.debit || 0);
      const cl = b.bs.totalLiab;
      return {
        grossMarginPct: sales ? +(((sales - cogs) / sales) * 100).toFixed(1) : null,
        netMarginPct: b.pnl.totalRevenue
          ? +((b.pnl.netIncome / b.pnl.totalRevenue) * 100).toFixed(1)
          : null,
        currentRatio: cl ? +(ca / cl).toFixed(2) : null,
      };
    })(),
    products: d.products
      .slice(0, 80)
      .map((p) => ({
        name: p.name,
        stock: p.stock,
        cost: p.costPrice,
        price: (p as { sellingPrice?: number }).sellingPrice,
        category: (p as { category?: string }).category,
      })),
    customersWithBalance: (d.customers || [])
      .filter((c) => (c.balance || 0) > 0)
      .map((c) => ({ name: c.name, balance: c.balance }))
      .slice(0, 40),
    suppliersWithBalance: (d.suppliers || [])
      .filter((c) => (c.balance || 0) > 0)
      .map((c) => ({ name: c.name, balance: c.balance }))
      .slice(0, 40),
    recentSales: d.sales
      .slice(-40)
      .map((s) => ({
        inv: s.invoiceNo,
        date: s.date,
        customer: s.customerName,
        total: s.grandTotal,
        paid: s.amountPaid,
        due: s.remainingBalance,
        cogs: s.costOfGoods,
        method: s.paymentMethod,
      })),
    recentExpenses: d.expenses
      .slice(-30)
      .map((x) => ({
        date: x.date,
        title: x.title,
        category: x.category,
        amount: x.amount,
        account: x.paidFromAccountName,
      })),
    lowStock: d.products
      .filter((p) => (p.stock || 0) <= 3)
      .map((p) => ({ name: p.name, stock: p.stock }))
      .slice(0, 20),
    recentJournal: b.entries.slice(-60),
    expenseCategories: [
      "Rent",
      "Salaries",
      "Utilities",
      "Logistics",
      "Marketing",
      "Maintenance",
      "Supplies",
      "Other",
    ],
    incomeCategories: ["Direct Sales", "Service Fee", "Commission", "Investment", "Other"],
  };
}

// ---------- Chat store ----------
export type ChatAction =
  | { type: "journal"; date: string; memo: string; lines: JLine[] }
  | {
      type: "expense";
      title: string;
      category: string;
      amount: number;
      date: string;
      account?: string;
    }
  | {
      type: "income";
      title: string;
      category: string;
      amount: number;
      date: string;
      account?: string;
    };
export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: (ChatAction & { status?: "pending" | "done" | "rejected" })[];
  at: string;
};
const CKEY = "benadir_ai_accountant_chat_v1";
let chat: ChatMsg[] = [];
let cloaded = false;
const clisteners = new Set<() => void>();
function cload() {
  if (cloaded || typeof window === "undefined") return;
  cloaded = true;
  try {
    const r = localStorage.getItem(CKEY);
    if (r) chat = JSON.parse(r);
  } catch {
    /* ignore */
  }
  window.addEventListener("benadir-remote-update", () => {
    try {
      const r = localStorage.getItem(CKEY);
      chat = r ? JSON.parse(r) : [];
      clisteners.forEach((l) => l());
    } catch {
      /* ignore */
    }
  });
}
export function useChatStore() {
  cload();
  return useSyncExternalStore(
    (l) => {
      clisteners.add(l);
      return () => clisteners.delete(l);
    },
    () => chat,
    () => chat,
  );
}
export function setChat(next: ChatMsg[]) {
  chat = next;
  try {
    localStorage.setItem(CKEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  clisteners.forEach((l) => l());
}
export function getChat() {
  cload();
  return chat;
}
