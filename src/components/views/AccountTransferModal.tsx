import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { useStore } from "../../context/StoreContext";
import { ArrowRightLeft } from "lucide-react";

interface AccountTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountTransferModal: React.FC<AccountTransferModalProps> = ({ isOpen, onClose }) => {
  const { accounts, transferFunds, currentUser } = useStore();

  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const fromAcc = accounts.find((a) => a.id === fromAccountId);
  const toAcc = accounts.find((a) => a.id === toAccountId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      alert("Please enter a valid transfer amount");
      return;
    }
    if (fromAccountId === toAccountId) {
      alert("Source and destination accounts must be different");
      return;
    }
    if (fromAcc && fromAcc.balance < parsedAmount) {
      alert(`Insufficient funds in ${fromAcc.name}. Available: $${fromAcc.balance.toFixed(2)}`);
      return;
    }

    transferFunds({
      date: new Date().toISOString().split("T")[0],
      fromAccountId,
      fromAccountName: fromAcc?.name || "Account",
      toAccountId,
      toAccountName: toAcc?.name || "Account",
      amount: parsedAmount,
      note,
      performedBy: currentUser.name,
    });

    onClose();
    setAmount("");
    setNote("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Account Transfer"
      subtitle="Shift liquidity between cash drawer, EVC Plus, and bank vaults."
      maxWidth="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="form-account-transfer"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Transfer Funds
          </button>
        </>
      }
    >
      <form id="form-account-transfer" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            From Account (Source)
          </label>
          <select
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-slate-900"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} — Balance: ${acc.balance.toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            To Account (Destination)
          </label>
          <select
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-slate-900"
          >
            {accounts
              .filter((acc) => acc.id !== fromAccountId)
              .map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} — Balance: ${acc.balance.toFixed(2)}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Transfer Amount ($) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Description / Reason
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Daily cash collection deposit to bank"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </form>
    </Modal>
  );
};
