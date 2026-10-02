import React, { useState, useMemo } from "react";
import {
  ShoppingCart,
  DollarSign,
  Clock,
  Search,
  Filter,
  Plus,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Truck,
  Store,
  CreditCard,
  Eye,
  FileText,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { Sale, PaymentStatus, FulfillmentType } from "../../types";
import { StatCard } from "../common/StatCard";

interface SalesViewProps {
  onOpenNewSale: () => void;
  onViewReceipt: (sale: Sale) => void;
  onOpenReturn: (sale: Sale) => void;
  onReceivePayment: (sale: Sale) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  onOpenNewSale,
  onViewReceipt,
  onOpenReturn,
  onReceivePayment,
}) => {
  const { sales } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Filtered sales list
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchesSearch =
        s.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.customerPhone && s.customerPhone.includes(searchQuery));

      const matchesStatus = statusFilter === "all" || s.paymentStatus === statusFilter;

      const matchesFulfillment =
        fulfillmentFilter === "all" || s.fulfillmentType === fulfillmentFilter;

      return matchesSearch && matchesStatus && matchesFulfillment;
    });
  }, [sales, searchQuery, statusFilter, fulfillmentFilter]);

  // Aggregate stats
  const totalSalesAmount = sales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalPaidAmount = sales.reduce((sum, s) => sum + s.amountPaid, 0);
  const totalRemainingAmount = sales.reduce((sum, s) => sum + s.remainingBalance, 0);
  const totalGrossProfit = sales.reduce((sum, s) => sum + s.grossProfit, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Sales</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Invoices, payments, delivery, and cargo — every sale posts to stock and accounts
            automatically.
          </p>
        </div>

        <button
          id="btn-new-sale-header"
          onClick={onOpenNewSale}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4 text-lime-400 stroke-[3]" />
          New Sale
        </button>
      </div>

      {/* 4 Sales KPI Cards (matching reference screenshot 2, 5, 16) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Sales"
          value={`$${totalSalesAmount.toFixed(2)}`}
          subtitle={`${sales.length} invoices generated`}
          icon={ShoppingCart}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Total Paid"
          value={`$${totalPaidAmount.toFixed(2)}`}
          subtitle="Settled in cash/bank"
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        <StatCard
          title="Total Remaining"
          value={`$${totalRemainingAmount.toFixed(2)}`}
          subtitle="Customer debt outstanding"
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />

        <StatCard
          title="Gross Profit"
          value={`$${totalGrossProfit.toFixed(2)}`}
          subtitle="Net sales margin"
          icon={DollarSign}
          iconBg="bg-lime-50"
          iconColor="text-lime-700"
          highlight
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sale no, customer, phone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="all">All statuses</option>
            <option value="full_paid">Full Paid</option>
            <option value="partial_payment">Partial Payment</option>
            <option value="full_debt">Full Debt</option>
          </select>

          <select
            value={fulfillmentFilter}
            onChange={(e) => setFulfillmentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="all">All delivery/cargo</option>
            <option value="Pickup">Pickup</option>
            <option value="Delivery">Delivery</option>
            <option value="Cargo">Cargo</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="all">This Month</option>
            <option value="today">Today</option>
            <option value="all_time">All Time</option>
          </select>
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3">Items</th>
                <th className="py-3 px-3 text-right">Total</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-3 text-right">Remaining</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Driver / Cargo</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No sales found in this period.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">{s.invoiceNo}</td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.paymentStatus === "full_paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : s.paymentStatus === "partial_payment"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {s.paymentStatus === "full_paid"
                          ? "Paid"
                          : s.paymentStatus === "partial_payment"
                            ? "Partial"
                            : "Debt"}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {s.date} <span className="text-[10px] text-slate-400">{s.time}</span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{s.customerName}</div>
                      {s.customerPhone && (
                        <div className="text-[10px] text-slate-400">{s.customerPhone}</div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      {s.items.reduce((sum, it) => sum + it.quantity, 0)}
                    </td>

                    <td className="py-3 px-3 text-right font-black text-slate-900">
                      ${s.grandTotal.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                      ${s.amountPaid.toFixed(2)}
                    </td>

                    <td
                      className={`py-3 px-3 text-right font-bold ${
                        s.remainingBalance > 0 ? "text-rose-600" : "text-slate-400"
                      }`}
                    >
                      ${s.remainingBalance.toFixed(2)}
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        {s.fulfillmentType === "Pickup" && (
                          <Store className="w-3 h-3 text-slate-500" />
                        )}
                        {s.fulfillmentType === "Delivery" && (
                          <Truck className="w-3 h-3 text-blue-500" />
                        )}
                        {s.fulfillmentType === "Cargo" && (
                          <Truck className="w-3 h-3 text-purple-500" />
                        )}
                        {s.fulfillmentType}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-600 truncate max-w-[130px]">
                      {s.driverName || s.cargoCompany || "—"}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onViewReceipt(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="View & Print Invoice Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onOpenReturn(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Process Return"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        {s.remainingBalance > 0 && (
                          <button
                            onClick={() => onReceivePayment(s)}
                            className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[10px] font-bold"
                            title="Collect Remaining Balance"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>{filteredSales.length} invoices</span>
          <div className="flex items-center gap-4 font-bold text-slate-700">
            <span>Sales: ${filteredSales.reduce((s, i) => s + i.grandTotal, 0).toFixed(2)}</span>
            <span>Paid: ${filteredSales.reduce((s, i) => s + i.amountPaid, 0).toFixed(2)}</span>
            <span>
              Due: ${filteredSales.reduce((s, i) => s + i.remainingBalance, 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
