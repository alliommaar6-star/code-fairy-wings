import React, { useState } from "react";
import {
  Layers,
  TrendingUp,
  Package,
  ArrowRight,
  Sparkles,
  DollarSign,
  FileText,
  Building2,
  Check,
} from "lucide-react";
import { Modal } from "../common/Modal";
import { useStore } from "../../context/StoreContext";
import { Product } from "../../types";

interface RestockProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RestockProductModal: React.FC<RestockProductModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const { addStockToProduct, accounts } = useStore();

  const [quantity, setQuantity] = useState("");
  const [purchaseCost, setPurchaseCost] = useState(product ? product.costPrice.toString() : "");
  const [sellingPrice, setSellingPrice] = useState(product ? product.sellingPrice.toString() : "");
  const [referenceNo, setReferenceNo] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");

  // Sync initial fields when product opens
  React.useEffect(() => {
    if (product) {
      setPurchaseCost(product.costPrice.toString());
      setSellingPrice(product.sellingPrice.toString());
      setQuantity("");
      setReferenceNo("");
      setSupplierName("");
      setNotes("");
    }
  }, [product]);

  if (!product) return null;

  const qty = parseInt(quantity, 10) || 0;
  const cost = parseFloat(purchaseCost) || 0;
  const newSelling = parseFloat(sellingPrice) || product.sellingPrice;

  // Real-time calculations
  const totalBatchCost = qty * cost;
  const projectedStock = product.stock + qty;
  const currentValuation = product.stock * product.costPrice;
  const projectedValuation = currentValuation + totalBatchCost;
  const projectedWeightedCost =
    projectedStock > 0 ? (projectedValuation / projectedStock).toFixed(2) : cost.toFixed(2);
  const projectedProfit = newSelling - parseFloat(projectedWeightedCost);
  const projectedMargin =
    newSelling > 0 ? ((projectedProfit / newSelling) * 100).toFixed(1) : "0.0";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty <= 0 || cost < 0) return;

    addStockToProduct(product.id, qty, cost, newSelling, {
      supplierName: supplierName.trim() || undefined,
      referenceNo: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined,
      accountId: selectedAccountId || undefined,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Restock Product: ${product.name}`}
      subtitle={`Canonical SKU: ${product.code} • Add Inventory Layer Without Duplicating Product`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 font-mono">
            New Stock:{" "}
            <strong className="text-slate-900">
              {projectedStock} {product.unit}
            </strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="form-restock-product"
              disabled={qty <= 0}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              Confirm Stock Reception
            </button>
          </div>
        </div>
      }
    >
      <form id="form-restock-product" onSubmit={handleSubmit} className="space-y-4">
        {/* Product Identity Banner */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-mono font-black text-xs shrink-0">
              {product.code}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs">{product.name}</h4>
              <p className="text-[11px] text-slate-500">
                {product.category} • Current:{" "}
                <span className="font-bold text-slate-700">
                  {product.stock} {product.unit}
                </span>{" "}
                @ ${product.costPrice.toFixed(2)}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
            {product.unit}
          </span>
        </div>

        {/* Quantities & Pricing Input */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Quantity Received *
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 50"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-slate-900"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Purchase Cost ($) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={purchaseCost}
              onChange={(e) => setPurchaseCost(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-1">Can differ from previous cost</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Retail Selling Price ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-1">Leave as-is or adjust</p>
          </div>
        </div>

        {/* Automatic Weighted Average Valuation Card */}
        <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Automated Weighted Average & Cost Layer
            </span>
            <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
              Total Batch Outlay: ${totalBatchCost.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-white rounded-lg border border-indigo-100">
              <span className="text-slate-400 text-[10px] block">Projected Total Stock</span>
              <span className="font-bold text-slate-900 font-mono">
                {projectedStock} {product.unit}
              </span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-indigo-100">
              <span className="text-slate-400 text-[10px] block">New Weighted Avg Cost</span>
              <span className="font-bold text-indigo-900 font-mono">
                ${projectedWeightedCost} / {product.unit}
              </span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-indigo-100 col-span-2 sm:col-span-1">
              <span className="text-slate-400 text-[10px] block">Profit Margin</span>
              <span className="font-bold text-emerald-700 font-mono">
                {projectedMargin}% (${projectedProfit.toFixed(2)})
              </span>
            </div>
          </div>
        </div>

        {/* Optional Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Supplier / Vendor (Optional)
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g. Al-Baraka Wholesale"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Purchase Ref / Invoice # (Optional)
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. PO-2026-902"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Batch Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Condition, batch expiration date, warehouse shelf location..."
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </form>
    </Modal>
  );
};
