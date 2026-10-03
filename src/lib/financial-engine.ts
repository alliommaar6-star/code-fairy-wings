import { useSyncExternalStore } from "react";

// ============================================================
// Business Financial Engine — BUSINESS ONLY.
// Daily target, deficit carry-forward, same-month surplus,
// month-end closing, petty cash fund, EVC reconciliation.
// Offline-first: persisted in localStorage (benadir_finengine_v1),
// synced to cloud like other admin data. All calculations are
// pure derivations from config + daily achievement data, so
// rollovers are idempotent and history is never mutated.
// ============================================================

export type FinEngineConfig = {
  systemStartDate: string; // YYYY-MM-DD — set once at first init
  monthlyBaseTarget: number; // business monthly plan, default 93.50
  rentAmount: number; // shop rent per month, default 250
  rentStartDate: string; // rent applies from this date, default 2027-02-01
};

export type FundTransfer = {
  id: string;
  date: string;
  fromAccountId: string;
  fromAccountName: string;
  amount: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
};

export type Reconciliation = {
  id: string;
  date: string;
  accountId: string;
  accountName: string;
  liveBalance: number; // provider/actual balance entered by user
  ledgerBalance: number; // balance per system ledger
  difference: number; // live - ledger; never silently fixed
  reason: string;
  createdBy: string;
  createdAt: string;
};

export type FinAuditEntry = {
  id: string;
  at: string;
  action: string;
  details: string;
  user: string;
};

export type FinEngineState = {
  config: FinEngineConfig;
  fundTransfers: FundTransfer[];
  reconciliations: Reconciliation[];
  audit: FinAuditEntry[];
};

const KEY = "benadir_finengine_v1";
export const PETTY_CASH_FUND = "Petty Cash Fund";

const todayISO = () => new Date().toISOString().slice(0, 10);

const DEFAULT_CONFIG: FinEngineConfig = {
  systemStartDate: todayISO(),
  monthlyBaseTarget: 93.5,
  rentAmount: 250,
  rentStartDate: "2027-02-01",
};

const EMPTY: FinEngineState = {
  config: DEFAULT_CONFIG,
  fundTransfers: [],
  reconciliations: [],
  audit: [],
};

