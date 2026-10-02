import type React from "react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Send,
  Check,
  X,
  Trash2,
  BookOpen,
  Scale,
  FileSpreadsheet,
  Landmark,
  Loader2,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useStore } from "../../context/StoreContext";
import {
  buildBooks,
  booksSnapshot,
  useManualJournal,
  addManualEntry,
  removeManualEntry,
  useChatStore,
  setChat,
  getChat,
  ChatMsg,
  ChatAction,
  CASH,
} from "../../lib/accounting";
import { askAccountant } from "../../lib/accountant.functions";

type Tab = "ai" | "journal" | "ledger" | "trial" | "statements";
const $ = (n: number) =>
  `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SUGGESTIONS = [
  "Prepare a full financial report: Income Statement, Balance Sheet and key ratios",
  "Audit my books and flag any anomalies or risks",
  "Accounts receivable & payable aging report",
  "Monthly performance analysis with recommendations",
  "Kiro $300 ah ayaan maanta Cash ka bixiyay — diiwaan geli",
];

export function AccountantView() {
  const store = useStore();
  const manual = useManualJournal();
  const data = useMemo(
    () => ({
      sales: store.sales,
      orders: store.orders,
      purchases: store.purchases,
      expenses: store.expenses,
      incomes: store.incomes,
      returns: store.returns,
      accounts: store.accounts,
      products: store.products,
      supplierPayments: store.supplierPayments,
      inventoryMovements: store.inventoryMovements,
      customers: store.customers,
      suppliers: store.suppliers,
    }),
    [
      store.sales,
      store.orders,
      store.purchases,
      store.expenses,
      store.incomes,
      store.returns,
      store.accounts,
      store.products,
      store.supplierPayments,
      store.inventoryMovements,
      store.customers,
      store.suppliers,
    ],
  );
  const books = useMemo(() => buildBooks(data, manual), [data, manual]);
  const [tab, setTab] = useState<Tab>("ai");

  const tabs: { id: Tab; label: string; icon: typeof Bot }[] = [
    { id: "ai", label: "AI Accountant", icon: Bot },
    { id: "journal", label: "Journal Entries", icon: BookOpen },
    { id: "ledger", label: "General Ledger", icon: FileSpreadsheet },
    { id: "trial", label: "Trial Balance", icon: Scale },
    { id: "statements", label: "Financial Statements", icon: Landmark },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Accounting</h1>
          <p className="text-sm text-slate-500">
            Fully automated double-entry books — every sale, purchase, restock, stock adjustment,
            return, payment, income and expense posts automatically.
          </p>
        </div>
        <div
          className={`text-xs font-bold px-3 py-1.5 rounded-full ${books.tbDebit === books.tbCredit ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
        >
          Trial Balance: {books.tbDebit === books.tbCredit ? "Balanced" : "OUT OF BALANCE"}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Total Revenue" value={$(books.pnl.totalRevenue)} />
        <Kpi label="Total Expenses" value={$(books.pnl.totalExpenses)} />
        <Kpi
          label="Net Income"
          value={$(books.pnl.netIncome)}
          tone={books.pnl.netIncome >= 0 ? "good" : "bad"}
        />
        <Kpi label="Total Assets" value={$(books.bs.totalAssets)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition ${tab === t.id ? "bg-slate-900 text-lime-400 border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>
      {tab === "ai" && <AiChat books={books} data={data} />}
      {tab === "journal" && <Journal entries={books.entries} />}
      {tab === "ledger" && <Ledger ledger={books.ledger} />}
      {tab === "trial" && <Trial books={books} />}
      {tab === "statements" && <Statements books={books} />}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="text-[11px] font-bold uppercase text-slate-400">{label}</div>
      <div
        className={`text-xl font-black ${tone === "bad" ? "text-red-600" : tone === "good" ? "text-emerald-600" : "text-slate-900"}`}
      >
        {value}
      </div>
    </div>
  );
}

// ---------------- AI Chat ----------------
function AiChat({
  books,
  data,
}: {
  books: ReturnType<typeof buildBooks>;
  data: Parameters<typeof booksSnapshot>[1];
}) {
  const store = useStore();
  const msgs = useChatStore();
  const ask = useServerFn(askAccountant);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length, busy]);
  useEffect(() => {
    if (!busy) taRef.current?.focus();
  }, [busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setErr("");
    setInput("");
    setBusy(true);
    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content: q,
      at: new Date().toISOString(),
    };
    const next = [...getChat(), userMsg];
    setChat(next);
    try {
      const res = await ask({
        data: {
          messages: next
            .map((m) => ({
              role: m.role,
              content:
                m.content +
                (m.actions?.length
                  ? `\n[Falal: ${m.actions.map((a) => `${a.type} ${a.status ?? "pending"}`).join(", ")}]`
                  : ""),
            }))
            .slice(-20),
          snapshot: JSON.stringify(booksSnapshot(books, data)),
        },
      });
      if (res.error) {
        setErr(res.error);
        return;
      }
      setChat([
        ...getChat(),
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.text,
          at: new Date().toISOString(),
          actions: (JSON.parse(res.actionsJson || "[]") as ChatAction[]).map((a) => ({
            ...a,
            status: "pending" as const,
          })),
        },
      ]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function setActionStatus(msgId: string, idx: number, status: "done" | "rejected") {
    setChat(
      getChat().map((m) =>
        m.id === msgId
          ? { ...m, actions: m.actions?.map((a, i) => (i === idx ? { ...a, status } : a)) }
          : m,
      ),
    );
  }

  function approve(msgId: string, idx: number, a: ChatAction) {
    try {
      const findAcc = (name?: string) =>
        store.accounts.find((x) => name && x.name.toLowerCase() === name.toLowerCase()) ??
        store.accounts.find((x) => x.isDefault) ??
        store.accounts[0];
      if (a.type === "journal") {
        addManualEntry({
          date: a.date,
          ref: "AI",
          memo: a.memo,
          lines: a.lines.map((l) => ({
            account: l.account,
            debit: +l.debit || 0,
            credit: +l.credit || 0,
          })),
        });
      } else if (a.type === "expense") {
        const acc = findAcc(a.account);
        if (!acc) throw new Error("No payment account found.");
        store.addExpense({
          title: a.title,
          category: a.category as never,
          amount: +a.amount,
          date: a.date,
          paidFromAccountId: acc.id,
          paidFromAccountName: acc.name,
          notes: "AI Accountant",
          recordedBy: "AI Accountant",
        });
      } else if (a.type === "income") {
        const acc = findAcc(a.account);
        if (!acc) throw new Error("No payment account found.");
        store.addIncome({
          title: a.title,
          category: a.category as never,
          amount: +a.amount,
          date: a.date,
          depositedToAccountId: acc.id,
          depositedToAccountName: acc.name,
          notes: "AI Accountant",
          recordedBy: "AI Accountant",
        });
      }
      setActionStatus(msgId, idx, "done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not post.");
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl flex flex-col h-[70vh]">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-lime-400 flex items-center justify-center font-black">
          ∑
        </div>
        <div className="flex-1">
          <div className="font-black text-slate-900">AI Accountant</div>
          <div className="text-xs text-slate-500">
            Reads your entire books · understands Somali & English · every posting needs your
            approval
          </div>
        </div>
        {msgs.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Clear the whole conversation?")) setChat([]);
            }}
            className="text-xs text-slate-400 hover:text-red-600 flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {msgs.length === 0 && (
          <div className="text-center py-8 space-y-4">
            <p className="text-sm text-slate-500">
              Ask anything — reports, analysis, audits or postings. Somali or English.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user" ? (
              <div className="max-w-[80%] bg-slate-900 text-white rounded-2xl rounded-br-sm px-4 py-2 text-sm whitespace-pre-wrap">
                {m.content}
              </div>
            ) : (
              <div className="max-w-[92%] space-y-3">
                <Md text={m.content} />
                {m.actions?.map((a, i) => (
                  <ActionCard
                    key={i}
                    a={a}
                    onApprove={() => approve(m.id, i, a)}
                    onReject={() => setActionStatus(m.id, i, "rejected")}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analysing your books…
          </div>
        )}
        {err && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {err}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-slate-100 p-3 flex gap-2"
      >
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask the accountant… (e.g. Did we make a profit this month?)"
          className="flex-1 resize-none border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-slate-900"
        />
        <button
          disabled={busy || !input.trim()}
          className="w-11 h-11 shrink-0 rounded-xl bg-slate-900 text-lime-400 flex items-center justify-center disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

function ActionCard({
  a,
  onApprove,
  onReject,
}: {
  a: ChatAction & { status?: string };
  onApprove: () => void;
  onReject: () => void;
}) {
  const title =
    a.type === "journal"
      ? `Journal Entry — ${a.memo}`
      : a.type === "expense"
        ? `Expense — ${a.title}`
        : `Income — ${a.title}`;
  return (
    <div className="border-2 border-slate-200 rounded-xl p-3 text-sm bg-slate-50">
      <div className="font-bold text-slate-900">{title}</div>
      <div className="text-xs text-slate-500 mb-2">{a.date}</div>
      {a.type === "journal" ? (
        <table className="w-full text-xs mb-2">
          <tbody>
            {a.lines.map((l, i) => (
              <tr key={i} className="border-t border-slate-200">
                <td className={`py-1 ${l.credit ? "pl-6" : ""}`}>{l.account}</td>
                <td className="text-right">{l.debit ? $(l.debit) : ""}</td>
                <td className="text-right">{l.credit ? $(l.credit) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-xs mb-2">
          {a.category} · <b>{$(a.amount)}</b>
          {a.account ? ` · ${a.account}` : ""}
        </div>
      )}
      {a.status === "done" ? (
        <div className="text-xs font-bold text-emerald-700">✓ Posted</div>
      ) : a.status === "rejected" ? (
        <div className="text-xs font-bold text-slate-400">Rejected</div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
          >
            <Check className="w-3.5 h-3.5" />
            Approve & Post
          </button>
          <button
            onClick={onReject}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold"
          >
            <X className="w-3.5 h-3.5" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

// Professional report renderer: headings, bold, lists, tables.
export function Md({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactElement[] = [];
  const inline = (x: string) =>
    x.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith("**") ? (
        <b key={i} className="text-slate-900">
          {p.slice(2, -2)}
        </b>
      ) : (
        p
      ),
    );
  const num = (c: string) => /^[-$(]?\$?-?[\d,]+(\.\d+)?%?\)?$/.test(c.replace(/\*\*/g, "").trim());
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*\|/.test(l)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i]))
          rows.push(
            lines[i]
              .trim()
              .replace(/^\||\|$/g, "")
              .split("|")
              .map((c) => c.trim()),
          );
        i++;
      }
      i--;
      out.push(
        <div key={i} className="overflow-x-auto my-2 rounded-xl border border-slate-200">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-900 text-white">
              {rows.slice(0, 1).map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <th
                      key={ci}
                      className={`px-3 py-2 font-semibold ${ci && num(c) ? "text-right" : "text-left"}`}
                    >
                      {inline(c)}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.slice(1).map((r, ri) => {
                const tot = /total|net income|net loss/i.test(r[0] || "");
                return (
                  <tr
                    key={ri}
                    className={`${ri % 2 ? "bg-slate-50" : "bg-white"} ${tot ? "font-bold border-t-2 border-slate-300" : "border-t border-slate-100"}`}
                  >
                    {r.map((c, ci) => (
                      <td
                        key={ci}
                        className={`px-3 py-1.5 ${num(c) ? "text-right tabular-nums" : ""}`}
                      >
                        {inline(c)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>,
      );
    } else if (/^##\s/.test(l) && !/^###/.test(l))
      out.push(
        <h2
          key={i}
          className="text-lg font-black text-slate-900 border-b-2 border-slate-900 pb-1 mt-2"
        >
          {inline(l.replace(/^#+\s/, ""))}
        </h2>,
      );
    else if (/^#{1,6}\s/.test(l))
      out.push(
        <h3 key={i} className="text-sm font-black uppercase tracking-wide text-slate-700 mt-4">
          {inline(l.replace(/^#+\s/, ""))}
        </h3>,
      );
    else if (/^\s*([-*]|\d+\.)\s/.test(l))
      out.push(
        <div
          key={i}
          className="pl-5 relative before:content-['▪'] before:absolute before:left-1 before:text-slate-400"
        >
          {inline(l.replace(/^\s*([-*]|\d+\.)\s/, ""))}
        </div>,
      );
    else if (/^---+$/.test(l.trim())) out.push(<hr key={i} className="border-slate-200" />);
    else if (l.trim()) out.push(<p key={i}>{inline(l)}</p>);
  }
  return (
    <div className="text-sm text-slate-700 space-y-1.5 leading-relaxed bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      {out}
    </div>
  );
}

// ---------------- Books views ----------------
function Journal({ entries }: { entries: ReturnType<typeof buildBooks>["entries"] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setAdding(true)}
          className="px-4 py-2 rounded-xl bg-slate-900 text-lime-400 text-xs font-bold"
        >
          + New Journal Entry
        </button>
      </div>
      {adding && <NewEntry onClose={() => setAdding(false)} />}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Ref</th>
              <th className="p-3 text-left">Account / Description</th>
              <th className="p-3 text-right">Debit</th>
              <th className="p-3 text-right">Credit</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {[...entries].reverse().map((e) => (
              <Fragment key={e.id}>
                <tr className="border-t-2 border-slate-100 bg-slate-50/50">
                  <td className="p-2 text-xs">{e.date}</td>
                  <td className="p-2 text-xs font-bold">{e.ref}</td>
                  <td className="p-2 text-xs text-slate-500" colSpan={3}>
                    {e.memo} · <span className="uppercase">{e.source}</span>
                  </td>
                  <td className="p-2">
                    {e.source === "Manual / AI" && (
                      <button
                        onClick={() => {
                          if (confirm("Delete this entry?")) removeManualEntry(e.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-600" />
                      </button>
                    )}
                  </td>
                </tr>
                {e.lines.map((l, i) => (
                  <tr key={e.id + i}>
                    <td />
                    <td />
                    <td className={`px-2 py-1 ${l.credit ? "pl-8" : ""}`}>{l.account}</td>
                    <td className="px-2 text-right">{l.debit ? $(l.debit) : ""}</td>
                    <td className="px-2 text-right">{l.credit ? $(l.credit) : ""}</td>
                    <td />
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewEntry({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState([
    { account: "", debit: "", credit: "" },
    { account: CASH, debit: "", credit: "" },
  ]);
  const dr = lines.reduce((s, l) => s + (+l.debit || 0), 0),
    cr = lines.reduce((s, l) => s + (+l.credit || 0), 0);
  const [err, setErr] = useState("");
  return (
    <div className="bg-white border-2 border-slate-900 rounded-2xl p-4 space-y-2 text-sm">
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded-lg px-2 py-1"
        />
        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Description"
          className="flex-1 border rounded-lg px-2 py-1"
        />
      </div>
      {lines.map((l, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={l.account}
            onChange={(e) =>
              setLines(lines.map((x, j) => (j === i ? { ...x, account: e.target.value } : x)))
            }
            placeholder="Account (e.g. Expense: Rent)"
            className="flex-1 border rounded-lg px-2 py-1"
          />
          <input
            value={l.debit}
            onChange={(e) =>
              setLines(lines.map((x, j) => (j === i ? { ...x, debit: e.target.value } : x)))
            }
            placeholder="Debit"
            type="number"
            className="w-28 border rounded-lg px-2 py-1"
          />
          <input
            value={l.credit}
            onChange={(e) =>
              setLines(lines.map((x, j) => (j === i ? { ...x, credit: e.target.value } : x)))
            }
            placeholder="Credit"
            type="number"
            className="w-28 border rounded-lg px-2 py-1"
          />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setLines([...lines, { account: "", debit: "", credit: "" }])}
          className="text-xs font-bold text-slate-600"
        >
          + Line
        </button>
        <span
          className={`text-xs font-bold ml-auto ${Math.abs(dr - cr) < 0.005 && dr > 0 ? "text-emerald-600" : "text-red-600"}`}
        >
          Dr {$(dr)} · Cr {$(cr)}
        </span>
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg border text-xs font-bold">
          Cancel
        </button>
        <button
          onClick={() => {
            try {
              addManualEntry({
                date,
                ref: "MAN",
                memo: memo || "Manual entry",
                lines: lines
                  .filter((l) => l.account.trim())
                  .map((l) => ({
                    account: l.account.trim(),
                    debit: +l.debit || 0,
                    credit: +l.credit || 0,
                  })),
              });
              onClose();
            } catch (e) {
              setErr((e as Error).message);
            }
          }}
          className="px-3 py-1.5 rounded-lg bg-slate-900 text-lime-400 text-xs font-bold"
        >
          Save
        </button>
      </div>
      {err && <div className="text-xs text-red-600">{err}</div>}
    </div>
  );
}

function Ledger({ ledger }: { ledger: ReturnType<typeof buildBooks>["ledger"] }) {
  const names = Object.keys(ledger).sort();
  const [acc, setAcc] = useState(names[0] ?? "");
  const rows = ledger[acc] ?? [];
  return (
    <div className="space-y-3">
      <select
        value={acc}
        onChange={(e) => setAcc(e.target.value)}
        className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold"
      >
        {names.map((n) => (
          <option key={n}>{n}</option>
        ))}
      </select>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Ref</th>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-right">Debit</th>
              <th className="p-3 text-right">Credit</th>
              <th className="p-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-2 text-xs">{r.date}</td>
                <td className="p-2 text-xs font-bold">{r.ref}</td>
                <td className="p-2 text-xs">{r.memo}</td>
                <td className="p-2 text-right">{r.debit ? $(r.debit) : ""}</td>
                <td className="p-2 text-right">{r.credit ? $(r.credit) : ""}</td>
                <td className="p-2 text-right font-bold">{$(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Trial({ books }: { books: ReturnType<typeof buildBooks> }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
          <tr>
            <th className="p-3 text-left">Account</th>
            <th className="p-3 text-left">Type</th>
            <th className="p-3 text-right">Debit</th>
            <th className="p-3 text-right">Credit</th>
          </tr>
        </thead>
        <tbody>
          {books.trial.map((t) => (
            <tr key={t.account} className="border-t border-slate-100">
              <td className="p-2">{t.account}</td>
              <td className="p-2 text-xs text-slate-500">{t.type}</td>
              <td className="p-2 text-right">{t.debit ? $(t.debit) : ""}</td>
              <td className="p-2 text-right">{t.credit ? $(t.credit) : ""}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-900 font-black">
            <td className="p-2" colSpan={2}>
              TOTAL
            </td>
            <td className="p-2 text-right">{$(books.tbDebit)}</td>
            <td className="p-2 text-right">{$(books.tbCredit)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Statements({ books }: { books: ReturnType<typeof buildBooks> }) {
  const { pnl, bs } = books;
  const Sec = ({
    title,
    rows,
    total,
    totalLabel,
  }: {
    title: string;
    rows: { account: string; amount: number }[];
    total: number;
    totalLabel: string;
  }) => (
    <div className="mb-4">
      <div className="text-xs font-black uppercase text-slate-400 mb-1">{title}</div>
      {rows.map((r) => (
        <div key={r.account} className="flex justify-between text-sm py-0.5">
          <span>{r.account}</span>
          <span>{$(r.amount)}</span>
        </div>
      ))}
      <div className="flex justify-between text-sm font-black border-t border-slate-200 mt-1 pt-1">
        <span>{totalLabel}</span>
        <span>{$(total)}</span>
      </div>
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-slate-900 text-lime-400 text-xs font-bold"
        >
          Print / Save PDF
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-black text-lg mb-3">Income Statement (Profit & Loss)</h3>
          <Sec
            title="Revenue"
            rows={pnl.revenue}
            total={pnl.totalRevenue}
            totalLabel="Total Revenue"
          />
          <Sec
            title="Expenses"
            rows={pnl.expenses}
            total={pnl.totalExpenses}
            totalLabel="Total Expenses"
          />
          <div
            className={`flex justify-between font-black text-lg border-t-2 border-slate-900 pt-2 ${pnl.netIncome >= 0 ? "text-emerald-700" : "text-red-700"}`}
          >
            <span>Net Income</span>
            <span>{$(pnl.netIncome)}</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-black text-lg mb-3">Balance Sheet</h3>
          <Sec title="Assets" rows={bs.assets} total={bs.totalAssets} totalLabel="Total Assets" />
          <Sec
            title="Liabilities"
            rows={bs.liabilities}
            total={bs.totalLiab}
            totalLabel="Total Liabilities"
          />
          <Sec
            title="Equity"
            rows={[...bs.equity, { account: "Current Period Net Income", amount: pnl.netIncome }]}
            total={bs.totalEquity}
            totalLabel="Total Equity"
          />
          <div className="flex justify-between font-black border-t-2 border-slate-900 pt-2">
            <span>Total Liabilities + Equity</span>
            <span>{$(bs.totalLiab + bs.totalEquity)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
