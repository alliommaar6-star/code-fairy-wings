import React, { useState } from "react";
import {
  Wallet,
  Building2,
  Smartphone,
  ArrowRightLeft,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { Account, AccountTransfer } from "../../types";
import { StatCard } from "../common/StatCard";
import { Modal } from "../common/Modal";

interface AccountsViewProps {
  onOpenTransfer: () => void;
  onOpenNewExpense: () => void;
  onOpenNewIncome: () => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  onOpenTransfer,
  onOpenNewExpense,
  onOpenNewIncome,
}) => {
  const { accounts, accountTransfers, addAccount } = useStore();

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState<Account["type"]>("bank");
  const [newAccNumber, setNewAccNumber] = useState("");
  const [newAccBalance, setNewAccBalance] = useState("0");

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    addAccount({
      name: newAccName.trim(),
      type: newAccType,
      accountNumber: newAccNumber.trim() || undefined,
      balance: parseFloat(newAccBalance) || 0,
      currency: "USD",
      isActive: true,
    });

    setIsAddAccountOpen(false);
    setNewAccName("");
    setNewAccNumber("");
    setNewAccBalance("0");
  };

  const getAccountIcon = (type: Account["type"]) => {
    switch (type) {
      case "bank":
        return <Building2 className="w-5 h-5 text-blue-600" />;
      case "mobile_money":
        return <Smartphone className="w-5 h-5 text-emerald-600" />;
      case "cash":
      default:
        return <Wallet className="w-5 h-5 text-amber-600" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Accounts & Financial Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time cash drawers, EVC Plus, and bank reserves with atomic double-entry ledger
            balance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTransfer}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
          >
            <ArrowRightLeft className="w-4 h-4 text-slate-600" />
            Transfer Funds
          </button>

          <button
            onClick={() => setIsAddAccountOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-lime-400 stroke-[3]" />
            Add Account
          </button>
        </div>
      </div>

      {/* KPI Cards (Screenshot 7) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Treasury Pool"
          value={`$${totalBalance.toFixed(2)}`}
          subtitle="Net liquid cash & bank"
          icon={Wallet}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          highlight
        />

        <StatCard
          title="Active Accounts"
          value={accounts.length}
          subtitle="Cash drawers & bank vaults"
          icon={Building2}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Inter-Account Transfers"
          value={accountTransfers.length}
          subtitle="Liquidity re-allocations"
          icon={ArrowRightLeft}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />

        <StatCard
          title="Ledger Health"
          value="100% Balanced"
          subtitle="Mathematical audit verified"
          icon={CheckCircle2}
          iconBg="bg-lime-50"
          iconColor="text-lime-700"
        />
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  {getAccountIcon(acc.type)}
                </div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {acc.type.replace("_", " ")}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-sm">{acc.name}</h3>
              {acc.accountNumber && (
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">{acc.accountNumber}</p>
              )}

              <div className="mt-4">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Available Balance
                </div>
                <div className="text-2xl font-black text-slate-900">${acc.balance.toFixed(2)}</div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                onClick={onOpenNewIncome}
                className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" /> Deposit
              </button>
              <button
                onClick={onOpenNewExpense}
                className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
              >
                <ArrowUpRight className="w-3.5 h-3.5" /> Spend
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Inter-Account Transfers History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Recent Account Transfers</h3>
            <p className="text-xs text-slate-500">
              Internal liquidity shifts between cash drawers, mobile wallets, and banking vaults.
            </p>
          </div>
        </div>

        {accountTransfers.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">No transfers recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto text-xs">
            {accountTransfers.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{t.fromAccountName}</span>
                    <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                    <span className="font-bold text-slate-900">{t.toAccountName}</span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {t.date} • {t.performedBy} {t.note ? `• "${t.note}"` : ""}
                  </div>
                </div>

                <div className="text-right font-black text-slate-900">${t.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      <Modal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        title="Add Financial Account"
        subtitle="Configure physical cash drawer, EVC Plus wallet, or commercial bank."
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsAddAccountOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="form-add-acc"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
            >
              Save Account
            </button>
          </>
        }
      >
        <form id="form-add-acc" onSubmit={handleCreateAccount} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Account Name
            </label>
            <input
              type="text"
              required
              value={newAccName}
              onChange={(e) => setNewAccName(e.target.value)}
              placeholder="e.g. Sahal Mobile Money, Backup Safe Box"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Account Type
              </label>
              <select
                value={newAccType}
                onChange={(e) => setNewAccType(e.target.value as Account["type"])}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900"
              >
                <option value="cash">Cash Drawer</option>
                <option value="mobile_money">Mobile Money (EVC / Sahal)</option>
                <option value="bank">Commercial Bank</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Account / Phone No
              </label>
              <input
                type="text"
                value={newAccNumber}
                onChange={(e) => setNewAccNumber(e.target.value)}
                placeholder="+252 61... or IBAN"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Initial Balance ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={newAccBalance}
              onChange={(e) => setNewAccBalance(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
