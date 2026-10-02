import React, { useState } from "react";
import {
  Package,
  DollarSign,
  TrendingUp,
  History,
  Layers,
  Barcode,
  Calendar,
  User,
  Clock,
  Edit2,
  Tag,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  Trash2,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import { Modal } from "../common/Modal";
import { Product } from "../../types";
import { useStore } from "../../context/StoreContext";
import { validateImageFile, compressImageFile } from "../../utils/imageUtils";

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenRestock: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onOpenRestock,
}) => {
  const { inventoryMovements, updateProduct } = useStore();
  const [activeTab, setActiveTab] = useState<"overview" | "layers" | "history" | "movements">(
    "overview",
  );
  const [isEditing, setIsEditing] = useState(false);

  // Edit state
  const [editName, setEditName] = useState("");
  const [editSelling, setEditSelling] = useState("");
  const [editMinStock, setEditMinStock] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (product) {
      setEditName(product.name);
      setEditSelling(product.sellingPrice.toString());
      setEditMinStock(product.minStockLevel.toString());
      setEditCategory(product.category);
      setIsEditing(false);
      setImageUploadError(null);
    }
  }, [product]);

  if (!product) return null;

  const handleImageFile = async (file: File) => {
    setImageUploadError(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageUploadError(validation.error || "Invalid file");
      return;
    }

    try {
      setIsUploadingImage(true);
      const compressed = await compressImageFile(file, 800, 800, 0.82);
      updateProduct(product.id, { imageUrl: compressed }, "Updated canonical product image");
    } catch {
      setImageUploadError("Failed to process image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    if (confirm("Remove product image?")) {
      updateProduct(product.id, { imageUrl: "" }, "Removed product image");
    }
  };

  const productMovements = inventoryMovements.filter((m) => m.productId === product.id);
  const isLow = product.stock > 0 && product.stock <= product.minStockLevel;
  const isOut = product.stock === 0;

  const profitPerUnit = product.sellingPrice - product.costPrice;
  const marginPct =
    product.sellingPrice > 0 ? ((profitPerUnit / product.sellingPrice) * 100).toFixed(1) : "0.0";

  const handleSaveEdits = (e: React.FormEvent) => {
    e.preventDefault();
    updateProduct(
      product.id,
      {
        name: editName.trim() || product.name,
        sellingPrice: parseFloat(editSelling) || product.sellingPrice,
        minStockLevel: parseInt(editMinStock, 10) || product.minStockLevel,
        category: editCategory || product.category,
      },
      "Updated via Product Detail Inspector",
    );
    setIsEditing(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${product.name}`}
      subtitle={`Canonical ID: ${product.code} • SKU: ${product.sku}`}
      maxWidth="3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRestock(product);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              Restock / Receive Batch
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Top Summary Card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative group shrink-0">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
              />
              {product.imageUrl ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 p-1">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="hover:underline flex items-center gap-0.5"
                    >
                      <Camera className="w-3 h-3" /> Change
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-rose-300 hover:text-rose-100 flex items-center gap-0.5"
                    >
                      <Trash2 className="w-2.5 h-2.5" /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl bg-white border-2 border-dashed border-slate-300 hover:border-indigo-400 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Upload Product Image"
                >
                  <Upload className="w-5 h-5 mb-0.5" />
                  <span className="text-[9px] font-bold">Add Photo</span>
                </button>
              )}
              {isUploadingImage && (
                <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-slate-900 text-sm bg-white px-2 py-0.5 rounded border border-slate-200">
                  {product.code}
                </span>
                <span className="text-xs font-bold text-slate-600">{product.category}</span>
                <span className="text-xs text-slate-400">• {product.brand || "General"}</span>
              </div>
              <h3 className="font-black text-slate-900 text-base mt-1">{product.name}</h3>
              {product.barcode && (
                <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <Barcode className="w-3.5 h-3.5" /> {product.barcode}
                </p>
              )}
              {imageUploadError && (
                <p className="text-[11px] text-rose-600 font-semibold">{imageUploadError}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Stock on Hand
              </span>
              <span className="font-mono font-black text-lg text-slate-900">
                {product.stock}{" "}
                <span className="text-xs font-normal text-slate-500">{product.unit}</span>
              </span>
            </div>
            {isOut ? (
              <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase">
                Out of Stock
              </span>
            ) : isLow ? (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase">
                Low Stock ({product.stock})
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                In Stock
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`pb-2.5 px-3 transition-colors border-b-2 ${
              activeTab === "overview"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            Overview & Pricing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("layers")}
            className={`pb-2.5 px-3 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "layers"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Cost Layers ({product.costLayers?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`pb-2.5 px-3 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "history"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Audit History ({product.history?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("movements")}
            className={`pb-2.5 px-3 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "movements"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            Stock Movements ({productMovements.length})
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Weighted Cost
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  ${product.costPrice.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Retail Selling Price
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  ${product.sellingPrice.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                  Gross Profit / Margin
                </span>
                <span className="font-mono font-bold text-emerald-950 text-sm">
                  ${profitPerUnit.toFixed(2)} ({marginPct}%)
                </span>
              </div>
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                  Stock Valuation
                </span>
                <span className="font-mono font-bold text-indigo-950 text-sm">
                  ${(product.stock * product.sellingPrice).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Quick Editable Attributes */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs">Master Specifications</h4>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {isEditing ? "Cancel Editing" : "Edit Specifications"}
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveEdits} className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Product Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 text-xs border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Selling Price ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editSelling}
                        onChange={(e) => setEditSelling(e.target.value)}
                        className="w-full px-3 py-2 text-xs border rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Low Stock Alert
                      </label>
                      <input
                        type="number"
                        value={editMinStock}
                        onChange={(e) => setEditMinStock(e.target.value)}
                        className="w-full px-3 py-2 text-xs border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs border rounded-xl"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
                  >
                    Save Changes
                  </button>
                </form>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Registered Date</span>
                    <span className="font-semibold text-slate-800">{product.createdAt}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Low Stock Threshold</span>
                    <span className="font-semibold text-slate-800">
                      {product.minStockLevel} {product.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Status</span>
                    <span className="font-semibold text-slate-800">
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {product.description && (
                    <div className="col-span-full pt-1">
                      <span className="text-slate-400 block text-[10px]">Description</span>
                      <p className="text-slate-700 text-xs">{product.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Cost Layers */}
        {activeTab === "layers" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Cost layers track distinct purchase batches and historical cost valuation layers for
              this single product identity.
            </p>
            {product.costLayers && product.costLayers.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Source</th>
                      <th className="py-2.5 px-3 text-right">Batch Qty</th>
                      <th className="py-2.5 px-3 text-right">Remaining</th>
                      <th className="py-2.5 px-3 text-right">Cost Price</th>
                      <th className="py-2.5 px-3">Reference / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {product.costLayers.map((layer) => (
                      <tr key={layer.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono">{layer.date}</td>
                        <td className="py-2.5 px-3 capitalize font-bold text-slate-700">
                          {layer.source}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          +{layer.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {layer.remainingQuantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                          ${layer.costPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">
                          {layer.referenceNo ? `[${layer.referenceNo}] ` : ""}
                          {layer.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                No individual cost layers logged yet.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: History & Audit */}
        {activeTab === "history" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Audit log of product creation, price updates, restocks, and configuration changes.
            </p>
            {product.history && product.history.length > 0 ? (
              <div className="space-y-2">
                {product.history.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span className="font-bold text-slate-700">{ev.action}</span>
                      <span>
                        {ev.timestamp} • By {ev.actor}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium">{ev.details}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                No audit events recorded.
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Stock Movements */}
        {activeTab === "movements" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Canonical inventory movement history for {product.name}.
            </p>
            {productMovements.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Delta</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                      <th className="py-2.5 px-3">Reason / Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productMovements.map((mov) => (
                      <tr key={mov.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono">{mov.date}</td>
                        <td className="py-2.5 px-3 capitalize font-bold text-slate-700">
                          {mov.type.replace("_", " ")}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold ${
                            mov.quantityChange > 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {mov.quantityChange > 0 ? `+${mov.quantityChange}` : mov.quantityChange}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {mov.stockAfter}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">
                          {mov.referenceNo ? `[${mov.referenceNo}] ` : ""}
                          {mov.reason || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                No inventory movement records for this product yet.
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
