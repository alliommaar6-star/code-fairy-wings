import React, { useState } from "react";
import {
  Plus,
  Trash2,
  AlertTriangle,
  Building2,
  DollarSign,
  Package,
  ShoppingBag,
  CreditCard,
  Wallet,
  Calendar,
  X,
  CheckCircle2,
  Paperclip,
  Upload,
  FileText,
  Tag,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { Modal } from "../common/Modal";
import { PurchaseItem, PurchaseAttachment, PurchaseType } from "../../types";
import { calcPurchase } from "@/lib/purchase-calc";

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (purchaseId: string) => void;
  defaultSupplierId?: string;
}

interface ItemRow {
  productId: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  discount: number;
}

export const NewPurchaseModal: React.FC<NewPurchaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultSupplierId,
}) => {
  const { products, suppliers, accounts, createPurchase, addSupplier, checkDuplicateSupplier } =
    useStore();

  const activeSuppliers = suppliers.filter((s) => s.status !== "archived");

  const [supplierId, setSupplierId] = useState<string>(
    defaultSupplierId || activeSuppliers[0]?.id || "",
  );
  const [isQuickSupplier, setIsQuickSupplier] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState("");
  const [quickSupplierPhone, setQuickSupplierPhone] = useState("");
  const [quickSupplierCompany, setQuickSupplierCompany] = useState("");
  const [supplierError, setSupplierError] = useState("");

  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<ItemRow[]>([
    {
      productId: products[0]?.id || "",
      quantity: 10,
      costPrice: products[0]?.costPrice || 1.0,
      sellingPrice: products[0]?.sellingPrice || 1.5,
      discount: 0,
    },
  ]);

  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<"full" | "partial" | "credit">("full");
  const [partialAmount, setPartialAmount] = useState<string>("");
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || "");
  const [paymentProvider, setPaymentProvider] = useState<string>("");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [attachments, setAttachments] = useState<PurchaseAttachment[]>([]);
  const [uploadCategory, setUploadCategory] = useState<"invoice" | "receipt" | "waybill" | "other">(
    "invoice",
  );
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [purchaseType, setPurchaseType] = useState<PurchaseType>("LOCAL");
  const [currency, setCurrency] = useState("USD");
  const [paymentTerms, setPaymentTerms] = useState("Cash");
  const [alreadyReceived, setAlreadyReceived] = useState(false);
  const [dc, setDc] = useState({ alibabaFee: "", chinaFreight: "", mastercardFee: "" });
  const [exp, setExp] = useState({ xamaali: "", transportation: "", other: "", otherNote: "" });
  const [cargo, setCargo] = useState({ cargoCost: "", agentName: "", agentPhone: "", trackingNo: "", cbm: "", shippingMethod: "Sea", expectedArrival: "" });
  const [cexp, setCexp] = useState({ xamaali: "", transportation: "", other: "", otherNote: "" });
  const isIntl = purchaseType === "INTERNATIONAL";
  const num = (v: string) => parseFloat(v) || 0;
  const directCosts = isIntl ? { alibabaFee: num(dc.alibabaFee), chinaFreight: num(dc.chinaFreight), mastercardFee: num(dc.mastercardFee) } : undefined;
  const purchaseExpenses = { xamaali: num(exp.xamaali), transportation: num(exp.transportation), other: num(exp.other), otherNote: exp.otherNote.trim() || undefined };
  const cargoData = isIntl ? {
    cargoCost: num(cargo.cargoCost), agentName: cargo.agentName.trim() || undefined, agentPhone: cargo.agentPhone.trim() || undefined,
    trackingNo: cargo.trackingNo.trim() || undefined, cbm: num(cargo.cbm) || undefined, shippingMethod: cargo.shippingMethod,
    expectedArrival: cargo.expectedArrival || undefined,
    expenses: { xamaali: num(cexp.xamaali), transportation: num(cexp.transportation), other: num(cexp.other), otherNote: cexp.otherNote.trim() || undefined },
  } : undefined;

  // Calculations
  const calculatedItems: (PurchaseItem & { sellingPrice: number })[] = items.map((row) => {
    const prod = products.find((p) => p.id === row.productId);
    const lineTotal = Math.max(0, row.quantity * row.costPrice - (row.discount || 0));
    return {
      productId: row.productId,
      productName: prod ? prod.name : "Unknown Product",
      sku: prod?.sku,
      imageUrl: prod?.imageUrl,
      unit: prod?.unit || "PCS",
      quantity: row.quantity,
      costPrice: row.costPrice,
      sellingPrice: row.sellingPrice || prod?.sellingPrice || 0,
      discount: row.discount || 0,
      total: parseFloat(lineTotal.toFixed(2)),
    };
  });

  const subtotal = parseFloat(calculatedItems.reduce((sum, it) => sum + it.total, 0).toFixed(2));
  const calc = calcPurchase({ purchaseType, items: calculatedItems, discount: orderDiscount, directCosts, expenses: purchaseExpenses, cargo: cargoData });
  const totalAmount = calc.supplierPayable;

  let paidAmount = 0;
  if (paymentType === "full") {
    paidAmount = totalAmount;
  } else if (paymentType === "partial") {
    paidAmount = Math.min(totalAmount, Math.max(0, parseFloat(partialAmount) || 0));
  } else {
    paidAmount = 0;
  }

  const supplierBalance = Math.max(0, parseFloat((totalAmount - paidAmount).toFixed(2)));
  const selectedAccount = accounts.find((a) => a.id === accountId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Url = uploadEvent.target?.result as string;
        const newAttachment: PurchaseAttachment = {
          id: `att-draft-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          category: uploadCategory,
          fileUrl: base64Url,
          fileType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: "Purchasing Officer",
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    }
    // Reset file input value
    e.target.value = "";
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddItem = () => {
    const defaultProd = products[0];
    setItems((prev) => [
      ...prev,
      {
        productId: defaultProd?.id || "",
        quantity: 10,
        costPrice: defaultProd?.costPrice || 1.0,
        sellingPrice: defaultProd?.sellingPrice || 1.5,
        discount: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setErrorMsg("A purchase order must include at least one product.");
      return;
    }
    setErrorMsg("");
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemRow, value: any) => {
    setErrorMsg("");
    setItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index] };

      if (field === "productId") {
        const p = products.find((prod) => prod.id === value);
        current.productId = value;
        if (p) {
          current.costPrice = p.costPrice;
          current.sellingPrice = p.sellingPrice;
        }
      } else if (field === "quantity") {
        current.quantity = Math.max(1, parseInt(value, 10) || 1);
      } else if (field === "costPrice") {
        current.costPrice = Math.max(0, parseFloat(value) || 0);
      } else if (field === "sellingPrice") {
        current.sellingPrice = Math.max(0, parseFloat(value) || 0);
      } else if (field === "discount") {
        current.discount = Math.max(0, parseFloat(value) || 0);
      }

      updated[index] = current;
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSupplierError("");

    // 1. Resolve Supplier
    let targetSupplierId = supplierId;
    let targetSupplierName = "";
    let targetSupplierPhone = "";

    if (isQuickSupplier) {
      if (!quickSupplierName.trim()) {
        setSupplierError("Supplier name is required.");
        return;
      }

      const dup = checkDuplicateSupplier(
        quickSupplierName.trim(),
        quickSupplierPhone.trim(),
        quickSupplierCompany.trim(),
      );
      if (dup) {
        setSupplierError(`A supplier named "${dup.name}" already exists.`);
        return;
      }

      const newSup = addSupplier({
        name: quickSupplierName.trim(),
        company: quickSupplierCompany.trim() || undefined,
        phone: quickSupplierPhone.trim() || "+252 61 000 0000",
        status: "active",
      });
      targetSupplierId = newSup.id;
      targetSupplierName = newSup.name;
      targetSupplierPhone = newSup.phone;
    } else {
      const existing = suppliers.find((s) => s.id === supplierId);
      if (!existing) {
        setErrorMsg("Please select a valid supplier or register a new one.");
        return;
      }
      targetSupplierName = existing.name;
      targetSupplierPhone = existing.phone;
    }

    // 2. Validate Items
    if (items.length === 0) {
      setErrorMsg("Please add at least one line item to the purchase order.");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].productId) {
        setErrorMsg(`Item #${i + 1} has no product selected.`);
        return;
      }
      if (items[i].quantity <= 0) {
        setErrorMsg(`Item #${i + 1} quantity must be greater than zero.`);
        return;
      }
      if (items[i].costPrice < 0) {
        setErrorMsg(`Item #${i + 1} cost price cannot be negative.`);
        return;
      }
    }

    // 3. Payment Account validation if paying
    if (paidAmount > 0 || calc.operationalExpenses > 0) {
      if (!selectedAccount) {
        setErrorMsg("Please select a payment account for this cash outflow.");
        return;
      }
    }

    // 4. Create Purchase Order via authoritative engine
    try {
      const created = createPurchase({
        date,
        supplierId: targetSupplierId,
        supplierName: targetSupplierName,
        supplierPhone: targetSupplierPhone,
        items: calculatedItems,
        subtotal,
        discount: orderDiscount,
        totalAmount,
        paidAmount,
        supplierBalance,
        paymentStatus:
          paidAmount >= totalAmount ? "full_paid" : paidAmount > 0 ? "partial_payment" : "credit",
        paymentMethod: paidAmount > 0 ? selectedAccount?.name : "Supplier Credit",
        paymentProvider:
          paymentProvider.trim() || (paidAmount > 0 ? selectedAccount?.name : undefined),
        accountId: paidAmount > 0 || calc.operationalExpenses > 0 ? selectedAccount?.id : undefined,
        accountName: paidAmount > 0 || calc.operationalExpenses > 0 ? selectedAccount?.name : undefined,
        purchaseType,
        currency,
        paymentTerms,
        directCosts,
        expenses: purchaseExpenses,
        cargo: cargoData,
        referenceNo: referenceNo.trim() || undefined,
        attachments: attachments,
        status: !isIntl || alreadyReceived ? "Received" : "Ordered",
        notes: notes.trim() || undefined,
      });

      onClose();
      if (onSuccess) {
        onSuccess(created.id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create purchase order.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Purchase Order & Inflow"
      subtitle="Restock multi-product inventory, recalculate weighted costs, and settle supplier balances."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Purchase Type */}
        <div className="grid grid-cols-2 gap-2">
          {(["LOCAL", "INTERNATIONAL"] as PurchaseType[]).map((t) => (
            <button key={t} type="button" onClick={() => setPurchaseType(t)}
              className={`rounded-xl border p-3 text-left text-xs font-bold ${purchaseType === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>
              {t === "LOCAL" ? "Local Supplier" : "International Supplier"}
              <div className="mt-0.5 text-[11px] font-normal opacity-80">{t === "LOCAL" ? "Hal maalin: alaab → xamaali → bakhaar" : "Alibaba/China → Cargo → Bakhaar"}</div>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label className="text-[11px] font-semibold text-muted-foreground">Currency
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground">
              <option>USD</option><option>SOS</option><option>CNY</option></select></label>
          <label className="text-[11px] font-semibold text-muted-foreground">Payment Terms
            <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground">
              <option>Cash</option><option>Partial</option><option>Credit</option><option>Advance</option></select></label>
          {isIntl && <label className="col-span-2 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground sm:col-span-1">
            <input type="checkbox" checked={alreadyReceived} onChange={(e) => setAlreadyReceived(e.target.checked)} /> Already arrived &amp; received</label>}
        </div>

        {/* Section 1: Supplier & Date */}
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Supplier / Vendor Information
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsQuickSupplier(!isQuickSupplier);
                setSupplierError("");
              }}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {isQuickSupplier ? "← Select Existing Supplier" : "+ Quick Add New Supplier"}
            </button>
          </div>

          {!isQuickSupplier ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Registered Supplier *
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  {activeSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.company ? `(${s.company})` : ""} • Current Due: $
                      {s.balance.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Invoice / Receipt Date *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {supplierError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-600 font-semibold">
                  {supplierError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Vendor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={quickSupplierName}
                    onChange={(e) => setQuickSupplierName(e.target.value)}
                    placeholder="e.g. Al-Nuur Trading"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={quickSupplierPhone}
                    onChange={(e) => setQuickSupplierPhone(e.target.value)}
                    placeholder="+252 61..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    value={quickSupplierCompany}
                    onChange={(e) => setQuickSupplierCompany(e.target.value)}
                    placeholder="Wholesale Co."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Line Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Products & Cost Layers ({items.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" />
              Add Another Line
            </button>
          </div>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {items.map((row, idx) => {
              const selectedProduct = products.find((p) => p.id === row.productId);
              const lineTotal = Math.max(0, row.quantity * row.costPrice - (row.discount || 0));

              return (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      Line #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="text-slate-400 hover:text-rose-500 disabled:opacity-30 p-1 transition-colors"
                      title="Remove row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    {/* Product Selector */}
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        Product
                      </label>
                      <select
                        value={row.productId}
                        onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.unit}) - Stock: {p.stock}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        Quantity ({selectedProduct?.unit || "PCS"})
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={row.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                      />
                    </div>

                    {/* Cost Price */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        Unit Cost ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={row.costPrice}
                        onChange={(e) => handleItemChange(idx, "costPrice", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                      />
                    </div>

                    {/* Selling Price */}
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        Selling Price ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.sellingPrice}
                        onChange={(e) => handleItemChange(idx, "sellingPrice", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                        title="Update future retail selling price"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500">
                      Weighted cost will update automatically on receipt
                    </span>
                    <span className="font-bold text-slate-800">
                      Line Total:{" "}
                      <strong className="font-black text-slate-900">${lineTotal.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        {isIntl && (
          <div className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Purchase Costs <span className="font-normal normal-case">(Cost — waxay galaan unit cost)</span></h3>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-[11px] font-semibold text-muted-foreground">Alibaba Fee<input type="number" min="0" step="0.01" value={dc.alibabaFee} onChange={(e) => setDc({ ...dc, alibabaFee: e.target.value })} placeholder="0.00" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" /></label>
              <label className="text-[11px] font-semibold text-muted-foreground">China Local Freight<input type="number" min="0" step="0.01" value={dc.chinaFreight} onChange={(e) => setDc({ ...dc, chinaFreight: e.target.value })} placeholder="0.00" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" /></label>
              <label className="text-[11px] font-semibold text-muted-foreground">Mastercard Fee<input type="number" min="0" step="0.01" value={dc.mastercardFee} onChange={(e) => setDc({ ...dc, mastercardFee: e.target.value })} placeholder="0.00" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" /></label>
            </div>
          </div>
        )}
        {isIntl && (
          <div className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Cargo / Shipment <span className="font-normal normal-case">(Cargo cost = Cost)</span></h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <label className="text-[11px] font-semibold text-muted-foreground">Cargo Cost<input type="number" min="0" step="0.01" value={cargo.cargoCost} onChange={(e) => setCargo({ ...cargo, cargoCost: e.target.value })} placeholder="0.00" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" /></label>
              <label className="text-[11px] font-semibold text-muted-foreground">Cargo Agent<input type="text" value={cargo.agentName} onChange={(e) => setCargo({ ...cargo, agentName: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" /></label>
              <label className="text-[11px] font-semibold text-muted-foreground">Agent Phone<input type="text" value={cargo.agentPhone} onChange={(e) => setCargo({ ...cargo, agentPhone: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" /></label>
              <label className="text-[11px] font-semibold text-muted-foreground">Tracking No<input type="text" value={cargo.trackingNo} onChange={(e) => setCargo({ ...cargo, trackingNo: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" /></label>
              <label className="text-[11px] font-semibold text-muted-foreground">CBM<input type="number" min="0" step="0.01" value={cargo.cbm} onChange={(e) => setCargo({ ...cargo, cbm: e.target.value })} placeholder="0.00" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" /></label>
              <label className="text-[11px] font-semibold text-muted-foreground">Method<select value={cargo.shippingMethod} onChange={(e) => setCargo({ ...cargo, shippingMethod: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"><option>Sea</option><option>Air</option><option>Land</option></select></label>
              <label className="text-[11px] font-semibold text-muted-foreground">Expected Arrival<input type="date" value={cargo.expectedArrival} onChange={(e) => setCargo({ ...cargo, expectedArrival: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" /></label>
            </div>
          </div>
        )}
        {isIntl ? (
          <div className="space-y-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-destructive">Cargo Expenses <span className="font-normal normal-case">(Expense — kuma darsamo unit cost)</span></h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="text-[11px] font-semibold text-muted-foreground">Xamaali<input type="number" min="0" step="0.01" value={cexp.xamaali} onChange={(e) => setCexp({ ...cexp, xamaali: e.target.value })} placeholder="0.00" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" /></label>
            <label className="text-[11px] font-semibold text-muted-foreground">Transportation<input type="number" min="0" step="0.01" value={cexp.transportation} onChange={(e) => setCexp({ ...cexp, transportation: e.target.value })} placeholder="0.00" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" /></label>
            <label className="text-[11px] font-semibold text-muted-foreground">Other<input type="number" min="0" step="0.01" value={cexp.other} onChange={(e) => setCexp({ ...cexp, other: e.target.value })} placeholder="0.00" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" /></label>
            <label className="text-[11px] font-semibold text-muted-foreground">Other note<input type="text" value={cexp.otherNote} onChange={(e) => setCexp({ ...cexp, otherNote: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" /></label>
          </div>
        </div>
        ) : (
          <div className="space-y-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-destructive">Purchase Expenses <span className="font-normal normal-case">(Expense — kuma darsamo unit cost)</span></h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="text-[11px] font-semibold text-muted-foreground">Xamaali<input type="number" min="0" step="0.01" value={exp.xamaali} onChange={(e) => setExp({ ...exp, xamaali: e.target.value })} placeholder="0.00" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" /></label>
            <label className="text-[11px] font-semibold text-muted-foreground">Transportation<input type="number" min="0" step="0.01" value={exp.transportation} onChange={(e) => setExp({ ...exp, transportation: e.target.value })} placeholder="0.00" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" /></label>
            <label className="text-[11px] font-semibold text-muted-foreground">Other<input type="number" min="0" step="0.01" value={exp.other} onChange={(e) => setExp({ ...exp, other: e.target.value })} placeholder="0.00" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" /></label>
            <label className="text-[11px] font-semibold text-muted-foreground">Other note<input type="text" value={exp.otherNote} onChange={(e) => setExp({ ...exp, otherNote: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground" /></label>
          </div>
        </div>
        )}

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-4 text-xs sm:grid-cols-4">
          <div><div className="text-muted-foreground">Product Cost</div><div className="font-bold text-foreground">${calc.productCost.toFixed(2)}</div></div>
          <div><div className="text-muted-foreground">Landed Cost (COST)</div><div className="font-bold text-primary">${calc.landedCost.toFixed(2)}</div><div className="text-[10px] text-muted-foreground">Unit: ${calc.avgLandedUnitCost.toFixed(2)}</div></div>
          <div><div className="text-muted-foreground">Expenses</div><div className="font-bold text-destructive">${calc.operationalExpenses.toFixed(2)}</div></div>
          <div><div className="text-muted-foreground">Total Cash Outflow</div><div className="font-black text-foreground">${calc.totalCashOutflow.toFixed(2)}</div><div className="text-[10px] text-muted-foreground">Supplier owed: ${calc.supplierPayable.toFixed(2)}</div></div>
        </div>

        {/* Section 3: Totals, Discounts & Settlement */}
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Payment Terms & Settlement Architecture
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentType("full")}
              className={`p-3 rounded-xl border text-left transition-all ${
                paymentType === "full"
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black">Full Payment</span>
                {paymentType === "full" && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
              <p
                className={`text-[11px] ${paymentType === "full" ? "text-slate-300" : "text-slate-400"}`}
              >
                100% settled from account
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPaymentType("partial")}
              className={`p-3 rounded-xl border text-left transition-all ${
                paymentType === "partial"
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black">Partial Down Payment</span>
                {paymentType === "partial" && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
              <p
                className={`text-[11px] ${paymentType === "partial" ? "text-slate-300" : "text-slate-400"}`}
              >
                Down payment + credit balance
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPaymentType("credit")}
              className={`p-3 rounded-xl border text-left transition-all ${
                paymentType === "credit"
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black">100% Supplier Credit</span>
                {paymentType === "credit" && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
              <p
                className={`text-[11px] ${paymentType === "credit" ? "text-slate-300" : "text-slate-400"}`}
              >
                Added to Accounts Payable
              </p>
            </button>
          </div>

          {/* Conditional inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {paymentType === "partial" && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Immediate Down Payment Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={totalAmount}
                  required
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder="e.g. 150.00"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
            )}

            {paymentType !== "credit" && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Pay From Commercial Account *
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type}) • Current Balance: ${acc.balance.toFixed(2)}
                    </option>
                  ))}
                </select>
                {selectedAccount && paidAmount > selectedAccount.balance && (
                  <p className="mt-1 text-[11px] font-semibold text-amber-600">
                    ⚠️ Notice: Paying ${paidAmount.toFixed(2)} exceeds account balance ($
                    {selectedAccount.balance.toFixed(2)}). Balance will become negative.
                  </p>
                )}
              </div>
            )}

            {paymentType !== "credit" && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Payment Method / Provider
                </label>
                <input
                  type="text"
                  value={paymentProvider}
                  onChange={(e) => setPaymentProvider(e.target.value)}
                  placeholder="e.g. Bank Wire, EVC Plus, Cheque #091"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Reference Number & Discounts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Supplier Invoice / Ref #
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. INV-2026-9901"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Supplier Discount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={orderDiscount || ""}
                onChange={(e) => setOrderDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Internal Memo / Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Container shipment ref #8841"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Attachments Section */}
          <div className="pt-2 border-t border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Document Attachments & Receipts ({attachments.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as any)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700"
                >
                  <option value="invoice">Supplier Invoice</option>
                  <option value="receipt">Payment Receipt</option>
                  <option value="waybill">Waybill / Delivery Note</option>
                  <option value="other">Other Document</option>
                </select>
                <label className="cursor-pointer px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors">
                  <Upload className="w-3 h-3" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx"
                    multiple
                  />
                </label>
              </div>
            </div>

            {attachments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate text-[11px]">
                          {att.name}
                        </p>
                        <span className="text-[9px] uppercase font-bold text-slate-400">
                          {att.category} •{" "}
                          {att.sizeBytes ? `${Math.round(att.sizeBytes / 1024)} KB` : "Attached"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                Optional: Attach invoice photos, bank slips, or customs clearance docs.
              </p>
            )}
          </div>

          {/* Breakdown summary */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal ({calculatedItems.reduce((s, it) => s + it.quantity, 0)} units):</span>
              <span className="font-bold text-slate-800">${subtotal.toFixed(2)}</span>
            </div>
            {orderDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Supplier Discount:</span>
                <span>-${orderDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-100">
              <span>Total Purchase Amount:</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-700 text-[11px] pt-1 border-t border-slate-100">
              <span>Immediate Paid Outflow:</span>
              <span className="font-bold text-emerald-600">${paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-700 text-[11px]">
              <span>Remaining Supplier Due (A/P):</span>
              <span
                className={`font-black ${
                  supplierBalance > 0 ? "text-amber-600" : "text-slate-500"
                }`}
              >
                ${supplierBalance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            Receive PO & Restock Inventory
          </button>
        </div>
      </form>
    </Modal>
  );
};
