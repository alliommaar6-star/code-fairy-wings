import React, { useMemo, useState } from "react";
import { Smartphone, Scale, Plus, CheckCircle2, AlertTriangle } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { useFinEngine, addReconciliation } from "../../lib/financial-engine";

/**
 * EVC Plus Reconciliation — compares the system's ledger balance for each
 * mobile-money account against the real balance reported by the provider,
 * and records the difference (never silently fixed).
 */
export const EvcReconciliationView: React.FC = () => {
  const { accounts, currentUser } = useStore();
  const fin = useFinEngine();

  const [showForm, setShowForm] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [liveBalance, setLiveBalance] = useState("");
  const [reason, setReason] = useState("");

  const mobileAccounts = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.type === "Mobile Money" ||
          a.type === "mobile_money" ||
          /evc|zaad|sahal|mobile/i.test(a.name),
      ),
    [accounts],
  );

  const selected = accounts.find((a) => a.id === accountId);

  const handleAdd = () => {
    const live = parseFloat(liveBalance);
    if (!selected || isNaN(live)) {
      alert("Fadlan dooro akoonka oo geli hadhaaga dhabta ah.");
      return;
    }
    addReconciliation({
      date: new Date().toISOString().slice(0, 10),
      accountId: selected.id,
      accountName: selected.name,
      liveBalance: live,
      ledgerBalance: selected.balance,
      reason: reason.trim() || "Isbarbardhig maalinle",
      createdBy: currentUser?.name || "Admin",
    });
    setLiveBalance("");
    setReason("");
    setAccountId("");
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-600" />
            Isbarbardhigga EVC Plus (Reconciliation)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Hubi in hadhaaga nidaamku uu la mid yahay hadhaaga dhabta ah ee EVC-ga.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-lime-400 text-xs font-bold hover:bg-slate-800 transition"
        >
          <Plus className="w-4 h-4" />
          Isbarbardhig Cusub
        </button>
      </div>

      {/* Current ledger balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {mobileAccounts.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-xs">
            Akoon mobile money ah lama helin. Ku dar akoon EVC ah bogga Payment Accounts.
          </div>
        )}
        {mobileAccounts.map((a) => (
          <div key={a.id} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-[11px] font-bold text-slate-500 uppercase">{a.name}</div>
            <div className="mt-1 text-2xl font-black text-slate-900 font-mono">
              ${a.balance.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Hadhaaga nidaamka (ledger)
            </div>
          </div>
        ))}
      </div>

      {/* New reconciliation form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-500" />
            Isbarbardhig cusub
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Akoonka
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Dooro akoonka</option>
                {mobileAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (ledger: ${a.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Hadhaaga Dhabta ah ee EVC ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={liveBalance}
                onChange={(e) => setLiveBalance(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Sababta / Faallo
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                placeholder="Tusaale: kharash simbiil..."
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition"
          >
            Kaydso Isbarbardhigga
          </button>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 text-sm font-black text-slate-900">
          Taariikhda Isbarbardhigga
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="px-5 py-2 font-semibold">Taariikh</th>
              <th className="px-5 py-2 font-semibold">Akoonka</th>
              <th className="px-5 py-2 font-semibold text-right">Nidaamka</th>
              <th className="px-5 py-2 font-semibold text-right">Dhabta</th>
              <th className="px-5 py-2 font-semibold text-right">Farqiga</th>
              <th className="px-5 py-2 font-semibold">Sababta</th>
              <th className="px-5 py-2 font-semibold">Xaalad</th>
            </tr>
          </thead>
          <tbody>
            {fin.reconciliations.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-center text-slate-400">
                  Weli isbarbardhig lama sameyn.
                </td>
              </tr>
            )}
            {fin.reconciliations.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-5 py-2 font-mono">{r.date}</td>
                <td className="px-5 py-2 font-semibold text-slate-800">{r.accountName}</td>
                <td className="px-5 py-2 text-right font-mono">
                  ${r.ledgerBalance.toFixed(2)}
                </td>
                <td className="px-5 py-2 text-right font-mono">
                  ${r.liveBalance.toFixed(2)}
                </td>
                <td
                  className={`px-5 py-2 text-right font-mono font-bold ${
                    r.difference === 0
                      ? "text-emerald-600"
                      : r.difference > 0
                        ? "text-amber-600"
                        : "text-rose-600"
                  }`}
                >
                  {r.difference >= 0 ? "+" : ""}${r.difference.toFixed(2)}
                </td>
                <td className="px-5 py-2 text-slate-500">{r.reason}</td>
                <td className="px-5 py-2">
                  {r.difference === 0 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Waafaqsan
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" /> Farqi
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
