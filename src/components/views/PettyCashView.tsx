import React, { useMemo, useState } from "react";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Plus } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import {
  useFinEngine,
  addFundTransfer,
  pettyCashFundBalance,
  PETTY_CASH_FUND,
} from "../../lib/financial-engine";

/**
 * Petty Cash Fund — records cash paid into the box (funding transfers),
 * cash paid out (petty-cash expenses), and the remaining box balance.
 */
export const PettyCashView: React.FC = () => {
  const { expenses, accounts, currentUser } = useStore();
  const fin = useFinEngine();

  const [showForm, setShowForm] = useState(false);
  const [fromAccountId, setFromAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const pettyExpenses = useMemo(
    () => expenses.filter((e) => e.isPettyCash),
    [expenses],
  );
  const totalSpent = pettyExpenses.reduce((s, e) => s + e.amount, 0);
  const totalFunded = fin.fundTransfers.reduce((s, t) => s + t.amount, 0);
  const balance = pettyCashFundBalance(fin.fundTransfers, totalSpent);

  const handleAdd = () => {
    const amt = parseFloat(amount);
    const acc = accounts.find((a) => a.id === fromAccountId);
    if (!acc || !amt || amt <= 0) {
      alert("Fadlan dooro akoonka oo geli lacag sax ah.");
      return;
    }
    addFundTransfer({
      date: new Date().toISOString().slice(0, 10),
      fromAccountId: acc.id,
      fromAccountName: acc.name,
      amount: amt,
      notes: notes.trim() || undefined,
      createdBy: currentUser?.name || "Admin",
    });
    setAmount("");
    setNotes("");
    setFromAccountId("");
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            Petty Cash Fund (Sanduuqa Lacagta Yaryar)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Diiwaan geli lacagaha sanduuqa la geliyay, lacagaha laga bixiyay, iyo hadhaaga.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-lime-400 text-xs font-bold hover:bg-slate-800 transition"
        >
          <Plus className="w-4 h-4" />
          Lacag Gelin (Fund)
        </button>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase">
            <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
            Wadarta La Geliyay
          </div>
          <div className="mt-1 text-2xl font-black text-slate-900 font-mono">
            ${totalFunded.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase">
            <ArrowUpCircle className="w-4 h-4 text-rose-500" />
            Wadarta Laga Bixiyay
          </div>
          <div className="mt-1 text-2xl font-black text-rose-600 font-mono">
            ${totalSpent.toFixed(2)}
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-slate-400 uppercase">
            Hadhaaga Sanduuqa
          </div>
          <div
            className={`mt-1 text-2xl font-black font-mono ${
              balance >= 0 ? "text-lime-400" : "text-rose-400"
            }`}
          >
            ${balance.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Funding form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-black text-slate-900">
            Lacag cusub oo sanduuqa la gelinayo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Akoonka laga qaadanayo
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Dooro akoonka</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (${a.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Lacagta ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Faallo (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                placeholder="Sababta..."
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition"
          >
            Kaydso
          </button>
        </div>
      )}

      {/* Funding history */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 text-sm font-black text-slate-900">
          Lacagaha La Geliyay ({PETTY_CASH_FUND})
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="px-5 py-2 font-semibold">Taariikh</th>
              <th className="px-5 py-2 font-semibold">Laga Qaatay</th>
              <th className="px-5 py-2 font-semibold">Faallo</th>
              <th className="px-5 py-2 font-semibold">Geliyay</th>
              <th className="px-5 py-2 font-semibold text-right">Lacagta</th>
            </tr>
          </thead>
          <tbody>
            {fin.fundTransfers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                  Weli lacag lama gelin sanduuqa.
                </td>
              </tr>
            )}
            {fin.fundTransfers.map((t) => (
              <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-5 py-2 font-mono">{t.date}</td>
                <td className="px-5 py-2">{t.fromAccountName}</td>
                <td className="px-5 py-2 text-slate-500">{t.notes || "—"}</td>
                <td className="px-5 py-2 text-slate-500">{t.createdBy}</td>
                <td className="px-5 py-2 text-right font-mono font-bold text-emerald-700">
                  +${t.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Petty cash expenses */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 text-sm font-black text-slate-900">
          Kharashyada Laga Bixiyay Sanduuqa (Petty Cash Expenses)
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="px-5 py-2 font-semibold">Taariikh</th>
              <th className="px-5 py-2 font-semibold">Cinwaanka</th>
              <th className="px-5 py-2 font-semibold">Qaybta</th>
              <th className="px-5 py-2 font-semibold text-right">Lacagta</th>
            </tr>
          </thead>
          <tbody>
            {pettyExpenses.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-slate-400">
                  Weli kharash petty cash ah lama diiwaan gelin.
                </td>
              </tr>
            )}
            {pettyExpenses.map((e) => (
              <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-5 py-2 font-mono">{e.date}</td>
                <td className="px-5 py-2 font-semibold text-slate-800">{e.title}</td>
                <td className="px-5 py-2 text-slate-500">
                  {e.pettyCashCategory || e.category}
                </td>
                <td className="px-5 py-2 text-right font-mono font-bold text-rose-600">
                  -${e.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
