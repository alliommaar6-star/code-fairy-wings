import { useMemo, useState } from "react";
import { Download, FileText, Search } from "lucide-react";
import { format, subDays, subMonths, startOfWeek, differenceInCalendarDays, parseISO } from "date-fns";
import { useStore } from "../../context/StoreContext";
import { buildBooks, accType, useManualJournal, CASH, type JEntry } from "@/lib/accounting";
import { useBranches } from "@/lib/branch-store";

const $ = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n || 0).toFixed(2)}`;
const r2 = (n: number) => Math.round((n || 0) * 100) / 100;
const ymd = (d: Date) => format(d, "yyyy-MM-dd");

type Preset = "today" | "week" | "month" | "3m" | "6m" | "year" | "all" | "custom";
const PRESETS: { id: Preset; label: string }[] = [
  { id: "today", label: "Maanta" },
  { id: "week", label: "Toddobaadkan" },
  { id: "month", label: "Bishan" },
  { id: "3m", label: "3 bilood" },
  { id: "6m", label: "6 bilood" },
  { id: "year", label: "Sannadkan" },
  { id: "all", label: "Dhammaan" },
  { id: "custom", label: "Custom" },
];
type Tab = "pnl" | "bs" | "cash" | "sales" | "tx" | "expenses";
const TABS: { id: Tab; label: string }[] = [
  { id: "pnl", label: "Income Statement" },
  { id: "bs", label: "Balance Sheet" },
  { id: "cash", label: "Cash Flow" },
  { id: "sales", label: "Sales detail" },
  { id: "expenses", label: "Expenses & Income" },
  { id: "tx", label: "All transactions" },
];

/** Shared detailed, filterable, downloadable financial statements. */
export function useBooksData() {
  const s = useStore();
  const manual = useManualJournal();
  const data = useMemo(
    () => ({
      sales: s.sales, orders: s.orders, purchases: s.purchases, expenses: s.expenses, incomes: s.incomes,
      returns: s.returns, accounts: s.accounts, products: s.products, supplierPayments: s.supplierPayments,
      inventoryMovements: s.inventoryMovements, customers: s.customers, suppliers: s.suppliers,
    }),
    [s.sales, s.orders, s.purchases, s.expenses, s.incomes, s.returns, s.accounts, s.products, s.supplierPayments, s.inventoryMovements, s.customers, s.suppliers],
  );
  const books = useMemo(() => buildBooks(data, manual), [data, manual]);
  return { data, books };
}

function rangeFor(p: Preset, from: string, to: string): [string, string] {
  const now = new Date(), t = ymd(now);
  switch (p) {
    case "today": return [t, t];
    case "week": return [ymd(startOfWeek(now, { weekStartsOn: 1 })), t];
    case "month": return [t.slice(0, 8) + "01", t];
    case "3m": return [ymd(subMonths(now, 3)), t];
    case "6m": return [ymd(subMonths(now, 6)), t];
    case "year": return [t.slice(0, 4) + "-01-01", t];
    case "all": return ["0000-01-01", t];
    default: return [from || t, to || t];
  }
}

function aggregate(entries: JEntry[], from: string, to: string) {
  const bal = new Map<string, number>();
  for (const e of entries) {
    const d = (e.date || "").slice(0, 10);
    if (d < from || d > to) continue;
    for (const l of e.lines) bal.set(l.account, (bal.get(l.account) ?? 0) + l.debit - l.credit);
  }
  const rows = (t: string, sign: number) =>
    [...bal.entries()].filter(([a]) => accType(a) === t).map(([account, v]) => ({ account, amount: r2(v * sign) })).filter((x) => x.amount !== 0).sort((a, b) => b.amount - a.amount);
  const revenue = rows("Revenue", -1), expenses = rows("Expense", 1);
  const totalRevenue = r2(revenue.reduce((s, x) => s + x.amount, 0));
  const totalExpenses = r2(expenses.reduce((s, x) => s + x.amount, 0));
  return { revenue, expenses, totalRevenue, totalExpenses, net: r2(totalRevenue - totalExpenses), rows };
}

export function FinancialStatementsPanel({ defaultTab = "pnl" }: { defaultTab?: Tab }) {
  const { books, data } = useBooksData();
  const branches = useBranches();
  const [preset, setPreset] = useState<Preset>("month");
  const [cFrom, setCFrom] = useState(ymd(subDays(new Date(), 30)));
  const [cTo, setCTo] = useState(ymd(new Date()));
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [q, setQ] = useState("");
  const [from, to] = rangeFor(preset, cFrom, cTo);
  const len = preset === "all" ? 0 : differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
  const pTo = len ? ymd(subDays(parseISO(from), 1)) : "";
  const pFrom = len ? ymd(subDays(parseISO(from), len)) : "";
  const label = preset === "all" ? "Dhammaan muddada" : from === to ? from : `${from} → ${to}`;

  const cur = useMemo(() => aggregate(books.entries, from, to), [books.entries, from, to]);
  const prev = useMemo(() => (len ? aggregate(books.entries, pFrom, pTo) : null), [books.entries, pFrom, pTo, len]);
  const bsAgg = useMemo(() => aggregate(books.entries, "0000-01-01", to), [books.entries, to]);
  const bs = useMemo(() => {
    const assets = bsAgg.rows("Asset", 1), liab = bsAgg.rows("Liability", -1), eq = bsAgg.rows("Equity", -1);
    const tA = r2(assets.reduce((s, x) => s + x.amount, 0)), tL = r2(liab.reduce((s, x) => s + x.amount, 0));
    const tE = r2(eq.reduce((s, x) => s + x.amount, 0) + bsAgg.net);
    return { assets, liab, eq, tA, tL, tE, retained: bsAgg.net };
  }, [bsAgg]);

  const inRange = (d: string) => { const k = (d || "").slice(0, 10); return k >= from && k <= to; };
  const ql = q.trim().toLowerCase();
  const match = (...xs: (string | number | undefined)[]) => !ql || xs.some((x) => String(x ?? "").toLowerCase().includes(ql));

  const cashFlow = useMemo(() => {
    const m = new Map<string, { inflow: number; outflow: number }>();
    let opening = 0;
    for (const e of books.entries) {
      const d = (e.date || "").slice(0, 10);
      const c = e.lines.filter((l) => l.account === CASH).reduce((s, l) => s + l.debit - l.credit, 0);
      if (!c) continue;
      if (d < from) { opening += c; continue; }
      if (d > to) continue;
      const r = m.get(e.source) ?? { inflow: 0, outflow: 0 };
      if (c > 0) r.inflow += c; else r.outflow += -c;
      m.set(e.source, r);
    }
    const rows = [...m.entries()].map(([source, v]) => ({ source, inflow: r2(v.inflow), outflow: r2(v.outflow), net: r2(v.inflow - v.outflow) }));
    const net = r2(rows.reduce((s, x) => s + x.net, 0));
    return { rows, opening: r2(opening), net, closing: r2(opening + net) };
  }, [books.entries, from, to]);

  const salesRows = useMemo(() => {
    const rows: { date: string; ref: string; type: string; party: string; items: string; total: number; paid: number; profit: number; status: string }[] = [];
    data.sales.forEach((s) => rows.push({ date: s.date.slice(0, 10), ref: s.invoiceNo, type: "Sale", party: s.customerName, items: s.items.map((i) => `${i.productName ?? ""} x${i.quantity}`).join(", "), total: s.grandTotal, paid: s.amountPaid, profit: s.grossProfit, status: s.status }));
    data.orders.filter((o) => !o.convertedSaleId).forEach((o) => rows.push({ date: o.date.slice(0, 10), ref: o.id, type: "Order", party: o.customerName, items: o.items.map((i) => `${i.productName ?? ""} x${i.quantity}`).join(", "), total: o.total, paid: o.paidAmount, profit: 0, status: o.status }));
    branches.sales.forEach((b) => rows.push({ date: b.date, ref: b.id, type: `Branch: ${b.branchName}`, party: b.managerName ?? "", items: b.items.map((i) => `${i.productName} x${i.quantity}`).join(", "), total: b.total, paid: b.total, profit: r2(b.total - b.cost - b.commission), status: "Completed" }));
    return rows.filter((r) => inRange(r.date) && match(r.ref, r.type, r.party, r.items, r.status)).sort((a, b) => b.date.localeCompare(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.sales, data.orders, branches.sales, from, to, ql]);

  const exRows = useMemo(() => {
    const rows = [
      ...data.expenses.map((e) => ({ date: e.date.slice(0, 10), kind: "Expense", category: e.category + (e.adProductName ? ` · ${e.adProductName}` : ""), title: e.title, account: e.paidFromAccountName, amount: -e.amount })),
      ...data.incomes.map((i) => ({ date: i.date.slice(0, 10), kind: "Income", category: i.category, title: i.title, account: i.depositedToAccountName, amount: i.amount })),
    ];
    return rows.filter((r) => inRange(r.date) && match(r.kind, r.category, r.title, r.account)).sort((a, b) => b.date.localeCompare(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.expenses, data.incomes, from, to, ql]);

  const txRows = useMemo(
    () => books.entries.filter((e) => inRange(e.date) && match(e.ref, e.memo, e.source, ...e.lines.map((l) => l.account))).sort((a, b) => b.date.localeCompare(a.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [books.entries, from, to, ql],
  );

  // ---------- table model for export ----------
  const table = (): { title: string; head: string[]; rows: (string | number)[][] } => {
    switch (tab) {
      case "pnl": return { title: "Income Statement", head: ["Section", "Account", "This period", "Previous"], rows: [
        ...cur.revenue.map((r) => ["Revenue", r.account, r.amount, prev?.revenue.find((x) => x.account === r.account)?.amount ?? 0]),
        ["Revenue", "TOTAL REVENUE", cur.totalRevenue, prev?.totalRevenue ?? 0],
        ...cur.expenses.map((r) => ["Expense", r.account, r.amount, prev?.expenses.find((x) => x.account === r.account)?.amount ?? 0]),
        ["Expense", "TOTAL EXPENSES", cur.totalExpenses, prev?.totalExpenses ?? 0],
        ["", "NET PROFIT", cur.net, prev?.net ?? 0]] };
      case "bs": return { title: `Balance Sheet (as of ${to})`, head: ["Section", "Account", "Amount"], rows: [
        ...bs.assets.map((r) => ["Assets", r.account, r.amount]), ["Assets", "TOTAL ASSETS", bs.tA],
        ...bs.liab.map((r) => ["Liabilities", r.account, r.amount]), ["Liabilities", "TOTAL LIABILITIES", bs.tL],
        ...bs.eq.map((r) => ["Equity", r.account, r.amount]), ["Equity", "Retained earnings", bs.retained], ["Equity", "TOTAL EQUITY", bs.tE]] };
      case "cash": return { title: "Cash Flow", head: ["Source", "Inflow", "Outflow", "Net"], rows: [
        ["Opening cash", "", "", cashFlow.opening], ...cashFlow.rows.map((r) => [r.source, r.inflow, r.outflow, r.net]), ["Net change", "", "", cashFlow.net], ["Closing cash", "", "", cashFlow.closing]] };
      case "sales": return { title: "Sales detail", head: ["Date", "Ref", "Type", "Customer/Admin", "Items", "Total", "Paid", "Profit", "Status"], rows: salesRows.map((r) => [r.date, r.ref, r.type, r.party, r.items, r.total, r.paid, r.profit, r.status]) };
      case "expenses": return { title: "Expenses & Income", head: ["Date", "Kind", "Category", "Title", "Account", "Amount"], rows: exRows.map((r) => [r.date, r.kind, r.category, r.title, r.account, r.amount]) };
      default: return { title: "All transactions", head: ["Date", "Ref", "Source", "Memo", "Account", "Debit", "Credit"], rows: txRows.flatMap((e) => e.lines.map((l) => [e.date.slice(0, 10), e.ref, e.source, e.memo, l.account, l.debit, l.credit])) };
    }
  };
  const fmt = (v: string | number) => (typeof v === "number" ? v.toFixed(2) : v);
  const exportCSV = () => {
    const t = table();
    const esc = (v: string | number) => `"${String(fmt(v)).replace(/"/g, '""')}"`;
    const lines = [[`Benadir Store - ${t.title}`], ["Period", label], [], t.head, ...t.rows];
    const blob = new Blob(["\ufeff" + lines.map((l) => l.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${t.title.replace(/\W+/g, "-")}_${from}_${to}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  const exportPDF = () => {
    const t = table(); const w = window.open("", "_blank");
    if (!w) { alert("Fadlan oggolow pop-ups si PDF loo soo dejiyo."); return; }
    const h = (s: string | number) => String(fmt(s)).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    w.document.write(`<!doctype html><html><head><title>${h(t.title)}</title><style>body{font-family:Arial;padding:24px}h1{font-size:18px;margin:0}p{font-size:12px;color:#555}table{width:100%;border-collapse:collapse;font-size:11px}td,th{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#eee}</style></head><body><h1>Benadir Store — ${h(t.title)}</h1><p>Period: ${h(label)}</p><table><tr>${t.head.map((x) => `<th>${h(x)}</th>`).join("")}</tr>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${h(c)}</td>`).join("")}</tr>`).join("")}</table><script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  const chip = (on: boolean) => `px-3 py-1.5 rounded-lg text-xs font-bold border transition ${on ? "bg-slate-900 text-lime-400 border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`;
  const t = table();
  const numCols = new Set(t.head.map((h, i) => (["This period", "Previous", "Amount", "Inflow", "Outflow", "Net", "Total", "Paid", "Profit", "Debit", "Credit"].includes(h) ? i : -1)));
  const summary = [
    { k: "Revenue", v: cur.totalRevenue, p: prev?.totalRevenue },
    { k: "Expenses", v: cur.totalExpenses, p: prev?.totalExpenses },
    { k: "Net profit", v: cur.net, p: prev?.net },
    { k: "Sales count", v: salesRows.length, raw: true },
  ];

  return (
    <div id="financial-statements" className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3">
        <div className="flex flex-wrap gap-1.5">{PRESETS.map((p) => <button key={p.id} onClick={() => setPreset(p.id)} className={chip(preset === p.id)}>{p.label}</button>)}</div>
        {preset === "custom" && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input type="date" value={cFrom} onChange={(e) => setCFrom(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg" aria-label="From" />
            <span>→</span>
            <input type="date" value={cTo} onChange={(e) => setCTo(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg" aria-label="To" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Raadi: macmiil, product, invoice, account, category..." className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
          </div>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"><Download className="w-4 h-4" />CSV</button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"><FileText className="w-4 h-4" />PDF</button>
        </div>
        <p className="text-[11px] text-slate-500">Muddada: <b>{label}</b>{len ? ` · la barbardhigay ${pFrom} → ${pTo}` : ""}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {summary.map((s) => (
          <div key={s.k} className="bg-white border border-slate-200 rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">{s.k}</div>
            <div className="text-lg font-black text-slate-900">{s.raw ? s.v : $(s.v)}</div>
            {s.p !== undefined && <div className="text-[10px] text-slate-500">Hore: {$(s.p)}</div>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">{TABS.map((x) => <button key={x.id} onClick={() => setTab(x.id)} className={chip(tab === x.id)}>{x.label}</button>)}</div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between text-xs"><b className="text-slate-900">{t.title}</b><span className="text-slate-500">{t.rows.length} saf</span></div>
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50"><tr>{t.head.map((h, i) => <th key={h} className={`py-2 px-3 text-[10px] uppercase text-slate-500 ${numCols.has(i) ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {t.rows.length === 0 ? <tr><td colSpan={t.head.length} className="py-10 text-center text-slate-400">Xog lagama helin muddadan.</td></tr> :
                t.rows.map((r, i) => {
                  const strong = r.some((c) => typeof c === "string" && /^(TOTAL|NET|Closing|Opening|Net change)/.test(c));
                  return <tr key={i} className={strong ? "bg-slate-50 font-black" : ""}>{r.map((c, j) => <td key={j} className={`py-2 px-3 ${numCols.has(j) ? "text-right tabular-nums" : ""}`}>{numCols.has(j) && typeof c === "number" ? $(c) : c}</td>)}</tr>;
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
