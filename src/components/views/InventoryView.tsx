import React, { useState, useMemo } from "react";
import {
  Package,
  AlertTriangle,
  ArrowUpDown,
  Search,
  CheckCircle2,
  TrendingUp,
  Layers,
  Archive,
  DollarSign,
  FileText,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  User,
  Plus,
  Trash2,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { StatCard } from "../common/StatCard";
import { Modal } from "../common/Modal";
import { Product, InventoryMovement } from "../../types";
import { RestockProductModal } from "./RestockProductModal";

type AdjKind = "damage" | "loss" | "moved" | "count";
const ADJ_KINDS: Record<
  AdjKind,
  { label: string; dir: "add" | "remove" | "both"; type: "adjustment" | "damage" | "loss" }
> = {
  damage: { label: "Halaabay / Jabay", dir: "remove", type: "damage" },
  loss: { label: "Lumay / La xaday", dir: "remove", type: "loss" },
  moved: { label: "Laga guuray", dir: "remove", type: "adjustment" },
  count: { label: "Tirinta (sax)", dir: "both", type: "adjustment" },
};

export const InventoryView: React.FC = () => {
  const {
    products: allProducts,
    inventoryMovements,
    adjustStock,
    currentUser,
    deleteProduct,
  } = useStore();
  // Removed (archived) products disappear from inventory automatically.
  const products = allProducts.filter((p) => !p.isArchived);
  const removeProduct = (p: Product) => {
    if (
      !window.confirm(
        `Ma hubtaa inaad "${p.name}" gabi ahaan ka saarto system-ka?\n\nKaydka hadda: ${p.stock} ${p.unit}\nWaxay ka baxaysaa Products iyo Inventory labadaba.`,
      )
    )
      return;
    const r = deleteProduct(p.id);
    alert(
      r.archived
        ? `"${p.name}" waa laga saaray. Iibkii hore iyo xisaabaadka waa la ilaaliyay.`
        : `"${p.name}" gabi ahaan waa la tirtiray.`,
    );
  };
  const isOwner = currentUser.role === "Owner";

  const [activeTab, setActiveTab] = useState<"stock" | "movements">("stock");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "low" | "out">("all");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");

  // Modals
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "remove">("remove");
  const [adjKind, setAdjKind] = useState<AdjKind>("damage");
  const [adjConfirm, setAdjConfirm] = useState(false);

  // Filtered products for Stock on Hand
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q));

      const isLow = p.stock > 0 && p.stock <= p.minStockLevel;
      const isOut = p.stock === 0;

      const matchFilter = filterType === "all" ? true : filterType === "low" ? isLow : isOut;

      return matchQuery && matchFilter;
    });
  }, [products, searchQuery, filterType]);

  // Filtered movements for Canonical Audit Ledger
  const filteredMovements = useMemo(() => {
    return inventoryMovements.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        m.productName.toLowerCase().includes(q) ||
        (m.referenceNo && m.referenceNo.toLowerCase().includes(q)) ||
        (m.reason && m.reason.toLowerCase().includes(q)) ||
        (m.actor && m.actor.toLowerCase().includes(q));

      const matchType = movementTypeFilter === "all" || m.type === movementTypeFilter;

      return matchQuery && matchType;
    });
  }, [inventoryMovements, searchQuery, movementTypeFilter]);

  // High-level aggregates
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStockLevel).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const totalStockUnits = products.reduce((s, p) => s + p.stock, 0);
  const totalCostValuation = products.reduce((s, p) => s + p.costPrice * p.stock, 0);
  const totalStockValuation = products.reduce((s, p) => s + p.sellingPrice * p.stock, 0);
  const unrealizedGrossMargin = totalStockValuation - totalCostValuation;

  const adjQty = parseInt(adjustQty, 10) || 0;
  const adjDelta = adjustType === "add" ? adjQty : -adjQty;
  const adjAfter = (adjustModalProduct?.stock ?? 0) + adjDelta;
  const adjValue = Math.abs(adjDelta) * (adjustModalProduct?.costPrice ?? 0);
  const adjError = !isOwner
    ? "Kaliya Owner-ka ayaa beddeli kara tirada alaabta."
    : adjQty <= 0
      ? "Geli tiro ka weyn 0."
      : adjAfter < 0
        ? `Ma laga jari karo ${adjQty} — kaydka hadda waa ${adjustModalProduct?.stock ?? 0} kaliya.`
        : !adjustReason.trim()
          ? "Sababta waa qasab (tusaale: halaabay, lumay, laga guuray)."
          : "";

  const handleApplyAdjustment = () => {
    if (!adjustModalProduct || adjError) return;
    if (!adjConfirm) {
      setAdjConfirm(true);
      return;
    }
    adjustStock(
      adjustModalProduct.id,
      adjDelta,
      `${ADJ_KINDS[adjKind].label}: ${adjustReason.trim()}`,
      ADJ_KINDS[adjKind].type,
    );
    setAdjustModalProduct(null);
    setAdjustQty("");
    setAdjustReason("");
    setAdjConfirm(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Inventory & Warehouse Valuation
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Authoritative warehouse stock balances, reorder threshold alerts, and immutable movement
            ledger.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("stock")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "stock"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Stock on Hand ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("movements")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "movements"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Movement Ledger ({inventoryMovements.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Physical On-Hand"
          value={totalStockUnits}
          subtitle={`${products.length} registered SKUs`}
          icon={Package}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Inventory Cost"
          value={`$${totalCostValuation.toFixed(2)}`}
          subtitle="Weighted cost investment"
          icon={DollarSign}
          iconBg="bg-slate-100"
          iconColor="text-slate-700"
        />

        <StatCard
          title="Retail Valuation"
          value={`$${totalStockValuation.toFixed(2)}`}
          subtitle={`Unrealized profit: +$${unrealizedGrossMargin.toFixed(2)}`}
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          highlight
        />

        <StatCard
          title="Replenishment Alerts"
          value={lowStockCount + outOfStockCount}
          subtitle={`${outOfStockCount} zero shelf • ${lowStockCount} below min`}
          icon={AlertTriangle}
          iconBg={lowStockCount + outOfStockCount > 0 ? "bg-amber-50" : "bg-slate-100"}
          iconColor={lowStockCount + outOfStockCount > 0 ? "text-amber-600" : "text-slate-500"}
        />
      </div>

      {/* TAB 1: STOCK ON HAND */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by SKU, product name, barcode..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-2 rounded-xl font-bold transition-all ${
                  filterType === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Stock ({products.length})
              </button>
              <button
                onClick={() => setFilterType("low")}
                className={`px-3 py-2 rounded-xl font-bold transition-all ${
                  filterType === "low"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                Low Stock ({lowStockCount})
              </button>
              <button
                onClick={() => setFilterType("out")}
                className={`px-3 py-2 rounded-xl font-bold transition-all ${
                  filterType === "out"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 text-rose-800 hover:bg-rose-100"
                }`}
              >
                Out of Stock ({outOfStockCount})
              </button>
            </div>
          </div>

          {/* Inventory Stock Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Code / SKU</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-right">Weighted Cost</th>
                    <th className="py-3 px-3 text-right">Selling Price</th>
                    <th className="py-3 px-3 text-center">Available Stock</th>
                    <th className="py-3 px-3 text-center">Min Threshold</th>
                    <th className="py-3 px-3 text-right">Valuation (Cost)</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-center">Restock / Adjust</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                        No inventory records match your current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isLow = p.stock > 0 && p.stock <= p.minStockLevel;
                      const isOut = p.stock === 0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {p.code}
                            </span>
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                              {p.sku}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{p.name}</div>
                            {p.brand && <div className="text-[10px] text-slate-400">{p.brand}</div>}
                          </td>

                          <td className="py-3 px-3 text-slate-600">{p.category}</td>

                          <td className="py-3 px-3 text-right text-slate-500 font-mono">
                            ${p.costPrice.toFixed(2)}
                          </td>

                          <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                            ${p.sellingPrice.toFixed(2)}
                          </td>

                          <td className="py-3 px-3 text-center font-black font-mono text-sm">
                            {p.stock}{" "}
                            <span className="text-[10px] font-normal text-slate-400 uppercase">
                              {p.unit}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-slate-400">
                            {p.minStockLevel}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            ${(p.costPrice * p.stock).toFixed(2)}
                          </td>

                          <td className="py-3 px-3">
                            {isOut ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                Out of stock
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Reorder Alert ({p.stock})
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Adequate
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setRestockProduct(p)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-0.5"
                                title="Receive stock batch"
                              >
                                <Layers className="w-3 h-3" />
                                Restock
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAdjustModalProduct(p);
                                  setAdjustQty("");
                                  setAdjustReason("");
                                  setAdjKind("damage");
                                  setAdjustType("remove");
                                  setAdjConfirm(false);
                                }}
                                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                title="Count Adjustment"
                              >
                                <ArrowUpDown className="w-3.5 h-3.5" />
                              </button>
                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() => removeProduct(p)}
                                  title="Ka saar system-ka"
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CANONICAL INVENTORY MOVEMENT LEDGER */}
      {activeTab === "movements" && (
        <div className="space-y-4">
          {/* Movement Ledger Filters */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movements by product, ref#, or note..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                Type:
              </span>
              {["all", "opening", "purchase", "sale", "return_in", "adjustment"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMovementTypeFilter(t)}
                  className={`px-2.5 py-1.5 rounded-xl font-bold capitalize transition-all shrink-0 ${
                    movementTypeFilter === t
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Movements Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-3">Movement Type</th>
                    <th className="py-3 px-3 text-right">Delta (Change)</th>
                    <th className="py-3 px-3 text-right">Balance After</th>
                    <th className="py-3 px-3 text-right">Unit Cost</th>
                    <th className="py-3 px-3">Reference / Notes</th>
                    <th className="py-3 px-4">Recorded By</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                        No inventory movements recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((m) => {
                      const isPositive = m.quantityChange > 0;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                            {m.date}
                          </td>

                          <td className="py-3 px-4 font-bold text-slate-900">{m.productName}</td>

                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                m.type === "purchase" || m.type === "opening"
                                  ? "bg-indigo-100 text-indigo-800"
                                  : m.type === "sale"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : m.type === "return_in"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {m.type.replace("_", " ")}
                            </span>
                          </td>

                          <td
                            className={`py-3 px-3 text-right font-mono font-bold text-sm ${
                              isPositive ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {isPositive ? `+${m.quantityChange}` : m.quantityChange}{" "}
                            <span className="text-[10px] font-normal text-slate-400 uppercase">
                              {m.unit || "PCS"}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                            {m.stockAfter}{" "}
                            <span className="text-[10px] font-normal text-slate-400 uppercase">
                              {m.unit || "PCS"}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-slate-500">
                            {m.costPrice ? `$${m.costPrice.toFixed(2)}` : "—"}
                          </td>

                          <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                            {m.referenceNo && (
                              <span className="font-mono font-bold text-slate-800 mr-1.5 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                {m.referenceNo}
                              </span>
                            )}
                            {m.reason || "—"}
                          </td>

                          <td className="py-3 px-4 text-slate-500 font-medium">
                            {m.actor || "System"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModalProduct && (
        <Modal
          isOpen={!!adjustModalProduct}
          onClose={() => {
            setAdjustModalProduct(null);
            setAdjConfirm(false);
          }}
          title={`Beddel Kaydka: ${adjustModalProduct.name}`}
          subtitle={`Kaydka hadda: ${adjustModalProduct.stock} ${adjustModalProduct.unit}`}
          maxWidth="sm"
          footer={
            <>
              <button
                type="button"
                onClick={() => (adjConfirm ? setAdjConfirm(false) : setAdjustModalProduct(null))}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
              >
                {adjConfirm ? "Dib u noqo" : "Ka noqo"}
              </button>
              <button
                type="button"
                disabled={!!adjError}
                onClick={handleApplyAdjustment}
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-40 ${adjConfirm ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-900 hover:bg-slate-800"}`}
              >
                {adjConfirm ? "HAA, waan hubaa — Kaydi" : "Sii wad"}
              </button>
            </>
          }
        >
          {adjConfirm ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-amber-50 border border-amber-300 p-3 font-bold text-amber-900">
                Ma hubtaa? Fadlan hubi xogtan ka hor intaadan kaydin:
              </div>
              <dl className="grid grid-cols-2 gap-y-1.5">
                <dt className="text-slate-500">Alaabta</dt>
                <dd className="font-bold">{adjustModalProduct.name}</dd>
                <dt className="text-slate-500">Nooca</dt>
                <dd className="font-bold">{ADJ_KINDS[adjKind].label}</dd>
                <dt className="text-slate-500">Isbeddelka</dt>
                <dd
                  className={`font-extrabold ${adjDelta < 0 ? "text-rose-600" : "text-emerald-600"}`}
                >
                  {adjDelta > 0 ? "+" : ""}
                  {adjDelta} {adjustModalProduct.unit}
                </dd>
                <dt className="text-slate-500">Kaydka hadda</dt>
                <dd className="font-bold">{adjustModalProduct.stock}</dd>
                <dt className="text-slate-500">Kaydka kadib</dt>
                <dd className="font-extrabold">{adjAfter}</dd>
                <dt className="text-slate-500">Qiimaha (cost)</dt>
                <dd className="font-bold">${adjValue.toFixed(2)}</dd>
                <dt className="text-slate-500">Sababta</dt>
                <dd className="font-bold">{adjustReason}</dd>
              </dl>
              <p className="text-xs text-slate-500">
                Tani waxay ku qormaysaa taariikhda kaydka iyo xisaabaadka (accounting). Waxaa
                diiwaan geliyay: {currentUser.name}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {!isOwner && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800">
                  Kaliya Owner-ka ayaa beddeli kara tirada alaabta.
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ADJ_KINDS) as AdjKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setAdjKind(k);
                      setAdjustType(ADJ_KINDS[k].dir === "add" ? "add" : "remove");
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${adjKind === k ? (ADJ_KINDS[k].dir === "add" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white") : "bg-slate-100 text-slate-600"}`}
                  >
                    {ADJ_KINDS[k].label}
                  </button>
                ))}
              </div>
              {adjKind === "count" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("add")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${adjustType === "add" ? "bg-emerald-600 text-white" : "bg-slate-100"}`}
                  >
                    + Ku dar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("remove")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${adjustType === "remove" ? "bg-rose-600 text-white" : "bg-slate-100"}`}
                  >
                    − Ka jar
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Tirada ({adjustModalProduct.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-slate-900"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Sababta *
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Tusaale: 3 xabo ayaa jabay, bakhaarka B loo wareejiyay..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs flex justify-between">
                <span>
                  Kaydka kadib: <b>{adjAfter}</b>
                </span>
                <span>
                  Qiimaha: <b>${adjValue.toFixed(2)}</b>
                </span>
              </div>
              {adjError && adjQty > 0 && (
                <p className="text-xs font-bold text-rose-600">{adjError}</p>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Restock Product Modal */}
      <RestockProductModal
        product={restockProduct}
        isOpen={!!restockProduct}
        onClose={() => setRestockProduct(null)}
      />
    </div>
  );
};