let state: FinEngineState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...EMPTY, ...parsed, config: { ...DEFAULT_CONFIG, ...(parsed.config || {}) } };
    } else {
      state = EMPTY;
    }
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
function persist(next: FinEngineState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}
const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function getFinEngineState(): FinEngineState {
  load();
  return state;
}
export function useFinEngine() {
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

function audit(action: string, details: string, user: string): FinAuditEntry {
  return { id: uid("FA"), at: new Date().toISOString(), action, details, user };
}

export function updateFinConfig(patch: Partial<FinEngineConfig>, user: string) {
  load();
  const next = { ...state.config, ...patch };
  const changes = Object.entries(patch)
    .map(([k, v]) => `${k}: ${(state.config as Record<string, unknown>)[k]} → ${v}`)
    .join("; ");
  persist({
    ...state,
    config: next,
    audit: [audit("CONFIG_UPDATE", changes, user), ...state.audit].slice(0, 500),
  });
}

export function addFundTransfer(
  t: Omit<FundTransfer, "id" | "createdAt">,
): FundTransfer {
  load();
  const rec: FundTransfer = { ...t, id: uid("PCT"), createdAt: new Date().toISOString() };
  persist({
    ...state,
    fundTransfers: [rec, ...state.fundTransfers],
    audit: [
      audit(
        "PETTY_CASH_FUNDING",
        `${t.fromAccountName} → ${PETTY_CASH_FUND}: $${t.amount.toFixed(2)}`,
        t.createdBy,
      ),
      ...state.audit,
    ].slice(0, 500),
  });
  return rec;
}

export function addReconciliation(
  r: Omit<Reconciliation, "id" | "createdAt" | "difference">,
): Reconciliation {
  load();
  const rec: Reconciliation = {
    ...r,
    id: uid("REC"),
    difference: r2(r.liveBalance - r.ledgerBalance),
    createdAt: new Date().toISOString(),
  };
  persist({
    ...state,
    reconciliations: [rec, ...state.reconciliations],
    audit: [
      audit(
        "RECONCILIATION",
        `${r.accountName}: live $${r.liveBalance.toFixed(2)} vs ledger $${r.ledgerBalance.toFixed(2)} (diff $${rec.difference.toFixed(2)}) — ${r.reason}`,
        r.createdBy,
      ),
      ...state.audit,
    ].slice(0, 500),
  });
  return rec;
}

// ---------- Pure calculation engine ----------

const r2 = (n: number) => Math.round((n || 0) * 100) / 100;
const pad = (n: number) => String(n).padStart(2, "0");

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/** Business monthly plan: base target, plus shop rent from its start month. */
export function monthlyPlanFor(monthKey: string, cfg: FinEngineConfig): number {
  const rentMonth = cfg.rentStartDate.slice(0, 7);
  const plan = cfg.monthlyBaseTarget + (monthKey >= rentMonth ? cfg.rentAmount : 0);
  return r2(plan);
}

export type DayRecord = {
  date: string;
  baseTarget: number;
  adjustedTarget: number;
  achievement: number;
  deficit: number;
  surplus: number;
  deficitCarryAfter: number;
  surplusCarryAfter: number;
};

export type CycleRecord = {
  monthKey: string;
  plan: number;
  openingDeficit: number;
  burden: number;
  baseDailyTarget: number;
  days: DayRecord[];
  totalAchievement: number;
  closingDeficit: number;
  closingSurplus: number;
  closed: boolean;
};

export type EngineResult = {
  cycles: CycleRecord[];
  activeCycle: CycleRecord | null;
  today: DayRecord | null;
  nextDayTarget: number;
  remainingMonthlyTarget: number;
  remainingCalendarDays: number;
  outstandingDeficit: number;
  currentMonthSurplus: number;
};

/**
 * Compute the full engine from the system start date to `today`.
 * `dailyNet` maps YYYY-MM-DD → that day's target achievement (net profit).
 * Pure and idempotent: same inputs always give the same outputs, so
 * month rollover can never double a deficit.
 */
export function computeEngine(
  today: string,
  cfg: FinEngineConfig,
  dailyNet: Record<string, number>,
): EngineResult {
  const startMonth = cfg.systemStartDate.slice(0, 7);
  const todayMonth = today.slice(0, 7);
  const cycles: CycleRecord[] = [];
  let openingDeficit = 0;

  let mk = startMonth;
  // Safety: never loop more than 600 months.
  for (let guard = 0; guard < 600 && mk <= todayMonth; guard++) {
    const plan = monthlyPlanFor(mk, cfg);
    const burden = r2(plan + openingDeficit);
    const totalDays = daysInMonth(mk);
    const startDay = mk === startMonth ? Number(cfg.systemStartDate.slice(8, 10)) : 1;
    const endDay = mk === todayMonth ? Number(today.slice(8, 10)) : totalDays;
    const eligibleDays = Math.max(1, totalDays - startDay + 1);
    const baseDaily = burden / eligibleDays;

    let deficitCarry = 0;
    let surplusCarry = 0;
    const days: DayRecord[] = [];
    let totalAchievement = 0;

    for (let d = startDay; d <= endDay; d++) {
      const date = `${mk}-${pad(d)}`;
      const need = baseDaily + deficitCarry - surplusCarry;
      const adjusted = Math.max(0, need);
      surplusCarry = Math.max(0, -need); // leftover surplus after covering today
      const ach = r2(dailyNet[date] || 0);
      totalAchievement = r2(totalAchievement + ach);
      const deficit = r2(Math.max(0, adjusted - ach));
      const surplus = r2(Math.max(0, ach - adjusted));
      deficitCarry = deficit;
      surplusCarry = r2(surplusCarry + surplus);
      days.push({
        date,
        baseTarget: r2(baseDaily),
        adjustedTarget: r2(adjusted),
        achievement: ach,
        deficit,
        surplus,
        deficitCarryAfter: r2(deficitCarry),
        surplusCarryAfter: r2(surplusCarry),
      });
    }

    const closed = mk < todayMonth;
    cycles.push({
      monthKey: mk,
      plan,
      openingDeficit: r2(openingDeficit),
      burden,
      baseDailyTarget: r2(baseDaily),
      days,
      totalAchievement,
      closingDeficit: r2(deficitCarry),
      closingSurplus: r2(surplusCarry),
      closed,
    });

    // HARD RULE: deficit carries to next month; surplus never does.
    openingDeficit = deficitCarry;

    // advance month
    const [y, m] = mk.split("-").map(Number);
    mk = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
  }

  const activeCycle = cycles.length ? cycles[cycles.length - 1] : null;
  const todayRec = activeCycle?.days.length
    ? activeCycle.days[activeCycle.days.length - 1]
    : null;

  // Next-day target preview: base of the schedule that will apply tomorrow,
  // adjusted by the carry chain left after today.
  let nextDayTarget = 0;
  let remainingCalendarDays = 0;
  let remainingMonthlyTarget = 0;
  if (activeCycle) {
    const totalDays = daysInMonth(activeCycle.monthKey);
    const todayDay = Number(today.slice(8, 10));
    remainingCalendarDays = Math.max(0, totalDays - todayDay);
    const carryDef = todayRec?.deficitCarryAfter ?? activeCycle.openingDeficit;
    const carrySur = todayRec?.surplusCarryAfter ?? 0;
    if (remainingCalendarDays > 0) {
      nextDayTarget = Math.max(0, activeCycle.baseDailyTarget + carryDef - carrySur);
    } else {
      // Tomorrow is a new month: burden = plan + closing deficit, spread over full month.
      const [y, m] = activeCycle.monthKey.split("-").map(Number);
      const nextMk = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
      const nextPlan = monthlyPlanFor(nextMk, cfg);
      nextDayTarget = (nextPlan + carryDef) / daysInMonth(nextMk);
    }
    remainingMonthlyTarget = r2(
      Math.max(0, activeCycle.burden - activeCycle.totalAchievement),
    );
  }

  return {
    cycles,
    activeCycle,
    today: todayRec,
    nextDayTarget: r2(nextDayTarget),
    remainingMonthlyTarget,
    remainingCalendarDays,
    outstandingDeficit: r2(todayRec?.deficitCarryAfter ?? 0),
    currentMonthSurplus: r2(todayRec?.surplusCarryAfter ?? 0),
  };
}

/** Petty cash fund balance = funded transfers − expenses paid from the fund. */
export function pettyCashFundBalance(
  fundTransfers: FundTransfer[],
  expensesPaidFromFund: number,
): number {
  const funded = fundTransfers.reduce((s, t) => s + t.amount, 0);
  return r2(funded - expensesPaidFromFund);
}
