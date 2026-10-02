import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, Trash2, LineChart } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { askStockAdvisor } from "../../lib/insights.functions";
import { Md } from "./AccountantView";

type Msg = { role: "user" | "assistant"; content: string };
const KEY = "benadir_ai_stock_advisor_v1";
const SUGGESTIONS = [
  "Which products will run out in the next 2 weeks and how much should I reorder?",
  "What are my best and worst sellers this month?",
  "Which items are dead stock that I should discount?",
  "How is sales trending over the last 60 days?",
];

const day = (d: string) => (d || "").slice(0, 10);

export const StockInsightsView: React.FC = () => {
  const { products, sales, inventoryMovements } = useStore();
  const ask = useServerFn(askStockAdvisor);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setMsgs(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { /* ignore */ }
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const buildSnapshot = () => {
    const now = Date.now();
    const ago = (n: number) => new Date(now - n * 864e5).toISOString().slice(0, 10);
    const d30 = ago(30), d90 = ago(90), d60 = ago(60);
    const per: Record<string, { u30: number; u90: number; rev30: number }> = {};
    const daily: Record<string, number> = {};
    for (const s of sales) {
      const d = day(s.date);
      if (d >= d60) daily[d] = (daily[d] || 0) + (s.grandTotal || 0);
      if (d < d90) continue;
      for (const it of s.items || []) {
        const p = (per[it.productId] ||= { u30: 0, u90: 0, rev30: 0 });
        p.u90 += it.quantity;
        if (d >= d30) { p.u30 += it.quantity; p.rev30 += it.total; }
      }
    }
    return JSON.stringify({
      today: ago(0),
      products: products.filter((p) => !p.isArchived).map((p) => ({
        name: p.name, sku: p.sku, category: p.category, stock: p.stock, minStock: p.minStockLevel,
        cost: p.costPrice, price: p.sellingPrice, unitsSold30d: per[p.id]?.u30 || 0,
        unitsSold90d: per[p.id]?.u90 || 0, revenue30d: Math.round(per[p.id]?.rev30 || 0),
      })),
      dailySalesTotals60d: Object.entries(daily).sort().map(([d, v]) => ({ d, total: Math.round(v) })),
      recentStockMovements: inventoryMovements.slice(-150).map((m) => ({
        date: day(m.date), product: m.productName, type: m.type, qty: m.quantityChange, after: m.stockAfter,
      })),
    });
  };

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next); setInput(""); setErr(""); setBusy(true);
    const r = await ask({ data: { messages: next, snapshot: buildSnapshot() } }).catch((e) => ({ text: "", error: String(e) }));
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    const done = [...next, { role: "assistant" as const, content: r.text }];
    setMsgs(done);
    localStorage.setItem(KEY, JSON.stringify(done));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col gap-4 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-900 text-lime-400 flex items-center justify-center"><LineChart className="w-5 h-5" /></div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Stock Advisor</h1>
            <p className="text-xs text-slate-500">Ask about sales and inventory — get trends and reorder advice.</p>
          </div>
        </div>
        {msgs.length > 0 && (
          <button onClick={() => { setMsgs([]); localStorage.setItem(KEY, "[]"); }} className="text-xs font-bold text-slate-500 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Clear</button>
        )}
      </div>

      <div className="flex-1 space-y-4">
        {msgs.length === 0 && (
          <div className="grid sm:grid-cols-2 gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => void send(s)} className="text-left text-sm rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-400">{s}</button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => m.role === "user" ? (
          <div key={i} className="flex justify-end"><div className="max-w-[80%] rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm whitespace-pre-wrap">{m.content}</div></div>
        ) : (
          <div key={i} className="text-sm text-slate-800"><Md text={m.content} /></div>
        ))}
        {busy && <p className="text-sm text-slate-500 animate-pulse">Analysing your sales and stock…</p>}
        {err && <p className="text-sm font-bold text-rose-600">{err}</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="sticky bottom-0 flex gap-2 bg-[#f8fafc] py-2">
        <textarea autoFocus rows={2} value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
          placeholder="e.g. What should I reorder this week?" className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        <button disabled={busy || !input.trim()} className="rounded-xl bg-slate-900 text-lime-400 px-4 disabled:opacity-40"><Send className="w-4 h-4" /></button>
      </form>
    </div>
  );
};
