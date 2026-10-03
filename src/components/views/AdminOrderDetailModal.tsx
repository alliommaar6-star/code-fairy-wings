import React, { useState } from "react";
import {
  X,
  CreditCard,
  Copy,
  Share2,
  ExternalLink,
  RefreshCw,
  Check,
  Truck,
  MapPin,
  Phone,
  User,
  Package,
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Building2,
  ArrowRight,
  Printer,
  Sparkles,
  ChevronRight,
  Lock,
} from "lucide-react";
import { Order } from "../../types";
import { useStore } from "../../context/StoreContext";
import { buildWhatsAppCustomerMessage } from "../../utils/portalUrl";
import { LivePortalPanel } from "../portal/LivePortalPanel";

interface AdminOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onOpenCustomerPortal: (order: Order) => void;
  onConvertSale?: (orderId: string) => void;
}

export const AdminOrderDetailModal: React.FC<AdminOrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  onOpenCustomerPortal,
  onConvertSale,
}) => {
  const {
    generateCustomerPortalUrl,
    regenerateOrderPortalToken,
    verifyOrderPayment,
    rejectOrderPayment,
    drivers,
    assignDriverToOrder,
    updateOrderStatus,
    updateOrderFulfillmentStage,
    cancelOrder,
  } = useStore();

  const [copied, setCopied] = useState(false);
  const [tokenRegenerated, setTokenRegenerated] = useState(false);
  const [verificationRefInput, setVerificationRefInput] = useState("");
  const [rejectReasonInput, setRejectReasonInput] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  if (!isOpen || !order) return null;

  const portalUrl = generateCustomerPortalUrl(order);
  const remaining = Math.max(0, order.total - order.paidAmount);
  const isFullyPaid = remaining <= 0;
  const whatsappUrl = buildWhatsAppCustomerMessage(order, portalUrl);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleRegenerateToken = () => {
    const confirm = window.confirm(
      "Ma hubtaa inaad rabto inaad cusboonaysiiso token-ka lacag bixinta macmiilka? Token-kii hore wuu shaqayn doonaa illaa cusboonaysiinta.",
    );
    if (confirm) {
      regenerateOrderPortalToken(order.id);
      setTokenRegenerated(true);
      setTimeout(() => setTokenRegenerated(false), 3000);
    }
  };

  const handleVerify = () => {
    verifyOrderPayment(order.id, verificationRefInput.trim() || undefined);
    setVerificationRefInput("");
  };

  const handleReject = () => {
    if (!rejectReasonInput.trim()) {
      alert(
        "Fadlan qor sababta loo diiday lacag bixinta (tusaale: Lacag ma soo dhicin / SMS khaldan)",
      );
      return;
    }
    rejectOrderPayment(order.id, rejectReasonInput.trim());
    setIsRejectOpen(false);
    setRejectReasonInput("");
  };

  const handleAssignDriver = (driverId: string) => {
    if (driverId) {
      assignDriverToOrder(order.id, driverId);
    }
  };

  return (
    <div
      id="admin-order-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start justify-between relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-lime-400/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <div className="space-y-1 relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold bg-lime-400 text-slate-950 px-2.5 py-0.5 rounded-full">
                {order.orderNo}
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  order.status === "converted"
                    ? "bg-purple-950 text-purple-300 border border-purple-800"
                    : order.status === "delivered"
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      : order.status === "out_for_delivery"
                        ? "bg-sky-950 text-sky-300 border border-sky-800"
                        : order.status === "cancelled"
                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                          : "bg-amber-950 text-amber-300 border border-amber-800"
                }`}
              >
                {order.status === "converted"
                  ? "Iibka Loo Beddelay (Sale Invoice)"
                  : order.status === "delivered"
                    ? "Waa La Gaarsiiyay"
                    : order.status === "out_for_delivery"
                      ? "Gaarsiin Ku Jira"
                      : order.status === "ready"
                        ? "Waa Diyaar"
                        : order.status === "confirmed"
                          ? "Xaqiijisan"
                          : order.status === "cancelled"
                            ? "La Joojiyay"
                            : "Dalab Cusub"}
              </span>

              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {order.date} {order.time}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white pt-1">
              Faahfaahinta Dalabka & Lacag Bixinta Macmiilka
            </h2>
          </div>

          <button
            id="btn-close-admin-order-detail"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition relative z-10"
            aria-label="Xir"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* SECTION: CUSTOMER PORTAL (PROMINENT REQUIREMENT #28 & #1) */}
          <div
            id="section-customer-portal-admin"
            className="bg-slate-900 rounded-3xl p-5 sm:p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-rose-600/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-lime-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-lime-400/20">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-lime-400 flex items-center gap-2">
                    CUSTOMER PORTAL
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <ShieldCheck className="w-3 h-3" />
                      Status: Active
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Bogga tooska ah ee macmiilku ka bixinayo lacagta (EVC/E-Dahab/Jeeb) uguna la
                    soconayo gaarsiinta
                  </p>
                </div>
              </div>

              {/* Status and Balance Quick Indicators */}
              <div className="flex items-center gap-3 text-right">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Xaaladda Lacagta
                  </span>
                  <span
                    className={`text-xs font-black uppercase ${
                      order.paymentStatus === "verified" || order.paidAmount >= order.total
                        ? "text-emerald-400"
                        : order.paymentStatus === "customer_confirmed"
                          ? "text-amber-400"
                          : order.paymentStatus === "rejected"
                            ? "text-rose-400"
                            : "text-slate-300"
                    }`}
                  >
                    {order.paymentStatus === "verified" || order.paidAmount >= order.total
                      ? "Waa La Bixiyay (Paid)"
                      : order.paymentStatus === "customer_confirmed"
                        ? "Macmiilku Wuu Xaqiijiyay"
                        : order.paymentStatus === "rejected"
                          ? "Lacagta Waa La Diiday"
                          : order.paymentStatus === "partially_paid"
                            ? "Qayb Waa La Bixiyay"
                            : "Lama Bixin (Unpaid)"}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Hadhaaga
                  </span>
                  <span className="text-base font-black text-rose-400 font-mono">
                    ${remaining.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <LivePortalPanel order={order} />

            {/* MAIN LARGE CUSTOMER-FACING BUTTON: 💳 LACAG BIXIN */}
            <div className="pt-4 space-y-4 relative z-10">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  id="btn-admin-lacag-bixin-primary"
                  type="button"
                  onClick={() => onOpenCustomerPortal(order)}
                  className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-500 active:scale-[0.99] text-white font-black text-base sm:text-lg uppercase tracking-wider transition shadow-xl shadow-rose-600/30 flex items-center justify-center gap-3 group"
                >
                  <CreditCard className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  <span>💳 LACAG BIXIN</span>
                  <span className="text-xs font-semibold normal-case bg-black/20 px-2.5 py-1 rounded-lg text-rose-100 hidden sm:inline-block">
                    (Fur Bogga Macmiilka)
                  </span>
                </button>

                <a
                  id="btn-admin-share-whatsapp"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-4 px-5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 shrink-0"
                >
                  <Share2 className="w-5 h-5" />
                  <span>La Wadaag WhatsApp</span>
                </a>
              </div>

              {/* Action Toolbar: Copy Link | Open in New Tab | Regenerate Token */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="btn-admin-copy-portal-link"
                    type="button"
                    onClick={handleCopyLink}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shadow-xs ${
                      copied
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    }`}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-lime-400" />
                    )}
                    <span>{copied ? "Waa La Nuuxiyay!" : "Nuuxi Link-ga (Copy Link)"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open(portalUrl, "_blank")}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    <span>Fur Daaqad Cusub (New Tab)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRegenerateToken}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition ${
                      tokenRegenerated
                        ? "bg-emerald-700 text-white"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    }`}
                    title="Cusboonaysii token-ka gaarka ah ee amniga"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${tokenRegenerated ? "animate-spin" : "text-amber-400"}`}
                    />
                    <span>
                      {tokenRegenerated ? "Token Cusub Waa La Sameeyay!" : "Cusboonaysii Token-ka"}
                    </span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-lime-400" />
                  <span>
                    Token:{" "}
                    {order.portalToken ? order.portalToken.slice(0, 10) + "..." : "cpt_active"}
                  </span>
                </div>
              </div>

              {/* ADMIN VERIFICATION CARD (When Customer has confirmed payment) */}
              {order.paymentStatus === "customer_confirmed" && (
                <div className="mt-4 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 space-y-3 animate-in fade-in">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-amber-300 uppercase tracking-wide">
                          Xaqiijin Lacag Bixin (Pending Admin Verification)
                        </h4>
                        <p className="text-[11px] text-amber-200/90 mt-0.5">
                          Macmiilku wuxuu xaqiijiyay inuu bixiyay{" "}
                          <strong className="text-white font-mono">
                            $
                            {order.customerConfirmedPayment?.amount.toFixed(2) ||
                              order.total.toFixed(2)}
                          </strong>{" "}
                          via{" "}
                          <strong className="text-white">
                            {order.customerConfirmedPayment?.method || "Mobile Money"}
                          </strong>
                          .
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                      {order.customerConfirmedPayment?.submittedAt
                        ? new Date(order.customerConfirmedPayment.submittedAt).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )
                        : "Hadda"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl">
                    <div>
                      <span className="text-slate-400 text-[10px] block">
                        Taleefanka Laga Soo Diray:
                      </span>
                      <span className="font-bold text-white font-mono">
                        {order.customerConfirmedPayment?.senderPhone ||
                          order.customerPhone ||
                          "Lama sheegin"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">
                        Tixraaca SMS (Trx Ref):
                      </span>
                      <span className="font-bold text-lime-400 font-mono">
                        {order.customerConfirmedPayment?.transactionRef || "Lama gelin"}
                      </span>
                    </div>
                  </div>

                  {/* Verification Input & Buttons */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Geli tixraaca xaqiijinta (Trx Ref / SMS ID)..."
                        value={verificationRefInput}
                        onChange={(e) => setVerificationRefInput(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-400"
                      />
                      <button
                        id="btn-admin-verify-payment"
                        type="button"
                        onClick={handleVerify}
                        className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-emerald-600/20"
                      >
                        <Check className="w-4 h-4" />
                        <span>Xaqiiji Lacagta (Verify)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsRejectOpen(!isRejectOpen)}
                        className="py-2 px-3 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs transition border border-rose-500/40"
                      >
                        Diid (Reject)
                      </button>
                    </div>

                    {isRejectOpen && (
                      <div className="pt-2 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Sababta diidmada (tusaale: SMS lama helin)..."
                          value={rejectReasonInput}
                          onChange={(e) => setRejectReasonInput(e.target.value)}
                          className="flex-1 bg-slate-950 border border-rose-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-rose-300/60"
                        />
                        <button
                          type="button"
                          onClick={handleReject}
                          className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                        >
                          Xaqiiji Diidmada
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION: CUSTOMER & DELIVERY INFO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Information Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider pb-2 border-b border-slate-200">
                <User className="w-4 h-4 text-slate-500" />
                <span>Macmiilka (Customer Details)</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Magaca:</span>
                  <span className="font-bold text-slate-800">{order.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Taleefanka:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {order.customerPhone || "Lama gelin"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Degmada:</span>
                  <span className="font-medium text-slate-800">
                    {order.deliveryDistrict || "Muqdisho"}
                  </span>
                </div>
                {order.deliveryAddress && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cinwaanka:</span>
                    <span className="text-slate-800">{order.deliveryAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery & Driver Assignment Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                  <Truck className="w-4 h-4 text-slate-500" />
                  <span>Gaarsiinta & Darawalka</span>
                </div>
                <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  {order.fulfillmentType}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    U Qoondee Darawal (Assign Driver):
                  </label>
                  <select
                    value={order.driverId || ""}
                    onChange={(e) => handleAssignDriver(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-800 cursor-pointer"
                  >
                    <option value="">-- Dooro Darawal --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.phone}) - {d.vehicleType || "Mooto"}
                      </option>
                    ))}
                  </select>
                </div>

                {order.driverName && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-700 font-bold block">
                        Darawalka Qabtay:
                      </span>
                      <span className="font-bold text-slate-800 text-xs">{order.driverName}</span>
                      <span className="text-slate-500 text-[11px] ml-2 font-mono">
                        {order.driverPhone}
                      </span>
                    </div>
                    {order.driverPhone && (
                      <a
                        href={`tel:${order.driverPhone}`}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION: ORDER ITEMS TABLE */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4 text-slate-400" />
              Alaabta Dalabka ({order.items.length})
            </h4>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Alaabta</th>
                    <th className="py-2.5 px-3 text-center">Tirada</th>
                    <th className="py-2.5 px-3 text-right">Qiimaha</th>
                    <th className="py-2.5 px-3 text-right">Dhimis</th>
                    <th className="py-2.5 px-3 text-right">Wadarta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.productName}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center font-bold">
                              {item.productName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-800">{item.productName}</p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              #{item.productId}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        ${item.sellingPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {item.discount && item.discount > 0 ? `-$${item.discount.toFixed(2)}` : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ${item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION: FINANCIAL SUMMARY */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Wadarta Badeecadaha (Subtotal):</span>
              <span className="font-mono font-semibold">${order.subtotal.toFixed(2)}</span>
            </div>

            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Qiimo Dhimis (Discount):</span>
                <span className="font-mono">-${order.discount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1.5">
                <span>Kharashka Gaarsiinta (Delivery):</span>
                {order.deliveryFeePayer === "Business" ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] uppercase">
                    FREE DELIVERY (Dukaanka ayaa bixinaya)
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">(Macmiilka)</span>
                )}
              </span>
              <span className="font-mono font-semibold">
                {order.deliveryFeePayer === "Business"
                  ? "$0.00"
                  : `$${(order.deliveryFee || 0).toFixed(2)}`}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-300 flex justify-between text-sm font-black text-slate-900">
              <span>Wadarta Guud ee Dalabka (Customer Payment):</span>
              <span className="font-mono text-base">${order.total.toFixed(2)}</span>
            </div>

            {order.deliveryFeePayer === "Business" &&
              (order.deliveryRate ?? order.deliveryFee ?? 0) > 0 && (
                <>
                  <div className="flex justify-between text-amber-700 font-semibold">
                    <span>Kharashka Gaarsiinta ee Ganacsiga (Delivery Expense):</span>
                    <span className="font-mono">
                      -${(order.deliveryRate ?? order.deliveryFee ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-bold">
                    <span>Lacagta Saafi ah ka dib Gaarsiinta (Net after Delivery):</span>
                    <span className="font-mono">
                      $
                      {(
                        order.total -
                        (order.deliveryRate ?? order.deliveryFee ?? 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </>
              )}

            <div className="flex justify-between text-emerald-700 font-bold pt-1">
              <span>Lacagta La Bixiyay (Paid):</span>
              <span className="font-mono">${order.paidAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-rose-600 font-black text-sm pt-1 border-t border-slate-200">
              <span>Hadhaaga La Rabo (Remaining Balance):</span>
              <span className="font-mono text-base">${remaining.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {order.status !== "converted" && order.status !== "cancelled" && (
              <button
                id="btn-admin-convert-order-sale"
                type="button"
                onClick={() => {
                  if (onConvertSale) onConvertSale(order.id);
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-lime-400 font-bold text-xs flex items-center gap-2 shadow-md transition"
              >
                <span>U Beddel Invoice Rasmi ah (Convert to Sale)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {order.status !== "cancelled" && order.status !== "converted" && (
              <button
                type="button"
                onClick={() => {
                  const reason = window.prompt("Fadlan geli sababta loo tirtirayo dalabka:");
                  if (reason !== null) {
                    cancelOrder(order.id, reason || "Cancelled by staff");
                    onClose();
                  }
                }}
                className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
              >
                Jooji Dalabka
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
          >
            Xir (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
