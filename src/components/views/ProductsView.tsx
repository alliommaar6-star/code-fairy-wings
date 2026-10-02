import React, { useState, useMemo } from "react";
import {
  Package,
  DollarSign,
  AlertTriangle,
  Search,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  Filter,
  CheckCircle2,
  Layers,
  ArrowUpDown,
  LayoutGrid,
  List,
  Eye,
  Archive,
  RotateCcw,
  Sparkles,
  Barcode,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { Product } from "../../types";
import { StatCard } from "../common/StatCard";
import { Modal } from "../common/Modal";
import { RestockProductModal } from "./RestockProductModal";
import { ProductDetailModal } from "./ProductDetailModal";
import { CategoriesModal } from "./CategoriesModal";

interface ProductsViewProps {
  onOpenNewProduct: () => void;
  onQuickSell: (product: Product) => void;
}

type SortField = "name" | "code" | "stock" | "sellingPrice" | "costPrice" | "valuation";
type SortOrder = "asc" | "desc";
type StatusFilter = "all" | "in_stock" | "low_stock" | "out_of_stock" | "archived";

export const ProductsView: React.FC<ProductsViewProps> = ({ onOpenNewProduct, onQuickSell }) => {
  const { products, deleteProduct, updateProduct, adjustStock } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [sortField, setSortField] = useState<SortField>("code");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Modals
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  // Stock Adjust Modal
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("Stock count correction");
  const [adjustType, setAdjustType] = useState<"add" | "remove">("add");

  const categories = useMemo(() => {
    return ["All", ...Array.from(new Set(products.map((p) => p.category)))];
  }, [products]);

  const brands = useMemo(() => {
    return ["All", ...Array.from(new Set(products.map((p) => p.brand || "General")))];
  }, [products]);

  // Filtering
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q));

      const matchCat = selectedCategory === "All" || p.category === selectedCategory;
      const matchBrand = selectedBrand === "All" || (p.brand || "General") === selectedBrand;

      let matchStatus = true;
      if (statusFilter === "in_stock") {
        matchStatus = p.stock > p.minStockLevel && !p.isArchived;
      } else if (statusFilter === "low_stock") {
        matchStatus = p.stock > 0 && p.stock <= p.minStockLevel && !p.isArchived;
      } else if (statusFilter === "out_of_stock") {
        matchStatus = p.stock === 0 && !p.isArchived;
      } else if (statusFilter === "archived") {
        matchStatus = !!p.isArchived;
      } else {
        // 'all' includes active non-archived by default unless specifically asked
        matchStatus = !p.isArchived;
      }

      return matchSearch && matchCat && matchBrand && matchStatus;
    });
  }, [products, searchQuery, selectedCategory, selectedBrand, statusFilter]);

  // Sorting
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let comp = 0;
      if (sortField === "name") {
        comp = a.name.localeCompare(b.name);
      } else if (sortField === "code") {
        comp = a.code.localeCompare(b.code, undefined, { numeric: true });
      } else if (sortField === "stock") {
        comp = a.stock - b.stock;
      } else if (sortField === "sellingPrice") {
        comp = a.sellingPrice - b.sellingPrice;
      } else if (sortField === "costPrice") {
        comp = a.costPrice - b.costPrice;
      } else if (sortField === "valuation") {
        comp = a.stock * a.sellingPrice - b.stock * b.sellingPrice;
      }
      return sortOrder === "asc" ? comp : -comp;
    });
  }, [filteredProducts, sortField, sortOrder]);

  // Aggregate stats
  const activeProducts = products.filter((p) => !p.isArchived);
  const totalProducts = activeProducts.length;
  const stockValueCost = activeProducts.reduce((s, p) => s + p.costPrice * p.stock, 0);
  const stockValueSelling = activeProducts.reduce((s, p) => s + p.sellingPrice * p.stock, 0);
  const lowStockCount = activeProducts.filter(
    (p) => p.stock > 0 && p.stock <= p.minStockLevel,
  ).length;
  const outOfStockCount = activeProducts.filter((p) => p.stock === 0).length;

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleApplyAdjustment = () => {
    if (!adjustModalProduct) return;
    const qty = parseInt(adjustQty, 10);
    if (!qty || qty <= 0) return;
    const delta = adjustType === "add" ? qty : -qty;
    adjustStock(adjustModalProduct.id, delta, adjustReason);
    setAdjustModalProduct(null);
    setAdjustQty("");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Master Product Catalogue
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Canonical product identities, cost layers, weighted average valuations, and real-time
            inventory tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-manage-categories"
            onClick={() => setIsCategoriesOpen(true)}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Layers className="w-4 h-4 text-indigo-500" />
            Categories
          </button>
          <button
            id="btn-add-product-header"
            onClick={onOpenNewProduct}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-emerald-400 stroke-[3]" />
            New Product
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Active SKUs"
          value={totalProducts}
          subtitle={`${products.filter((p) => p.isArchived).length} archived`}
          icon={Package}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Stock Value (Cost)"
          value={`$${stockValueCost.toFixed(2)}`}
          subtitle="Capital invested in inventory"
          icon={DollarSign}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />

        <StatCard
          title="Retail Valuation"
          value={`$${stockValueSelling.toFixed(2)}`}
          subtitle={`Margin: $${(stockValueSelling - stockValueCost).toFixed(2)}`}
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          highlight
        />

        <StatCard
          title="Attention Needed"
          value={lowStockCount + outOfStockCount}
          subtitle={`${outOfStockCount} out of stock • ${lowStockCount} low stock`}
          icon={AlertTriangle}
          iconBg={lowStockCount + outOfStockCount > 0 ? "bg-amber-50" : "bg-slate-100"}
          iconColor={lowStockCount + outOfStockCount > 0 ? "text-amber-600" : "text-slate-400"}
        />
      </div>

      {/* Control Bar: Search, Filters & View Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, product name, barcode, SKU, brand..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all font-medium"
            />
          </div>

          {/* Quick Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs shrink-0">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                statusFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({activeProducts.length})
            </button>
            <button
              onClick={() => setStatusFilter("low_stock")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                statusFilter === "low_stock"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              Low Stock ({lowStockCount})
            </button>
            <button
              onClick={() => setStatusFilter("out_of_stock")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                statusFilter === "out_of_stock"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 text-rose-800 hover:bg-rose-100"
              }`}
            >
              Out of Stock ({outOfStockCount})
            </button>
            <button
              onClick={() => setStatusFilter("archived")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                statusFilter === "archived"
                  ? "bg-slate-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              Archived ({products.filter((p) => p.isArchived).length})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-end md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Secondary Category & Brand Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Category:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? "bg-slate-800 text-white"
                    : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {brands.length > 2 && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Brand:
              </span>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {sortedProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No products found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedCategory !== "All" || statusFilter !== "all"
                ? "No items matched your current search filters. Try clearing filters or searching for something else."
                : "Your catalogue is currently empty. Click below to add your first commercial master product."}
            </p>
          </div>
          <button
            onClick={onOpenNewProduct}
            className="px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-slate-800 transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            Add First Master Product
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW (Dense, informative, sortable) */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-700"
                    onClick={() => handleToggleSort("code")}
                  >
                    <div className="flex items-center gap-1">
                      Code / SKU
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-700"
                    onClick={() => handleToggleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Product Name
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Category / Brand</th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-slate-700"
                    onClick={() => handleToggleSort("costPrice")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Cost
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-slate-700"
                    onClick={() => handleToggleSort("sellingPrice")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Selling Price
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-center cursor-pointer hover:text-slate-700"
                    onClick={() => handleToggleSort("stock")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      On-Hand Stock
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-slate-700"
                    onClick={() => handleToggleSort("valuation")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Valuation
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {sortedProducts.map((p) => {
                  const isLow = p.stock > 0 && p.stock <= p.minStockLevel;
                  const isOut = p.stock === 0;
                  const profit = p.sellingPrice - p.costPrice;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setDetailProduct(p)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {p.code}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 hidden sm:inline">
                            {p.sku}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-lg object-contain bg-white border border-slate-200 p-0.5 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {p.name}
                            </div>
                            {p.barcode && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Barcode: {p.barcode}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-slate-800 font-semibold">{p.category}</div>
                        <div className="text-[10px] text-slate-400">{p.brand || "General"}</div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        ${p.costPrice.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ${p.sellingPrice.toFixed(2)}
                        <div className="text-[10px] text-emerald-600 font-normal">
                          +${profit.toFixed(2)}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-black text-sm text-slate-900">
                          {p.stock}
                        </span>{" "}
                        <span className="text-[10px] font-normal text-slate-400 uppercase">
                          {p.unit}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ${(p.stock * p.sellingPrice).toFixed(2)}
                      </td>

                      <td className="py-3 px-3">
                        {p.isArchived ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Archived
                          </span>
                        ) : isOut ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            Out of stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Low stock ({p.stock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            In stock
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onQuickSell(p)}
                            disabled={p.stock <= 0}
                            className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-bold transition-colors"
                            title="Quick Sale"
                          >
                            Sell
                          </button>

                          <button
                            type="button"
                            onClick={() => setRestockProduct(p)}
                            className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[10px] font-bold transition-colors flex items-center gap-0.5"
                            title="Restock Batch without duplicating product"
                          >
                            <Layers className="w-3 h-3" />
                            Restock
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAdjustModalProduct(p);
                              setAdjustQty("10");
                            }}
                            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Stock Count Adjust"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (
                                confirm(
                                  `Delete or archive product "${p.name}" (${p.code})? If transactions exist, it will be safely deactivated.`,
                                )
                              ) {
                                deleteProduct(p.id);
                              }
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete / Archive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID / CARDS VIEW (Responsive for 390px, 834px, 1440px) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedProducts.map((p) => {
            const isLow = p.stock > 0 && p.stock <= p.minStockLevel;
            const isOut = p.stock === 0;
            const profit = p.sellingPrice - p.costPrice;

            return (
              <div
                key={p.id}
                onClick={() => setDetailProduct(p)}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Card Header: Code & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {p.code}
                    </span>
                    {isOut ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        Out of stock
                      </span>
                    ) : isLow ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Low ({p.stock})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        In stock
                      </span>
                    )}
                  </div>

                  {/* Product Image & Title */}
                  <div className="flex items-start gap-3 mb-3">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-xl object-contain bg-slate-50 border border-slate-100 p-1 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                        {p.category} • {p.brand || "General"}
                      </p>
                      <h4 className="font-black text-slate-900 text-xs sm:text-sm line-clamp-2 mt-0.5 group-hover:text-indigo-600 transition-colors">
                        {p.name}
                      </h4>
                    </div>
                  </div>

                  {/* Pricing Matrix */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl mb-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Cost / Selling
                      </span>
                      <div className="font-mono">
                        <span className="text-slate-500 text-[11px]">
                          ${p.costPrice.toFixed(2)}
                        </span>
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="font-bold text-slate-900">
                          ${p.sellingPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        On-Hand Stock
                      </span>
                      <span className="font-mono font-black text-slate-900 text-sm">
                        {p.stock}{" "}
                        <span className="text-[10px] font-normal text-slate-500 uppercase">
                          {p.unit}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div
                  className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setRestockProduct(p)}
                    className="flex-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Layers className="w-3.5 h-3.5" /> Restock
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickSell(p)}
                    disabled={p.stock <= 0}
                    className="flex-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    Sell
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModalProduct && (
        <Modal
          isOpen={!!adjustModalProduct}
          onClose={() => setAdjustModalProduct(null)}
          title={`Adjust Stock: ${adjustModalProduct.name}`}
          subtitle={`Current stock: ${adjustModalProduct.stock} ${adjustModalProduct.unit}`}
          maxWidth="sm"
          footer={
            <>
              <button
                type="button"
                onClick={() => setAdjustModalProduct(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyAdjustment}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Apply Adjustment
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdjustType("add")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  adjustType === "add"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                + Add Units
              </button>
              <button
                type="button"
                onClick={() => setAdjustType("remove")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  adjustType === "remove"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                - Deduct Units
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Quantity ({adjustModalProduct.unit})
              </label>
              <input
                type="number"
                min="1"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-slate-900"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Reason / Note *
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Stock count correction, damaged goods, shelf discrepancy..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Restock / Batch Reception Modal */}
      <RestockProductModal
        product={restockProduct}
        isOpen={!!restockProduct}
        onClose={() => setRestockProduct(null)}
      />

      {/* Master Detail Inspector Modal */}
      <ProductDetailModal
        product={detailProduct}
        isOpen={!!detailProduct}
        onClose={() => setDetailProduct(null)}
        onOpenRestock={(p) => {
          setDetailProduct(null);
          setRestockProduct(p);
        }}
      />

      {/* Categories Management Modal */}
      <CategoriesModal isOpen={isCategoriesOpen} onClose={() => setIsCategoriesOpen(false)} />
    </div>
  );
};
