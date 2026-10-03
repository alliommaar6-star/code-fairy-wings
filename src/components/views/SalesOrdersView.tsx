import React, { useState, useMemo, useEffect } from "react";
import {
  ClipboardList,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  ArrowRight,
  ExternalLink,
  DollarSign,
  Eye,
  XCircle,
  Building2,
  Printer,
  RotateCcw,
  FileText,
  Store as StoreIcon,
  ShoppingCart,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { Order, Sale } from "../../types";
import { NewOrderModal } from "./NewOrderModal";
import { BranchSalesPanel } from "./BranchSalesPanel";
import { BranchSaleModal } from "./BranchSaleModal";
import PortalLinkModal from "../portal/PortalLinkModal";
import { CustomerOrderPortalModal } from "./CustomerOrderPortalModal";
import { AdminOrderDetailModal } from "./AdminOrderDetailModal";
import { Share2, Check, X, CreditCard } from "lucide-react";

interface SalesOrdersViewProps {
  onConvertSale?: (orderId: string) => void;
  openNewSignal?: number;
  onViewReceipt: (sale: Sale) => void;
  onOpenReturn: (sale: Sale) => void;
  onReceivePayment: (sale: Sale) => void;
}

// One unified record flow: an Order and its Sale are the same transaction.
type Row =
  | { kind: "order"; key: string; ts: number; order: Order }
  | { kind: "sale"; key: string; ts: number; sale: Sale };

const tsOf = (d: string, t: string) => {
  const v = new Date(`${d} ${t}`).getTime();
  return Number.isNaN(v) ? 0 : v;
};

export const SalesOrdersView: React.FC<SalesOrdersViewProps> = ({
  onConvertSale,
  openNewSignal,
  onViewReceipt,
  onOpenReturn,
  onReceivePayment,
}) => {
  const {
    orders,
    sales,
    convertOrderToSale,
    updateOrderStatus,
    cancelOrder,
    verifyOrderPayment,
    rejectOrderPayment,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "orders" | "sales" | "branches">("sales");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>("all");

  // Modals
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [newMode, setNewMode] = useState<"sale" | "order">("sale");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [adminDetailOrder, setAdminDetailOrder] = useState<Order | null>(null);
  const [linkModalOrder, setLinkModalOrder] = useState<Order | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [pendingSaleId, setPendingSaleId] = useState<string | null>(null);
  const [pendingReceipt, setPendingReceipt] = useState(false);

  useEffect(() => {
    if (openNewSignal) setIsNewOrderOpen(true);
  }, [openNewSignal]);

  // "Iib Toos ah": once the new order is in state, convert it into exactly one sale
  useEffect(() => {
    if (!pendingSaleId) return;
    if (orders.some((o) => o.id === pendingSaleId)) {
      const id = pendingSaleId;
      setPendingSaleId(null);
      if (pendingReceipt && onConvertSale) onConvertSale(id);
      else convertOrderToSale(id);
    }
  }, [orders, pendingSaleId]);

  // Statistics across the combined Order+Sale flow
  const stats = useMemo(() => {
    const pending = orders.filter(
      (o) => o.status === "pending" || o.status === "confirmed",
    ).length;
    const converted = orders.filter(
      (o) => o.status === "converted" || o.status === "delivered",
    ).length;
    const totalValue =
      orders.reduce((sum, o) => sum + o.total, 0) +
      sales.reduce((sum, s) => sum + s.grandTotal, 0);
    const totalPaid =
      orders.reduce((sum, o) => sum + o.paidAmount, 0) +
      sales.reduce((sum, s) => sum + s.amountPaid, 0);
    const totalRemaining =
      orders.reduce((sum, o) => sum + Math.max(0, o.total - o.paidAmount), 0) +
      sales.reduce((sum, s) => sum + s.remainingBalance, 0);
    return { records: orders.length + sales.length, pending, converted, totalValue, totalPaid, totalRemaining };
  }, [orders, sales]);

  // Unified rows: orders and sales together, newest first
  const rows = useMemo<Row[]>(() => {
    const q = searchTerm.toLowerCase();
    const list: Row[] = [];
    if (kindFilter === "branches") return [];
    if (kindFilter !== "sales") {
      orders.filter((o) => o.fulfillmentType !== "Pickup").forEach((o) =>
        list.push({ kind: "order", key: `o-${o.id}`, ts: tsOf(o.date, o.time), order: o }),
      );
    }
    {
      sales
        .filter((s) =>
          kindFilter === "sales" ? s.fulfillmentType === "Pickup" : kindFilter === "orders" ? s.fulfillmentType !== "Pickup" : true,
        )
        .forEach((s) =>
        list.push({ kind: "sale", key: `s-${s.id}`, ts: tsOf(s.date, s.time), sale: s }),
      );
    }
    return list
      .filter((r) => {
        const rec = r.kind === "order" ? r.order : r.sale;
        const matchSearch =
          !q ||
          rec.customerName.toLowerCase().includes(q) ||
          Boolean(rec.customerPhone && rec.customerPhone.includes(q)) ||
          (r.kind === "order"
            ? r.order.orderNo.toLowerCase().includes(q)
            : r.sale.invoiceNo.toLowerCase().includes(q));
        const matchFulfillment =
          fulfillmentFilter === "all" || rec.fulfillmentType === fulfillmentFilter;
        if (!matchSearch || !matchFulfillment) return false;
        if (statusFilter === "all") return true;
        return r.kind === "order" ? r.order.status === statusFilter : r.sale.paymentStatus === statusFilter;
      })
      .sort((a, b) => b.ts - a.ts);
  }, [orders, sales, searchTerm, kindFilter, statusFilter, fulfillmentFilter]);

  const statusOptions = useMemo(() => {
    if (kindFilter === "sales") {
      return [
        { id: "all", label: "Dhammaan" },
        { id: "full_paid", label: "La Bixiyay Dhan" },
        { id: "partial_payment", label: "Qayb la bixiyay" },
        { id: "full_debt", label: "Deyn Buuxa" },
      ];
    }
    return [
      { id: "all", label: "Dhammaan" },
      { id: "pending", label: "Pending" },
      { id: "confirmed", label: "Confirmed" },
      { id: "ready", label: "Ready" },
      { id: "out_for_delivery", label: "Out for Delivery" },
      { id: "delivered", label: "Delivered" },
      { id: "converted", label: "Converted to Sale" },
      { id: "cancelled", label: "Cancelled" },
    ];
  }, [kindFilter]);

  const handleStatusChange = (orderId: string, newStatus: Order["status"]) => {
    updateOrderStatus(orderId, newStatus);
  };

  const handleCancel = (orderId: string) => {
    const reason = window.prompt("Fadlan geli sababta loo tirtirayo dalabka:");
    if (reason !== null) {
      cancelOrder(orderId, reason || "Customer request");
    }
  };

  const handleConvert = (orderId: string) => {
    const sale = convertOrderToSale(orderId);
    if (sale && onConvertSale) {
      onConvertSale(orderId);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-lime-400 text-black">
              Banadir Online
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sales / Orders</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Iib Toos ah = Pickup xarunta (lacag buuxda) · Dalab = Delivery / Cargo · Branches = iibka laamaha
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="create-new-sale-btn"
            onClick={() => { setNewMode("sale"); setIsNewOrderOpen(true); }}
            className="px-4 py-2.5 bg-lime-400 hover:bg-lime-300 text-slate-900 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Iib Toos ah (Sale)
          </button>
          <button
            id="create-new-order-btn"
            onClick={() => { setNewMode("order"); setIsNewOrderOpen(true); }}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-lime-400 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
          >
            <Truck className="w-4 h-4" /> Dalab (Order)
          </button>
          <button
            id="create-branch-sale-btn"
            onClick={() => setIsBranchSaleOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
          >
            <StoreIcon className="w-4 h-4" /> Iibka Laamaha
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Dhammaan Records</span>
            <ClipboardList className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {stats.records}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Orders + Sales (hal qormo)</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-amber-600 flex items-center justify-between">
            <span>Sugaya Xaqiijin</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600 font-mono">{stats.pending}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Pending / Confirmed</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-emerald-600 flex items-center justify-between">
            <span>La Fuliyay</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 font-mono">
            {stats.converted}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Delivered / Converted</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>Qiimaha Guud</span>
            <ShoppingCart className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            ${stats.totalValue.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Orders + Sales value</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
          <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>La Bixiyay</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700 font-mono">
            ${stats.totalPaid.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Hadhaa: ${stats.totalRemaining.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Raadi Order #, Invoice #, Macmiilka ama Taleefanka..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 bg-slate-50"
            />
          </div>

          {/* Kind filter: one flow, optional lens */}
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {(
              [
                ["sales", "Iib Toos ah"],
                ["orders", "Dalabka (Delivery/Cargo)"],
                ["all", "Dhammaan"],
                ["branches", "Branches"],
              ] as const
            ).map(([f, label]) => (
              <button
                key={f}
                onClick={() => {
                  setKindFilter(f);
                  setStatusFilter("all");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  kindFilter === f
                    ? "bg-slate-900 text-lime-400 shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Fulfillment Filter */}
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className="text-slate-500 hidden sm:inline">Gaarsiinta:</span>
            {["all", "Pickup", "Delivery", "Cargo"].map((f) => (
              <button
                key={f}
                onClick={() => setFulfillmentFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  fulfillmentFilter === f
                    ? "bg-slate-900 text-lime-400 shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f === "all" ? "Dhammaan" : f}
              </button>
            ))}
          </div>
        </div>

        {/* Status Tab Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-semibold mr-1">Xaaladda:</span>
          {statusOptions.map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition ${
                statusFilter === st.id
                  ? "bg-lime-400 text-slate-900 font-bold"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {kindFilter === "branches" && <BranchSalesPanel />}

      {/* Unified Orders + Sales Table */}
      <div hidden={kindFilter === "branches"} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">No.</th>
                <th className="py-3 px-4">Nooca</th>
                <th className="py-3 px-4">Taariikhda</th>
                <th className="py-3 px-4">Macmiilka</th>
                <th className="py-3 px-4">Fulfillment</th>
                <th className="py-3 px-4">Badeecadaha</th>
                <th className="py-3 px-4 text-right">Wadarta</th>
                <th className="py-3 px-4 text-right">Bixiyay</th>
                <th className="py-3 px-4 text-right">Hadhaa</th>
                <th className="py-3 px-4 text-center">Xaaladda</th>
                <th className="py-3 px-4 text-center">Ficilada</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 text-xs">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Wax qormo ah laguma helin xulashadan.
                  </td>
                </tr>
              ) : (
                rows.map((r) =>
                  r.kind === "order" ? (
                    <OrderRow
                      key={r.key}
                      order={r.order}
                      onStatusChange={handleStatusChange}
                      onCancel={handleCancel}
                      onConvert={handleConvert}
                      onOpenDetail={(o) => setAdminDetailOrder(o)}
                      onOpenLink={(o) => {
                        setLinkModalOrder(o);
                        setIsLinkModalOpen(true);
                      }}
                      onVerifyPayment={() => verifyOrderPayment(r.order.id)}
                      onRejectPayment={(reason) => rejectOrderPayment(r.order.id, reason)}
                    />
                  ) : (
                    <SaleRow
                      key={r.key}
                      sale={r.sale}
                      onViewReceipt={onViewReceipt}
                      onOpenReturn={onOpenReturn}
                      onReceivePayment={onReceivePayment}
                    />
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Branch Sale Modal (branch stock + fixed per-item commission) */}
      <BranchSaleModal
        isOpen={isBranchSaleOpen}
        onClose={() => setIsBranchSaleOpen(false)}
      />

      {/* New Order Modal */}
      <NewOrderModal
        isOpen={isNewOrderOpen}
        mode={newMode}
        onClose={() => setIsNewOrderOpen(false)}
        onOrderCreated={(createdOrder, asSale) => {
          // Direct sale (Pickup, full payment) → becomes a sale with receipt.
          // Order (Delivery/Cargo) stays an order and gets its customer portal link.
          if (asSale) {
            setPendingReceipt(true);
            setPendingSaleId(createdOrder.id);
            return;
          }
          setLinkModalOrder(createdOrder);
          setIsLinkModalOpen(true);
        }}
      />

      {/* Share / Customer Portal Link Modal (live server link) */}
      {isLinkModalOpen && linkModalOrder && (
        <PortalLinkModal
          order={linkModalOrder}
          onClose={() => {
            setIsLinkModalOpen(false);
            setLinkModalOrder(null);
          }}
        />
      )}

      {/* Admin Order Details & Customer Portal Management Modal */}
      <AdminOrderDetailModal
        isOpen={!!adminDetailOrder}
        onClose={() => setAdminDetailOrder(null)}
        order={adminDetailOrder}
        onOpenCustomerPortal={(ord) => {
          setSelectedOrder(ord);
        }}
        onConvertSale={handleConvert}
      />

      {/* Customer Order Portal & Tracking Modal */}
      <CustomerOrderPortalModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onConvertSale={handleConvert}
      />
    </div>
  );
};

// ---------- Order row (unchanged behavior) ----------
const OrderRow: React.FC<{
  order: Order;
  onStatusChange: (id: string, s: Order["status"]) => void;
  onCancel: (id: string) => void;
  onConvert: (id: string) => void;
  onOpenDetail: (o: Order) => void;
  onOpenLink: (o: Order) => void;
  onVerifyPayment: () => void;
  onRejectPayment: (reason: string) => void;
}> = ({ order, onStatusChange, onCancel, onConvert, onOpenDetail, onOpenLink, onVerifyPayment, onRejectPayment }) => {
  const remaining = Math.max(0, order.total - order.paidAmount);
  return (
    <tr className="hover:bg-slate-50/80 transition group">
      {/* Order No */}
      <td className="py-3 px-4">
        <button
          onClick={() => onOpenDetail(order)}
          className="font-mono font-bold text-slate-900 hover:text-blue-600 flex items-center gap-1.5"
          title="Eeg Faahfaahinta Dalabka & Lacag Bixinta"
        >
          {order.orderNo}
          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
        </button>
      </td>

      {/* Record type */}
      <td className="py-3 px-4">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
          <ClipboardList className="w-3 h-3" />
          Order
        </span>
      </td>

      {/* Date & Time */}
      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
        <div className="font-medium text-slate-700">{order.date}</div>
        <div className="text-[10px] text-slate-400">{order.time}</div>
      </td>

      {/* Customer */}
      <td className="py-3 px-4">
        <div className="font-bold text-slate-800">{order.customerName}</div>
        <div className="text-slate-400 text-[11px] font-mono">{order.customerPhone}</div>
      </td>

      {/* Fulfillment */}
      <td className="py-3 px-4">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            order.fulfillmentType === "Delivery"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : order.fulfillmentType === "Cargo"
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}
        >
          {order.fulfillmentType === "Delivery" && <Truck className="w-3 h-3" />}
          {order.fulfillmentType === "Cargo" && <Building2 className="w-3 h-3" />}
          {order.fulfillmentType === "Pickup" && <Package className="w-3 h-3" />}
          {order.fulfillmentType}
        </span>
        {order.driverName && (
          <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[120px]">
            {order.driverName}
          </div>
        )}
      </td>

      {/* Items */}
      <td className="py-3 px-4 text-slate-600">
        <div className="flex min-w-[220px] items-center gap-3">
          <div className="flex -space-x-3">
            {order.items.slice(0, 3).map((item, index) => (
              <div
                key={`${item.productId}-${index}`}
                className="h-16 w-16 overflow-hidden rounded-lg border-2 border-white bg-slate-100 shadow-sm"
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl">📦</div>
                )}
              </div>
            ))}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-800">{order.items.length} alaab</div>
            <div className="max-w-[150px] truncate text-[10px] text-slate-400">
              {order.items.map((i) => `${i.productName} (${i.quantity})`).join(", ")}
            </div>
          </div>
        </div>
      </td>

      {/* Total */}
      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
        ${order.total.toFixed(2)}
      </td>

      {/* Paid Amount */}
      <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">
        ${order.paidAmount.toFixed(2)}
      </td>

      {/* Remaining */}
      <td className="py-3 px-4 text-right font-mono font-bold">
        <span className={remaining > 0 ? "text-rose-600" : "text-slate-400"}>
          ${remaining.toFixed(2)}
        </span>
      </td>

      {/* Status */}
      <td className="py-3 px-4 text-center">
        <select
          value={order.status}
          disabled={order.status === "converted"}
          onChange={(e) => onStatusChange(order.id, e.target.value as Order["status"])}
          className={`text-xs font-semibold px-2 py-1 rounded-lg border appearance-none text-center cursor-pointer transition ${
            order.status === "converted"
              ? "bg-slate-900 text-lime-400 border-slate-900 cursor-not-allowed"
              : order.status === "delivered"
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : order.status === "out_for_delivery"
                  ? "bg-sky-100 text-sky-800 border-sky-300"
                  : order.status === "ready"
                    ? "bg-purple-100 text-purple-800 border-purple-300"
                    : order.status === "confirmed"
                      ? "bg-blue-100 text-blue-800 border-blue-300"
                      : order.status === "cancelled"
                        ? "bg-rose-100 text-rose-800 border-rose-300"
                        : "bg-amber-100 text-amber-800 border-amber-300"
          }`}
        >
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="ready">Ready</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="converted" disabled>
            Converted (Sale)
          </option>
          <option value="cancelled">Cancelled</option>
        </select>
      </td>

      {/* Actions */}
      <td className="py-3 px-4 text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-1.5">
          {/* LACAG BIXIN Primary Button */}
          <button
            onClick={() => onOpenLink(order)}
            title="Xiriirka Lacag Bixinta (LACAG BIXIN)"
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-xs transition active:scale-95"
          >
            <CreditCard className="w-3 h-3" />
            <span>LACAG BIXIN</span>
          </button>

          {/* Share Modal */}
          <button
            onClick={() => onOpenLink(order)}
            title="La Wadaag Macmiilka (WhatsApp / Copy)"
            className="p-1.5 rounded-lg bg-lime-400/20 text-slate-950 hover:bg-lime-400 font-bold transition"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* View Admin Details */}
          <button
            onClick={() => onOpenDetail(order)}
            title="Faahfaahinta Dalabka & Maamulka"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Quick Admin Verification for Customer-Confirmed Payments */}
          {order.paymentStatus === "customer_confirmed" && (
            <div className="flex items-center gap-1">
              <button
                onClick={onVerifyPayment}
                title="Xaqiiji Lacagta Macmiilka (Verify Payment)"
                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-0.5"
              >
                <Check className="w-3 h-3" />
                <span>Verify</span>
              </button>
              <button
                onClick={() => {
                  const reason = window.prompt("Geli sababta diidmada lacagta:");
                  if (reason) onRejectPayment(reason);
                }}
                title="Diid Lacag Bixinta (Reject Payment)"
                className="p-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px]"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Convert to Sale Button (legacy orders only) */}
          {!order.convertedSaleId && order.status !== "converted" && order.status !== "cancelled" && (
            <button
              onClick={() => onConvert(order.id)}
              title="U bedel Sale Invoice"
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-lime-400 font-bold text-[11px] flex items-center gap-1 shadow-xs transition"
            >
              <span>Convert</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {/* Cancel Order */}
          {order.status !== "converted" && order.status !== "cancelled" && (
            <button
              onClick={() => onCancel(order.id)}
              title="Jooji Dalabka"
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

// ---------- Sale row (invoice of the same flow) ----------
const SaleRow: React.FC<{
  sale: Sale;
  onViewReceipt: (s: Sale) => void;
  onOpenReturn: (s: Sale) => void;
  onReceivePayment: (s: Sale) => void;
}> = ({ sale, onViewReceipt, onOpenReturn, onReceivePayment }) => (
  <tr className="hover:bg-slate-50/80 transition group">
    {/* Invoice No */}
    <td className="py-3 px-4 font-mono font-bold text-slate-900">{sale.invoiceNo}</td>

    {/* Record type */}
    <td className="py-3 px-4">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-lime-50 text-lime-800 border border-lime-200">
        <CheckCircle2 className="w-3 h-3" />
        Sale
      </span>
    </td>

    {/* Date & Time */}
    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
      <div className="font-medium text-slate-700">{sale.date}</div>
      <div className="text-[10px] text-slate-400">{sale.time}</div>
    </td>

    {/* Customer */}
    <td className="py-3 px-4">
      <div className="font-bold text-slate-800">{sale.customerName}</div>
      {sale.customerPhone && (
        <div className="text-slate-400 text-[11px] font-mono">{sale.customerPhone}</div>
      )}
    </td>

    {/* Fulfillment */}
    <td className="py-3 px-4">
      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
        {sale.fulfillmentType === "Pickup" && <StoreIcon className="w-3 h-3 text-slate-500" />}
        {sale.fulfillmentType === "Delivery" && <Truck className="w-3 h-3 text-blue-500" />}
        {sale.fulfillmentType === "Cargo" && <Truck className="w-3 h-3 text-purple-500" />}
        {sale.fulfillmentType}
      </span>
      <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[120px]">
        {sale.driverName || sale.cargoCompany || ""}
      </div>
    </td>

    {/* Items */}
    <td className="py-3 px-4 text-slate-600">
      <div className="font-bold text-slate-800">
        {sale.items.reduce((sum, it) => sum + it.quantity, 0)} alaab
      </div>
      <div className="max-w-[150px] truncate text-[10px] text-slate-400">
        {sale.items.map((i) => `${i.productName} (${i.quantity})`).join(", ")}
      </div>
    </td>

    {/* Total */}
    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
      ${sale.grandTotal.toFixed(2)}
    </td>

    {/* Paid */}
    <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">
      ${sale.amountPaid.toFixed(2)}
    </td>

    {/* Remaining */}
    <td className="py-3 px-4 text-right font-mono font-bold">
      <span className={sale.remainingBalance > 0 ? "text-rose-600" : "text-slate-400"}>
        ${sale.remainingBalance.toFixed(2)}
      </span>
    </td>

    {/* Payment status */}
    <td className="py-3 px-4 text-center">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
          sale.paymentStatus === "full_paid"
            ? "bg-emerald-100 text-emerald-800"
            : sale.paymentStatus === "partial_payment"
              ? "bg-amber-100 text-amber-800"
              : "bg-rose-100 text-rose-800"
        }`}
      >
        {sale.paymentStatus === "full_paid"
          ? "Paid"
          : sale.paymentStatus === "partial_payment"
            ? "Partial"
            : "Debt"}
      </span>
    </td>

    {/* Actions */}
    <td className="py-3 px-4 text-center whitespace-nowrap">
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={() => onViewReceipt(sale)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="View & Print Invoice Receipt"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onOpenReturn(sale)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          title="Process Return"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {sale.remainingBalance > 0 && (
          <button
            onClick={() => onReceivePayment(sale)}
            className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[10px] font-bold"
            title="Collect Remaining Balance"
          >
            Pay
          </button>
        )}
      </div>
    </td>
  </tr>
);
