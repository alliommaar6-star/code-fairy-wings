import React, { useState } from "react";
import { DollarSign, Wallet, Building2, Calendar, FileText, AlertTriangle } from "lucide-react";
import { Modal } from "../common/Modal";
import { Supplier } from "../../types";
import { useStore } from "../../context/StoreContext";

interface SupplierPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onSuccess?: () => void;
}

export const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onSuccess,
}) => {
  const { accounts, recordSupplierPayment, currentUser } = useStore();

  const [amount, setAmount] = useState<string>(
    supplier?.balance ? supplier.balance.toString() : "",
  );
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || "");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  if (!supplier) return null;

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const parsedAmount = parseFloat(amount) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (parsedAmount <= 0) {
      setErrorMsg("Payment amount must be greater than zero.");
      return;
    }

    if (parsedAmount > supplier.balance) {
      setErrorMsg(
        `Payment amount ($${parsedAmount.toFixed(2)}) exceeds current outstanding balance ($${supplier.balance.toFixed(2)}).`,
      );
      return;
    }

    if (!selectedAccount) {
      setErrorMsg("Please select a payment account.");
      return;
    }

    const now = new Date();
    const dateOnly = now.toISOString().split("T")[0];
    const timeOnly = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    recordSupplierPayment({
      paymentNo: `PAY-SP-${Date.now().toString().slice(-4)}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: dateOnly,
      time: timeOnly,
      amount: parsedAmount,
      paymentMethod: selectedAccount.name,
      accountId: selectedAccount.id,
      accountName: selectedAccount.name,
      referenceNo: referenceNo.trim() || undefined,
      notes: notes.trim() || `Settlement of outstanding balance for ${supplier.name}`,
      actor: currentUser.name || "Admin",
    });

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Make Supplier Payment"
      subtitle={`Settle accounts payable for ${supplier.name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Current Outstanding Balance
            </span>
            <span className="text-base font-black text-amber-600">
              ${supplier.balance.toFixed(2)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAmount(supplier.balance.toString())}
            className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 shadow-2xs transition-colors"
          >
            Pay Full Balance
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Payment Amount ($) *
          </label>
          <div className="relative">
            <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={supplier.balance}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Disburse From Commercial Account *
          </label>
          <div className="relative">
            <Wallet className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type}) • Avail: ${acc.balance.toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          {selectedAccount && parsedAmount > selectedAccount.balance && (
            <p className="mt-1 text-[11px] font-semibold text-amber-600">
              ⚠️ Warning: Disbursement exceeds current account balance ($
              {selectedAccount.balance.toFixed(2)}).
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Bank Ref / EVC Txn ID
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="TXN-884910"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Payment Memo
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Check or transfer note"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-600">Remaining Balance After Payment:</span>
          <span className="font-black text-slate-900">
            ${Math.max(0, supplier.balance - parsedAmount).toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Confirm Payment Outflow
          </button>
        </div>
      </form>
    </Modal>
  );
};
