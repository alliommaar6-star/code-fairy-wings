import React, { useState, useMemo } from "react";
import { TrendingUp, DollarSign, Plus, Search, Wallet, Tag, Trash2 } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { StatCard } from "../common/StatCard";

interface IncomeViewProps {
  onOpenNewIncome: () => void;
}

export const IncomeView: React.FC<IncomeViewProps> = ({ onOpenNewIncome }) => {
  const { incomes, deleteIncome } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = useMemo(() => {
    return ["All", ...Array.from(new Set(incomes.map((i) => i.category)))];
  }, [incomes]);

  const filteredIncomes = useMemo(() => {
    return incomes.filter((i) => {
      const matchSearch =
        i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.notes && i.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        i.depositedToAccountName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory = selectedCategory === "All" || i.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [incomes, searchQuery, selectedCategory]);

  const totalIncomeAmount = incomes.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Additional Income
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Log external revenue, commissions, delivery fees, service charges, and capital
            injections.
          </p>
        </div>

        <button
          onClick={onOpenNewIncome}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4 text-lime-400 stroke-[3]" />
          Record Income
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Income"
          value={`$${totalIncomeAmount.toFixed(2)}`}
          subtitle={`${incomes.length} intake deposits`}
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          highlight
        />

        <StatCard
          title="Commissions"
          value={`$${incomes
            .filter((i) => i.category === "Commission")
            .reduce((s, i) => s + i.amount, 0)
            .toFixed(2)}`}
          subtitle="Cargo handling commissions"
          icon={DollarSign}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />

        <StatCard
          title="Service Fees"
          value={`$${incomes
            .filter((i) => i.category === "Service Fee")
            .reduce((s, i) => s + i.amount, 0)
            .toFixed(2)}`}
          subtitle="Handling & logistics fees"
          icon={Tag}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Direct Intakes"
          value={`$${incomes
            .filter((i) => i.category === "Direct Sales" || i.category === "Investment")
            .reduce((s, i) => s + i.amount, 0)
            .toFixed(2)}`}
          subtitle="Capital / miscellaneous"
          icon={Wallet}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search description, account..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "All Categories" : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Incomes Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Income Description</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-4">Deposited To Account</th>
                <th className="py-3 px-3 text-right">Amount ($)</th>
                <th className="py-3 px-3">Recorded By</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredIncomes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No income entries recorded.
                  </td>
                </tr>
              ) : (
                filteredIncomes.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{i.title}</div>
                      {i.notes && (
                        <div className="text-[10px] text-slate-400 font-normal">{i.notes}</div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        {i.category}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{i.date}</td>

                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {i.depositedToAccountName}
                    </td>

                    <td className="py-3 px-3 text-right font-black text-emerald-600">
                      +${i.amount.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-slate-500">{i.recordedBy}</td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          if (confirm(`Delete income "${i.title}"?`)) {
                            deleteIncome(i.id);
                          }
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
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
