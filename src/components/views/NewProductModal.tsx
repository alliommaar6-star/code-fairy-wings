import React, { useState, useRef, useId } from "react";
import {
  Upload,
  Image as ImageIcon,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  Percent,
  Check,
  X,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { Modal } from "../common/Modal";
import { generateDescription } from "../../lib/ai.functions";
import { useStore } from "../../context/StoreContext";
import { Product } from "../../types";
import { validateImageFile, compressImageFile } from "../../utils/imageUtils";
import { BrandsModal } from "./BrandsModal";

interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRestock?: (product: Product) => void;
}

export const NewProductModal: React.FC<NewProductModalProps> = ({
  isOpen,
  onClose,
  onOpenRestock,
}) => {
  const {
    products,
    categories,
    brands,
    units,
    addProduct,
    addCategory,
    addBrand,
    addUnit,
    checkDuplicateProduct,
  } = useStore();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [brand, setBrand] = useState("General");
  const [unit, setUnit] = useState("PCS");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [minStock, setMinStock] = useState("5");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Inline taxonomy creator states
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [showNewBrandInput, setShowNewBrandInput] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [showNewUnitInput, setShowNewUnitInput] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitSymbol, setNewUnitSymbol] = useState("");

  const [duplicateWarning, setDuplicateWarning] = useState<Product | null>(null);
  const [barcodeHidden, setBarcodeHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem("benadir_barcode_hidden") === "1";
    } catch {
      return false;
    }
  });
  const [brandHidden, setBrandHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem("benadir_brand_hidden") === "1";
    } catch {
      return false;
    }
  });
  const [isBrandsOpen, setIsBrandsOpen] = useState(false);
  const [skuHidden, setSkuHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem("benadir_sku_hidden") === "1";
    } catch {
      return false;
    }
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSkuHidden = () => {
    setSkuHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("benadir_sku_hidden", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleAiDescription = async () => {
    if (!name.trim()) {
      setAiError("Marka hore geli magaca alaabta.");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await generateDescription({
        data: {
          name: name.trim(),
          details: description.trim() || undefined,
          category,
          brand,
        },
      });
      setDescription(res.description);
    } catch (err) {
      setAiError(
        err instanceof Error && err.message
          ? err.message
          : "Internet-ka ayaa cilad galay — isku day mar kale.",
      );
    } finally {
      setAiLoading(false);
    }
  };

  const toggleBrandHidden = () => {
    setBrandHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("benadir_brand_hidden", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const toggleBarcodeHidden = () => {
    setBarcodeHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("benadir_barcode_hidden", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // Compute next ID preview
  let maxSeq = 0;
  products.forEach((p) => {
    const match = p.code?.match(/^P(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  });
  const nextCodePreview = `P${String(maxSeq + 1).padStart(5, "0")}`;

  // Live profit calculation
  const cost = parseFloat(costPrice) || 0;
  const selling = parseFloat(sellingPrice) || 0;
  const profitPerUnit = selling - cost;
  const marginPct = selling > 0 ? ((profitPerUnit / selling) * 100).toFixed(1) : "0.0";

  const handleNameChange = (val: string) => {
    setName(val);
    if (val.trim().length >= 3) {
      const dup = checkDuplicateProduct(val, sku, barcode, brand);
      setDuplicateWarning(dup);
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleBarcodeChange = (val: string) => {
    setBarcode(val);
    if (val.trim()) {
      const dup = checkDuplicateProduct(name, sku, val, brand);
      setDuplicateWarning(dup);
    }
  };

  const handleSkuChange = (val: string) => {
    setSku(val);
    if (val.trim()) {
      const dup = checkDuplicateProduct(name, val, barcode, brand);
      setDuplicateWarning(dup);
    }
  };

  // Image Upload handler with validation & compression
  const handleFile = async (file: File) => {
    setImageError(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageError(validation.error || "Invalid image file");
      return;
    }

    try {
      setIsCompressing(true);
      const compressedUrl = await compressImageFile(file, 800, 800, 0.82);
      setImagePreview(compressedUrl);
    } catch {
      setImageError("Failed to process image file. Please try another image.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleAddNewCategory = () => {
    if (!newCatName.trim()) return;
    const cat = addCategory(newCatName);
    setCategory(cat.name);
    setNewCatName("");
    setShowNewCatInput(false);
  };

  const handleAddNewBrand = () => {
    if (!newBrandName.trim()) return;
    const brd = addBrand(newBrandName);
    setBrand(brd.name);
    setNewBrandName("");
    setShowNewBrandInput(false);
  };

  const handleAddNewUnit = () => {
    if (!newUnitSymbol.trim()) return;
    const u = addUnit(newUnitName.trim() || newUnitSymbol.trim(), newUnitSymbol.trim());
    setUnit(u.symbol);
    setNewUnitName("");
    setNewUnitSymbol("");
    setShowNewUnitInput(false);
  };

  const resetForm = () => {
    setName("");
    setSku("");
    setBarcode("");
    setCategory("Groceries");
    setBrand("General");
    setUnit("PCS");
    setCostPrice("");
    setSellingPrice("");
    setStock("0");
    setMinStock("5");
    setDescription("");
    setImagePreview("");
    setDuplicateWarning(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sellingPrice || !costPrice) return;

    // Check duplicate once more
    const dup = checkDuplicateProduct(name, sku, barcode, brand);
    if (
      dup &&
      !confirm(
        `A product with similar identity "${dup.name}" (${dup.code}) already exists in the catalogue. Are you sure you want to create another product?`,
      )
    ) {
      setDuplicateWarning(dup);
      return;
    }

    const generatedSku =
      sku.trim() || `${category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    addProduct({
      name: name.trim(),
      sku: generatedSku,
      barcode: barcode.trim() || undefined,
      category,
      brand: brand.trim() || "General",
      costPrice: cost,
      sellingPrice: selling,
      stock: parseInt(stock, 10) || 0,
      minStockLevel: parseInt(minStock, 10) || 0,
      unit: unit.toUpperCase(),
      description: description.trim() || undefined,
      imageUrl: imagePreview || undefined,
      isActive: true,
      isArchived: false,
    });

    resetForm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Product"
      subtitle={`Sequential Canonical ID: ${nextCodePreview} • Database Authoritative Master Data`}
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              {nextCodePreview}
            </span>
            <span>Single Product Master Entity</span>
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
              form="form-new-product"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Save Master Product
            </button>
          </div>
        </div>
      }
    >
      <form id="form-new-product" onSubmit={handleSubmit} className="space-y-5">
        {/* Duplicate Warning Alert */}
        {duplicateWarning && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  Existing Product Match Detected: {duplicateWarning.name} ({duplicateWarning.code})
                </p>
                <p className="text-amber-800">
                  Different purchase prices or new stock batches must NOT create duplicate products.
                  Would you like to restock this existing product instead?
                </p>
                <p className="font-mono text-[11px] text-amber-700">
                  Current Stock: {duplicateWarning.stock} {duplicateWarning.unit} • Cost: $
                  {duplicateWarning.costPrice.toFixed(2)} • Sale: $
                  {duplicateWarning.sellingPrice.toFixed(2)}
                </p>
              </div>
            </div>
            {onOpenRestock && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRestock(duplicateWarning);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shrink-0 flex items-center gap-1 shadow-xs transition-colors"
              >
                Restock Existing <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Section: Product Identification & Image */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* File Image Upload */}
          <div className="md:col-span-1 space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Product Image
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl h-44 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all ${
                isDragOver
                  ? "border-indigo-500 bg-indigo-50/50"
                  : imagePreview
                    ? "border-emerald-300 bg-slate-50"
                    : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {isCompressing ? (
                <div className="space-y-2 p-2">
                  <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold text-emerald-800">Optimizing & Compressing...</p>
                  <p className="text-[10px] text-slate-400">High performance storage</p>
                </div>
              ) : imagePreview ? (
                <div className="relative w-full h-full group">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white text-xs font-bold">
                    Click or drop to replace
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview("");
                    }}
                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-xs"
                    title="Remove Image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Upload Image</p>
                  <p className="text-[10px] text-slate-400">Drag & drop or click</p>
                </div>
              )}
            </div>
            {imageError && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1">{imageError}</p>
            )}
          </div>

          {/* Core Identification */}
          <div className="md:col-span-2 space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Somali Special Chai Tea 500g"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>

            <div
              className={
                barcodeHidden && skuHidden ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"
              }
            >
              {skuHidden ? (
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={toggleSkuHidden}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-2"
                  >
                    <Eye className="w-3.5 h-3.5" /> Muuji SKU
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      SKU (Item Code){" "}
                      <span className="font-medium normal-case text-slate-400">(Optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={toggleSkuHidden}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
                      title="Hide SKU field"
                    >
                      <EyeOff className="w-3 h-3" /> Qari
                    </button>
                  </div>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => handleSkuChange(e.target.value)}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:bg-white focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              )}

              {barcodeHidden ? (
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={toggleBarcodeHidden}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-2"
                  >
                    <Eye className="w-3.5 h-3.5" /> Muuji Barcode
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Barcode / UPC / EAN{" "}
                      <span className="font-medium normal-case text-slate-400">(Optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={toggleBarcodeHidden}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
                      title="Hide Barcode field"
                    >
                      <EyeOff className="w-3 h-3" /> Qari
                    </button>
                  </div>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => handleBarcodeChange(e.target.value)}
                    placeholder="Scan or type barcode"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:bg-white focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Description / Specifications
                </label>
                <button
                  type="button"
                  onClick={handleAiDescription}
                  disabled={aiLoading}
                  className="text-[11px] font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1 disabled:opacity-50"
                  title="AI ku soo saar sharaxaad"
                >
                  {aiLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {aiLoading ? "AI ayaa qoraya..." : "AI Sharax"}
                </button>
              </div>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Pack sizes, ingredients, packaging details..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
              {aiError && <p className="text-[11px] text-rose-600 font-semibold mt-1">{aiError}</p>}
            </div>
          </div>
        </div>

        {/* Section: Taxonomy (Category, Brand, Unit) */}
        <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Category */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Category *
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCatInput(!showNewCatInput)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>
              {showNewCatInput ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="New Category"
                    className="w-full px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-semibold"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCategory}
                    className="px-2 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shrink-0"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-slate-900"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Brand (Optional, hideable) */}
            {brandHidden ? (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={toggleBrandHidden}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-2"
                >
                  <Eye className="w-3.5 h-3.5" /> Muuji Brand
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Brand / Manufacturer{" "}
                    <span className="font-medium normal-case text-slate-400">(Optional)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewBrandInput(!showNewBrandInput)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> New
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBrandsOpen(true)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Maaree
                    </button>
                    <button
                      type="button"
                      onClick={toggleBrandHidden}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
                      title="Hide Brand field"
                    >
                      <EyeOff className="w-3 h-3" /> Qari
                    </button>
                  </div>
                </div>
                {showNewBrandInput ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      placeholder="New Brand"
                      className="w-full px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-semibold"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddNewBrand}
                      className="px-2 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shrink-0"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-slate-900"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Unit */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Unit of Measure *
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewUnitInput(!showNewUnitInput)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>
              {showNewUnitInput ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newUnitSymbol}
                    onChange={(e) => setNewUnitSymbol(e.target.value)}
                    placeholder="e.g. TRAY"
                    className="w-full px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-semibold uppercase"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddNewUnit}
                    className="px-2 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shrink-0"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold uppercase focus:ring-2 focus:ring-slate-900"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.symbol}>
                      {u.symbol} ({u.name})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Section: Financials, Pricing & Margins */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Financials & Commercial Pricing
            </span>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Margin: {marginPct}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Purchase Cost ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Selling Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Opening Stock ({unit})
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Low Stock Alert
              </label>
              <input
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="5"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60 text-xs font-medium text-emerald-900">
            <div>
              Profit per {unit}:{" "}
              <strong className="font-mono text-emerald-950">${profitPerUnit.toFixed(2)}</strong>
            </div>
            <div>
              Initial Inventory Valuation:{" "}
              <strong className="font-mono text-emerald-950">
                ${((parseInt(stock, 10) || 0) * cost).toFixed(2)}
              </strong>
            </div>
          </div>
        </div>
      </form>

      {/* Brands Management Modal */}
      <BrandsModal isOpen={isBrandsOpen} onClose={() => setIsBrandsOpen(false)} />
    </Modal>
  );
};
