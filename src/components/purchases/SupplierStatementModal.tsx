import React, { useState } from "react";
import {
  Printer,
  Calendar,
  Building2,
  FileText,
  DollarSign,
  Download,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { Modal } from "../common/Modal";
import { Supplier, SupplierStatementEntry } from "../../types";
import { useStore } from "../../context/StoreContext";

interface SupplierStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export const SupplierStatementModal: React.FC<SupplierStatementModalProps> = ({
  isOpen,
  onClose,
  supplier,
}) => {
  const { getSupplierStatement, settings } = useStore();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  if (!supplier) return null;

  const allEntries = getSupplierStatement(supplier.id);

  const filteredEntries = allEntries.filter((e) => {
    if (startDate && e.date < startDate) return false;
    if (endDate && e.date > endDate) return false;
    return true;
  });

  const totalDebits = filteredEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredits = filteredEntries.reduce((s, e) => s + e.credit, 0);
  const endingBalance =
    filteredEntries.length > 0
      ? filteredEntries[filteredEntries.length - 1].runningBalance
      : supplier.balance;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Statement of Account: ${supplier.name}`}
      subtitle={`Vendor Ledger & Accounts Payable Tracking • ${supplier.phone}`}
      maxWidth="2xl"
    >
      <div className="space-y-6 print:m-0 print:p-0">
        {/* Header Summary & Date Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Outstanding Accounts Payable Balance
            </span>
            <span className="text-xl font-black text-amber-600">
              ${supplier.balance.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="From"
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="To"
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden"
            />
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Type / Ref</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Debit (PO)</th>
                <th className="py-2.5 px-3 text-right">Credit (Paid)</th>
                <th className="py-2.5 px-3 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No transactions recorded for this supplier.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {e.date}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {e.type === "purchase" ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                        <span className="font-mono font-bold text-slate-900 text-[11px]">
                          {e.referenceNo}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 text-[11px]">
                      <div>{e.description}</div>
                      {e.accountName && (
                        <span className="text-[10px] text-slate-400">Via {e.accountName}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                      {e.debit > 0 ? `$${e.debit.toFixed(2)}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                      {e.credit > 0 ? `$${e.credit.toFixed(2)}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                      ${e.runningBalance.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Totals */}
        <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Invoiced (Debits)
            </span>
            <span className="font-bold text-blue-700 text-sm">${totalDebits.toFixed(2)}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Disbursed (Credits)
            </span>
            <span className="font-bold text-emerald-700 text-sm">${totalCredits.toFixed(2)}</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Ending Ledger Due
            </span>
            <span className="font-black text-slate-900 text-sm">${endingBalance.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Close Statement
          </button>
        </div>
      </div>
    </Modal>
  );
};
