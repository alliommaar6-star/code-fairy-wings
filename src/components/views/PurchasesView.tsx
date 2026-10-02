import React, { useState } from "react";
import {
  Building2,
  DollarSign,
  Plus,
  Search,
  Package,
  CheckCircle2,
  Clock,
  Calendar,
  CreditCard,
  FileText,
  Filter,
  Eye,
  Trash2,
  Edit2,
  Archive,
  ArrowUpRight,
  TrendingDown,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { Purchase, Supplier } from "../../types";
import { StatCard } from "../common/StatCard";
import { NewPurchaseModal } from "../purchases/NewPurchaseModal";
import { PurchaseDetailModal } from "../purchases/PurchaseDetailModal";
import { SupplierModal } from "../purchases/SupplierModal";
import { SupplierPaymentModal } from "../purchases/SupplierPaymentModal";
import { SupplierStatementModal } from "../purchases/SupplierStatementModal";

interface PurchasesViewProps {
  initialTab?: "purchases" | "suppliers";
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({ initialTab = "purchases" }) => {
  const { purchases, suppliers, deleteSupplier } = useStore();

  const [activeTab, setActiveTab] = useState<"purchases" | "suppliers">(initialTab);

  // Filters for Purchases
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Received" | "Cancelled">("ALL");
  const [paymentFilter, setPaymentFilter] = useState<
    "ALL" | "full_paid" | "partial_payment" | "credit"
  >("ALL");

  // Filters for Suppliers
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierStatusFilter, setSupplierStatusFilter] = useState<"active" | "archived" | "all">(
    "active",
  );

  // Modals state
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
  const [activeDetailPurchase, setActiveDetailPurchase] = useState<Purchase | null>(null);

  const [isNewSupplierOpen, setIsNewSupplierOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [statementSupplier, setStatementSupplier] = useState<Supplier | null>(null);
  const [paymentSupplier, setPaymentSupplier] = useState<Supplier | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Purchases Computations
  const filteredPurchases = purchases.filter((p) => {
    const q = purchaseSearch.toLowerCase();
    const matchSearch =
      p.purchaseNo.toLowerCase().includes(q) ||
      p.supplierName.toLowerCase().includes(q) ||
      (p.items && p.items.some((it) => it.productName.toLowerCase().includes(q)));

    const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchPayment = paymentFilter === "ALL" || p.paymentStatus === paymentFilter;

    return matchSearch && matchStatus && matchPayment;
  });

  const totalPurchasesSpend = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalPaidOutflow = purchases.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalOutstandingDue = purchases.reduce((sum, p) => sum + (p.supplierBalance || 0), 0);

  // Suppliers Computations
  const filteredSuppliers = suppliers.filter((s) => {
    const q = supplierSearch.toLowerCase();
    const matchSearch =
      s.name.toLowerCase().includes(q) ||
      (s.company && s.company.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q));

    const matchStatus =
      supplierStatusFilter === "all" ||
      (supplierStatusFilter === "active" && s.status !== "archived") ||
      (supplierStatusFilter === "archived" && s.status === "archived");

    return matchSearch && matchStatus;
  });

  const totalAccountsPayable = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);
  const totalSupplierVolume = suppliers.reduce((sum, s) => sum + (s.totalPurchases || 0), 0);

  const handleDeleteSupplier = (sup: Supplier) => {
    const res = deleteSupplier(sup.id);
    setStatusMessage(res.message);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Toast message if any */}
      {statusMessage && (
        <div className="p-3.5 bg-slate-900 text-white text-xs font-semibold rounded-2xl flex items-center justify-between shadow-lg">
          <span>{statusMessage}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Segmented Tab Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Purchases & Supplier Architecture
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Multi-item purchase orders, weighted average cost layers, and accounts payable ledgers.
          </p>
        </div>

        {/* Segmented Control */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab("purchases")}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "purchases"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Purchase Orders</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700">
                {purchases.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("suppliers")}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "suppliers"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Suppliers & A/P</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700">
                {suppliers.filter((s) => s.status !== "archived").length}
              </span>
            </button>
          </div>

          {activeTab === "purchases" ? (
            <button
              onClick={() => setIsNewPurchaseOpen(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-400 stroke-[3]" />
              New Purchase
            </button>
          ) : (
            <button
              onClick={() => {
                setSupplierToEdit(null);
                setIsNewSupplierOpen(true);
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-400 stroke-[3]" />
              Register Supplier
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PURCHASES TAB */}
      {/* ========================================================================= */}
      {activeTab === "purchases" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Total Purchase Spend"
              value={`$${totalPurchasesSpend.toFixed(2)}`}
              subtitle={`${purchases.length} total orders`}
              icon={DollarSign}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />

            <StatCard
              title="Paid Outflow Settled"
              value={`$${totalPaidOutflow.toFixed(2)}`}
              subtitle="From commercial accounts"
              icon={CheckCircle2}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />

            <StatCard
              title="Outstanding Payable (A/P)"
              value={`$${totalOutstandingDue.toFixed(2)}`}
              subtitle="Vendor credit balance"
              icon={Clock}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />

            <StatCard
              title="Active Vendors"
              value={suppliers.filter((s) => s.status !== "archived").length}
              subtitle="Wholesale partners"
              icon={Building2}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
            />
          </div>

          {/* Search and Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={purchaseSearch}
                onChange={(e) => setPurchaseSearch(e.target.value)}
                placeholder="Search by PO number, supplier, or product..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="ALL">All Statuses</option>
                <option value="Received">Received</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select
                value={paymentFilter}
                onChange={(e: any) => setPaymentFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="ALL">All Payments</option>
                <option value="full_paid">Full Paid</option>
                <option value="partial_payment">Partial Payment</option>
                <option value="credit">Supplier Credit</option>
              </select>
            </div>
          </div>

          {/* Desktop Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">PO Number</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-3 text-center">Items</th>
                    <th className="py-3 px-3 text-right">Total Amount</th>
                    <th className="py-3 px-3 text-right">Paid Amount</th>
                    <th className="py-3 px-3 text-right">Balance Due</th>
                    <th className="py-3 px-3 text-center">Payment</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        No purchase orders found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {p.purchaseNo}
                        </td>

                        <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                          <div>{p.date}</div>
                          {p.time && <div className="text-[10px] text-slate-400">{p.time}</div>}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{p.supplierName}</div>
                          {p.supplierPhone && (
                            <div className="text-[10px] text-slate-400">{p.supplierPhone}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {p.items.reduce((s, it) => s + it.quantity, 0)} units ({p.items.length}{" "}
                            sku)
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right font-black text-slate-900 text-xs">
                          ${p.totalAmount.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-3 text-right font-semibold text-emerald-600">
                          ${p.paidAmount.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-3 text-right font-bold">
                          {(p.supplierBalance || 0) > 0 ? (
                            <span className="text-amber-600">${p.supplierBalance?.toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-400">$0.00</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.paymentStatus === "full_paid"
                                ? "bg-blue-100 text-blue-800"
                                : p.paymentStatus === "partial_payment"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {p.paymentStatus === "full_paid"
                              ? "Full"
                              : p.paymentStatus === "partial_payment"
                                ? "Partial"
                                : "Credit"}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === "Received"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.status === "Cancelled"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setActiveDetailPurchase(p)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Layout (390px responsive) */}
          <div className="space-y-3 md:hidden">
            {filteredPurchases.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                No purchase orders found.
              </div>
            ) : (
              filteredPurchases.map((p) => (
                <div
                  key={p.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-black text-sm text-slate-900 block">
                        {p.purchaseNo}
                      </span>
                      <span className="text-[11px] text-slate-500">{p.date}</span>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === "Received"
                          ? "bg-emerald-100 text-emerald-800"
                          : p.status === "Cancelled"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-800 block">{p.supplierName}</span>
                    <span className="text-[11px] text-slate-400">
                      {p.items.reduce((s, it) => s + it.quantity, 0)} units across {p.items.length}{" "}
                      products
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">
                        Total
                      </span>
                      <span className="font-black text-slate-900">${p.totalAmount.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">
                        Paid
                      </span>
                      <span className="font-bold text-emerald-600">${p.paidAmount.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">
                        Due
                      </span>
                      <span className="font-bold text-amber-600">
                        ${(p.supplierBalance || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveDetailPurchase(p)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Details & Invoice Receipt
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUPPLIERS TAB */}
      {/* ========================================================================= */}
      {activeTab === "suppliers" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Total Accounts Payable"
              value={`$${totalAccountsPayable.toFixed(2)}`}
              subtitle="Owed to suppliers"
              icon={Clock}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />

            <StatCard
              title="Registered Suppliers"
              value={suppliers.filter((s) => s.status !== "archived").length}
              subtitle={`${suppliers.length} on ledger`}
              icon={Building2}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />

            <StatCard
              title="Total Purchases Volume"
              value={`$${totalSupplierVolume.toFixed(2)}`}
              subtitle="Lifetime procurement"
              icon={DollarSign}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />

            <StatCard
              title="Suppliers with Balance"
              value={suppliers.filter((s) => (s.balance || 0) > 0).length}
              subtitle="Unsettled credit terms"
              icon={CreditCard}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
            />
          </div>

          {/* Search and Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                placeholder="Search supplier by name, company, or phone..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={supplierStatusFilter}
                onChange={(e: any) => setSupplierStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="active">Active Suppliers</option>
                <option value="archived">Archived Suppliers</option>
                <option value="all">All Records</option>
              </select>
            </div>
          </div>

          {/* Desktop Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-3">Contact Person</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3 text-right">Total Purchases</th>
                    <th className="py-3 px-3 text-right">Total Paid</th>
                    <th className="py-3 px-3 text-right">Outstanding (A/P)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No suppliers found matching your query.
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((sup) => (
                      <tr key={sup.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div>{sup.name}</div>
                          {sup.company && (
                            <span className="text-[10px] text-slate-400">{sup.company}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-slate-600">{sup.contactPerson || "—"}</td>

                        <td className="py-3.5 px-3 text-slate-600 font-mono text-[11px]">
                          {sup.phone || "—"}
                        </td>

                        <td className="py-3.5 px-3 text-right font-semibold text-slate-700">
                          ${(sup.totalPurchases || 0).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-3 text-right font-semibold text-emerald-600">
                          ${(sup.totalPaid || 0).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-3 text-right font-black">
                          {sup.balance > 0 ? (
                            <span className="text-amber-600">${sup.balance.toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-400">$0.00</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sup.status === "archived"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {sup.status === "archived" ? "Archived" : "Active"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {sup.balance > 0 && (
                              <button
                                onClick={() => setPaymentSupplier(sup)}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg text-xs transition-colors"
                                title="Settle balance"
                              >
                                Pay
                              </button>
                            )}
                            <button
                              onClick={() => setStatementSupplier(sup)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors"
                              title="View Statement / Ledger"
                            >
                              Statement
                            </button>
                            <button
                              onClick={() => {
                                setSupplierToEdit(sup);
                                setIsNewSupplierOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                              title="Edit Supplier"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(sup)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Archive or Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Layout (390px responsive) */}
          <div className="space-y-3 md:hidden">
            {filteredSuppliers.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                No suppliers registered.
              </div>
            ) : (
              filteredSuppliers.map((sup) => (
                <div
                  key={sup.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{sup.name}</h4>
                      {sup.company && (
                        <span className="text-[11px] text-slate-400">{sup.company}</span>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sup.status === "archived"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {sup.status === "archived" ? "Archived" : "Active"}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-0.5">
                    {sup.phone && <div>📞 {sup.phone}</div>}
                    {sup.address && <div>📍 {sup.address}</div>}
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">
                        Purchases
                      </span>
                      <span className="font-bold text-slate-900">
                        ${(sup.totalPurchases || 0).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">
                        Due (A/P)
                      </span>
                      <span className="font-black text-amber-600">${sup.balance.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {sup.balance > 0 && (
                      <button
                        onClick={() => setPaymentSupplier(sup)}
                        className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors"
                      >
                        Pay Balance
                      </button>
                    )}
                    <button
                      onClick={() => setStatementSupplier(sup)}
                      className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
                    >
                      Statement
                    </button>
                    <button
                      onClick={() => {
                        setSupplierToEdit(sup);
                        setIsNewSupplierOpen(true);
                      }}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSupplier(sup)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. New Purchase Modal */}
      <NewPurchaseModal
        isOpen={isNewPurchaseOpen}
        onClose={() => setIsNewPurchaseOpen(false)}
        onSuccess={(id) => {
          const po = purchases.find((p) => p.id === id);
          if (po) setActiveDetailPurchase(po);
        }}
      />

      {/* 2. Purchase Detail Modal */}
      <PurchaseDetailModal
        purchase={activeDetailPurchase}
        isOpen={!!activeDetailPurchase}
        onClose={() => setActiveDetailPurchase(null)}
      />

      {/* 3. Supplier Create / Edit Modal */}
      <SupplierModal
        isOpen={isNewSupplierOpen}
        onClose={() => {
          setIsNewSupplierOpen(false);
          setSupplierToEdit(null);
        }}
        supplierToEdit={supplierToEdit}
      />

      {/* 4. Supplier Payment Outflow Modal */}
      <SupplierPaymentModal
        isOpen={!!paymentSupplier}
        onClose={() => setPaymentSupplier(null)}
        supplier={paymentSupplier}
      />

      {/* 5. Supplier Statement of Account Ledger Modal */}
      <SupplierStatementModal
        isOpen={!!statementSupplier}
        onClose={() => setStatementSupplier(null)}
        supplier={statementSupplier}
      />
    </div>
  );
};
