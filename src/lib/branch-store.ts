import { useSyncExternalStore } from "react";

// Branch sales (e.g. Garoowe, Kismaayo): own stock per branch, own sales, fixed commission per sale.
export type Branch = { id: string; name: string; manager: string; commission: number; createdAt: string };
export type BranchSaleItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
};
export type BranchSale = {
  id: string;
  branchId: string;
  branchName: string;
  date: string; // YYYY-MM-DD
  time: string;
  items: BranchSaleItem[];
  total: number;
  cost: number;
  commission: number;
  notes?: string;
};
export type BranchTransfer = {
  id: string;
  branchId: string;
  productId: string;
  productName: string;
  quantity: number;
  date: string;
};
export type BranchState = {
  branches: Branch[];
  stock: Record<string, Record<string, number>>; // branchId -> productId -> qty
  sales: BranchSale[];
  transfers: BranchTransfer[];
};

const KEY = "benadir_branches_v1";
const EMPTY: BranchState = { branches: [], stock: {}, sales: [], transfers: [] };
let state: BranchState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    state = EMPTY;
  }
}
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  read();
  window.addEventListener("benadir-remote-update", () => {
    read();
    listeners.forEach((l) => l());
  });
}
function set(next: BranchState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}
const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const todayISO = () => new Date().toISOString().slice(0, 10);

export function getBranchState(): BranchState {
  load();
  return state;
}
export function useBranches() {
  load();
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => EMPTY,
  );
}

export function addBranch(name: string, manager: string, commission: number) {
  load();
  set({
    ...state,
    branches: [...state.branches, { id: uid("BR"), name: name.trim(), manager: manager.trim(), commission, createdAt: new Date().toISOString() }],
  });
}
export function updateBranch(id: string, patch: Partial<Pick<Branch, "name" | "manager" | "commission">>) {
  load();
  set({ ...state, branches: state.branches.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
}

/** Move stock to a branch (caller must deduct from main stock). */
export function addBranchStock(branchId: string, productId: string, productName: string, qty: number) {
  load();
  const bs = { ...(state.stock[branchId] || {}) };
  bs[productId] = (bs[productId] || 0) + qty;
  set({
    ...state,
    stock: { ...state.stock, [branchId]: bs },
    transfers: [
      { id: uid("BT"), branchId, productId, productName, quantity: qty, date: todayISO() },
      ...state.transfers,
    ],
  });
}

export function recordBranchSale(branchId: string, items: BranchSaleItem[], notes?: string): string | null {
  load();
  const br = state.branches.find((b) => b.id === branchId);
  if (!br || items.length === 0) return "Dooro branch iyo alaab.";
  const bs = { ...(state.stock[branchId] || {}) };
  for (const it of items) {
    if ((bs[it.productId] || 0) < it.quantity) return `Stock kuma filna branch-ka: ${it.productName}`;
  }
  items.forEach((it) => (bs[it.productId] = (bs[it.productId] || 0) - it.quantity));
  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const cost = items.reduce((s, i) => s + i.quantity * i.costPrice, 0);
  // Commission is a fixed amount per item sold, charged to the branch manager.
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const sale: BranchSale = {
    id: uid("BS"),
    branchId,
    branchName: br.name,
    date: todayISO(),
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    items,
    total,
    cost,
    commission: br.commission * totalQty,
    notes,
  };
  set({ ...state, stock: { ...state.stock, [branchId]: bs }, sales: [sale, ...state.sales] });
  return null;
}

export function branchTotalsFor(date: string) {
  const list = getBranchState().sales.filter((s) => s.date === date);
  const total = list.reduce((a, s) => a + s.total, 0);
  const cost = list.reduce((a, s) => a + s.cost, 0);
  const commission = list.reduce((a, s) => a + s.commission, 0);
  return { total, cost, commission, profit: total - cost - commission, count: list.length };
}
