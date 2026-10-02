import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { useStore } from "../../context/StoreContext";
import { Customer } from "../../types";

interface ReceivePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
}

export const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const { customers, accounts, receiveCustomerPayment, sales } = useStore();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    customer?.id || customers.find((c) => c.balance > 0)?.id || customers[0]?.id || "",
  );
  const [amount, setAmount] = useState<string>("");
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || "");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");

  const targetCustomer = customers.find((c) => c.id === selectedCustomerId);
  const customerDebts = sales.filter(
    (s) => s.customerId === selectedCustomerId && s.remainingBalance > 0,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }
    if (!selectedCustomerId || !accountId) return;

    receiveCustomerPayment(
      selectedCustomerId,
      parsedAmount,
      accountId,
      selectedInvoiceId || undefined,
    );
    onClose();
    setAmount("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Receive Payment"
      subtitle="Collect debt settlement or advance installment from customer."
      maxWidth="lg"
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
            form="form-receive-payment"
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            Record Payment
          </button>
        </>
      }
    >
      <form id="form-receive-payment" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Customer
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-slate-900"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.balance > 0 ? `(Debt: $${c.balance.toFixed(2)})` : "(No debt)"}
              </option>
            ))}
          </select>
        </div>

        {targetCustomer && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-rose-800 tracking-wider">
                Total Outstanding Debt
              </span>
              <div className="text-xl font-black text-rose-700">
                ${targetCustomer.balance.toFixed(2)}
              </div>
            </div>
            {targetCustomer.balance > 0 && (
              <button
                type="button"
                onClick={() => setAmount(targetCustomer.balance.toString())}
                className="px-3 py-1 bg-white border border-rose-300 text-rose-700 text-xs font-bold rounded-lg shadow-xs hover:bg-rose-100/50"
              >
                Pay Full Balance
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Amount Received ($) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Deposit Into Account *
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (${acc.balance.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Customer unpaid sales list */}
        {customerDebts.length > 0 && (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Apply to Specific Invoice (Optional)
            </label>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-36 overflow-y-auto">
              {customerDebts.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-center justify-between p-2.5 text-xs cursor-pointer hover:bg-slate-50 ${
                    selectedInvoiceId === s.id ? "bg-emerald-50/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="debt-invoice"
                      checked={selectedInvoiceId === s.id}
                      onChange={() => setSelectedInvoiceId(s.id)}
                    />
                    <div>
                      <span className="font-bold text-slate-800">{s.invoiceNo}</span>
                      <span className="text-slate-400 ml-2">{s.date}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-rose-600">
                      Remaining: ${s.remainingBalance.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Total: ${s.grandTotal.toFixed(2)}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
