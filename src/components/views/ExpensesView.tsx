import React, { useState, useMemo } from "react";
import {
  TrendingDown,
  DollarSign,
  Plus,
  Search,
  Wallet,
  Trash2,
  Tag,
  Coins,
  Building2,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { Expense } from "../../types";
import { StatCard } from "../common/StatCard";

interface ExpensesViewProps {
  onOpenNewExpense: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onOpenNewExpense }) => {
  const { expenses, deleteExpense } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [scopeFilter, setScopeFilter] = useState<"all" | "petty" | "standard">("all");

  const categories = useMemo(() => {
    return ["All", ...Array.from(new Set(expenses.map((e) => e.category)))];
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.customExpenseName && e.customExpenseName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        e.paidFromAccountName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory = selectedCategory === "All" || e.category === selectedCategory;

      const matchScope =
        scopeFilter === "all"
          ? true
          : scopeFilter === "petty"
            ? Boolean(e.isPettyCash)
            : !e.isPettyCash;

      return matchSearch && matchCategory && matchScope;
    });
  }, [expenses, searchQuery, selectedCategory, scopeFilter]);

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const pettyCashExpenses = expenses.filter((e) => e.isPettyCash);
  const totalPettyCashAmount = pettyCashExpenses.reduce((sum, e) => sum + e.amount, 0);

  const getAccountIcon = (accountName: string) => {
    const lower = accountName.toLowerCase();
    if (lower.includes("evc") || lower.includes("sahal") || lower.includes("somtel") || lower.includes("dahab")) {
      return <Smartphone className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />;
    }
    if (lower.includes("bank") || lower.includes("salaam") || lower.includes("premier")) {
      return <Building2 className="w-3.5 h-3.5 text-blue-600 inline mr-1" />;
    }
    return <Wallet className="w-3.5 h-3.5 text-amber-600 inline mr-1" />;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Kharashyada (Expenses)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Diiwaanka kharashaadka yaryar (Petty Cash) iyo kharashaadka guud ee ganacsiga — toos looga jaray xisaabaadka lacagta.
          </p>
        </div>

        <button
          onClick={onOpenNewExpense}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-lime-400 text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4 text-lime-400 stroke-[3]" />
          Diiwaangeli Kharash (Record Expense)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Expenses"
          value={`$${totalExpenseAmount.toFixed(2)}`}
          subtitle={`${expenses.length} biilal & kharashyo la bixiyey`}
          icon={TrendingDown}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          highlight
        />

        <StatCard
          title="Petty Cash (Yaryar)"
          value={`$${totalPettyCashAmount.toFixed(2)}`}
          subtitle={`${pettyCashExpenses.length} jeer la bixiyay (EVC / Cash)`}
          icon={Coins}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />

        <StatCard
          title="Transportation & Fuel"
          value={`$${expenses
            .filter((e) => e.category === "Transportation" || e.category === "Logistics")
            .reduce((s, e) => s + e.amount, 0)
            .toFixed(2)}`}
          subtitle="Gaadiid, Bajaj & shidaal"
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        <StatCard
          title="Utilities & Supplies"
          value={`$${expenses
            .filter((e) => e.category === "Utilities" || e.category === "Supplies")
            .reduce((s, e) => s + e.amount, 0)
            .toFixed(2)}`}
          subtitle="Koronto, kaar & qalab"
          icon={Tag}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      {/* Filter Bar with Scope Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Quick Scope Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setScopeFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                scopeFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Dhammaan ({expenses.length})
            </button>
            <button
              onClick={() => setScopeFilter("petty")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                scopeFilter === "petty"
                  ? "bg-amber-400 text-slate-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              Petty Cash ({pettyCashExpenses.length})
            </button>
            <button
              onClick={() => setScopeFilter("standard")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                scopeFilter === "standard"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Standard ({expenses.length - pettyCashExpenses.length})
            </button>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 w-full sm:w-auto"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Categories (Dhammaan)" : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Raadi kharash, account (tusaale: EVC Plus, Parking, Bajaj, Shidaal)..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Kharashka (Title)</th>
                <th className="py-3 px-3">Nooca / Category</th>
                <th className="py-3 px-3">Taariikhda</th>
                <th className="py-3 px-4">Account-ka Laga Bixiyay</th>
                <th className="py-3 px-3 text-right">Cadadka ($)</th>
                <th className="py-3 px-3">Qofka Diiwaangeliyay</th>
                <th className="py-3 px-4 text-center">Tirtir</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Kharash laguma helin xogtaan. Riix "Diiwaangeli Kharash" si aad u geliso.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        {e.isPettyCash && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                            <Coins className="w-2.5 h-2.5" />
                            Petty
                          </span>
                        )}
                        <span>
                          {e.customExpenseName
                            ? `Other: ${e.customExpenseName}`
                            : e.title}
                        </span>
                      </div>
                      {e.notes && (
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">{e.notes}</div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {e.category}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{e.date}</td>

                    <td className="py-3 px-4 font-bold text-slate-800">
                      <div className="flex items-center">
                        {getAccountIcon(e.paidFromAccountName)}
                        <span>{e.paidFromAccountName}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-black text-rose-600 text-sm">
                      -${e.amount.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-slate-500">{e.recordedBy}</td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Ma hubtaa inaad tirtirto kharashka "${e.title}" ($${e.amount.toFixed(2)})?\n\nLacagtan waxaa dib loogu celin doonaa account-ka ${e.paidFromAccountName}.`
                            )
                          ) {
                            deleteExpense(e.id);
                          }
                        }}
                        title="Tirtir oo lacagta dib ugu celi account-ka"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
