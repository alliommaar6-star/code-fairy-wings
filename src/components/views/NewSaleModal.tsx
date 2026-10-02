import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  UserCheck,
  CheckCircle2,
  Truck,
  Package,
  Store,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Printer,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { DeliveryFields, resolveDelivery } from "../delivery/DeliveryFields";
import { useDelivery, type DeliverySelection } from "../../lib/delivery-store";
import { useStore } from "../../context/StoreContext";
import {
  Product,
  Customer,
  FulfillmentType,
  PaymentMethod,
  PaymentStatus,
  Sale,
} from "../../types";
import { Modal } from "../common/Modal";

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCreated?: (sale: Sale) => void;
  onSaleSuccess?: (sale: Sale) => void;
  initialProductId?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  onSaleCreated,
  onSaleSuccess,
  initialProductId,
}) => {
  const { products, customers, drivers, createSale, currentUser } = useStore();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("cust-walk-in");
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [saleTime, setSaleTime] = useState<string>(
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  );

  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cart, setCart] = useState<CartItem[]>([]);

  const [fulfillment, setFulfillment] = useState<FulfillmentType>("Pickup");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [cargoCompany, setCargoCompany] = useState<string>("Salaama Cargo");
  const [cargoTracking, setCargoTracking] = useState<string>("");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("full_paid");
  const [customPaidAmount, setCustomPaidAmount] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [delSel, setDelSel] = useState<DeliverySelection>({
    locationId: "",
    companyId: "",
    driverId: "",
    payer: "Customer",
  });

  // Default payment per fulfillment: Pickup/Cargo → Full Payment, Delivery → Hormaris (partial).
  useEffect(() => {
    setPaymentStatus(fulfillment === "Delivery" ? "partial_payment" : "full_paid");
  }, [fulfillment]);
  const deliveryStore = useDelivery();
  const del = resolveDelivery(deliveryStore, delSel);
  const effectiveFee =
    fulfillment === "Delivery"
      ? del.customerFee
      : fulfillment === "Cargo"
        ? Number(deliveryFee) || 0
        : 0;

  // Pre-load initial product if passed
  React.useEffect(() => {
    if (initialProductId && products.length > 0) {
      const prod = products.find((p) => p.id === initialProductId);
      if (prod) {
        setCart([{ product: prod, quantity: 1, discount: 0 }]);
      }
    }
  }, [initialProductId, products]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ["All", ...Array.from(set)];
  }, [products]);

  // Filtered products for quick picker
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === "All" || p.category === selectedCategory;
      const matchQuery =
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.barcode && p.barcode.includes(productSearch));
      return matchCat && matchQuery && p.isActive;
    });
  }, [products, selectedCategory, productSearch]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  // Cart actions
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      (prev) =>
        prev
          .map((item) => {
            if (item.product.id === productId) {
              const newQty = item.quantity + delta;
              return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
          })
          .filter(Boolean) as CartItem[],
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  }, [cart]);

  const costOfGoods = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.costPrice * item.quantity, 0);
  }, [cart]);

  const grandTotal = Math.max(0, subtotal - discountAmount + effectiveFee);

  const calculatedPaidAmount = useMemo(() => {
    if (paymentStatus === "full_paid") return grandTotal;
    if (paymentStatus === "full_debt") return 0;
    const custom = parseFloat(customPaidAmount);
    return isNaN(custom) ? 0 : Math.min(grandTotal, custom);
  }, [paymentStatus, grandTotal, customPaidAmount]);

  const remainingBalance = Math.max(0, grandTotal - calculatedPaidAmount);
  const grossProfit = Math.max(0, grandTotal - costOfGoods);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert("Please add at least one product to the sale.");
      return;
    }

    if (fulfillment === "Delivery" && !del.valid) {
      alert("Fadlan dooro Goobta iyo Shirkadda Gaarsiinta.");
      return;
    }

    const saleItems = cart.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      sku: item.product.sku,
      quantity: item.quantity,
      costPrice: item.product.costPrice,
      sellingPrice: item.product.sellingPrice,
      discount: item.discount,
      total: item.product.sellingPrice * item.quantity - item.discount,
    }));

    const newSale = createSale({
      date: saleDate,
      time: saleTime,
      customerId: selectedCustomer?.id || "cust-walk-in",
      customerName: selectedCustomer?.name || "Walk-in (no customer)",
      customerPhone: selectedCustomer?.phone,
      items: saleItems,
      subtotal,
      discount: discountAmount,
      deliveryFee: effectiveFee,
      grandTotal,
      costOfGoods,
      grossProfit,
      amountPaid: calculatedPaidAmount,
      remainingBalance,
      paymentMethod,
      paymentStatus,
      fulfillmentType: fulfillment,
      fulfillmentStatus: fulfillment === "Pickup" ? "Fulfilled" : "Preparing",
      driverId: fulfillment === "Delivery" ? del.driver?.id : undefined,
      driverName: fulfillment === "Delivery" ? del.driver?.name : undefined,
      cargoCompany: fulfillment === "Cargo" ? cargoCompany : undefined,
      trackingNumber: fulfillment === "Cargo" ? cargoTracking : undefined,
      notes:
        fulfillment === "Delivery"
          ? [
              del.loc?.name,
              del.company?.name,
              delSel.payer === "Business" ? `Business pays $${del.amount}` : "",
              notes,
            ]
              .filter(Boolean)
              .join(" · ")
          : notes,
      status: "Completed",
      cashierName: currentUser.name,
    });

    if (onSaleCreated) onSaleCreated(newSale);
    if (onSaleSuccess) onSaleSuccess(newSale);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New sale"
      subtitle="Stock, credit limits, VAT, payment status and the sale reference are managed by the database automatically."
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top bar: Date, Time, Customer selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Sale Date
            </label>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Time
            </label>
            <input
              type="text"
              value={saleTime}
              onChange={(e) => setSaleTime(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Customer
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.balance > 0 ? `(Debt: $${c.balance.toFixed(2)})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Catalog & Cart Split Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Product Selector */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Add Products
              </span>
              <span className="text-xs text-slate-400">
                {filteredProducts.length} items available
              </span>
            </div>

            {/* Search & Category Pills */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search name, SKU, or barcode..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                      selectedCategory === cat
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const inCart = cart.find((i) => i.product.id === p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between text-left ${
                      inCart
                        ? "border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          Stock: {p.stock}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 line-clamp-2 leading-snug">
                        {p.name}
                      </h4>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        ${p.sellingPrice.toFixed(2)}
                      </span>
                      {inCart ? (
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {inCart.quantity}
                        </span>
                      ) : (
                        <span className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Cart & Fulfillment */}
          <div className="lg:col-span-5 bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)
                </span>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Click on products from the left to add items to this sale.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 divide-y divide-slate-200/60">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="pt-2 flex items-center justify-between text-xs"
                    >
                      <div className="flex-1 pr-2 truncate">
                        <div className="font-semibold text-slate-900 truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          ${item.product.sellingPrice.toFixed(2)} / unit
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                        >
                          <Minus className="w-3 h-3 text-slate-700" />
                        </button>
                        <span className="font-bold text-xs w-6 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                        >
                          <Plus className="w-3 h-3 text-slate-700" />
                        </button>
                      </div>

                      <div className="font-bold text-slate-900 w-16 text-right">
                        ${(item.product.sellingPrice * item.quantity).toFixed(2)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-400 hover:text-rose-600 ml-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subtotal & Quick Discount */}
            <div className="mt-4 pt-3 border-t border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Discount ($):</span>
                <input
                  type="number"
                  min="0"
                  step="0.05"
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-20 px-2 py-0.5 text-right bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fulfillment & Payment Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
          {/* Fulfillment Type */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Fulfillment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["Pickup", "Delivery", "Cargo"] as FulfillmentType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFulfillment(type)}
                  className={`py-2 px-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    fulfillment === type
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {type === "Pickup" && <Store className="w-3.5 h-3.5" />}
                  {type === "Delivery" && <Truck className="w-3.5 h-3.5" />}
                  {type === "Cargo" && <Package className="w-3.5 h-3.5" />}
                  {type}
                </button>
              ))}
            </div>

            {/* Delivery Details */}
            {fulfillment === "Delivery" && (
              <div className="mt-2">
                <DeliveryFields value={delSel} onChange={setDelSel} />
              </div>
            )}

            {/* Cargo Details */}
            {fulfillment === "Cargo" && (
              <div className="space-y-2 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs animate-in fade-in">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase">
                      Cargo Company
                    </label>
                    <input
                      type="text"
                      value={cargoCompany}
                      onChange={(e) => setCargoCompany(e.target.value)}
                      placeholder="e.g. Salaama / Tawakal"
                      className="w-full mt-1 p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase">
                      Cargo Fee ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.50"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Tracking # / Waybill Number"
                    value={cargoTracking}
                    onChange={(e) => setCargoTracking(e.target.value)}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Method & Payment Status */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Payment Method & Split
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(["Cash", "EVC Plus", "Sahal", "Premier Bank", "Dahabshiil"] as PaymentMethod[]).map(
                (m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      paymentMethod === m
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {m}
                  </button>
                ),
              )}
            </div>

            <div className="pt-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Payment Terms
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: "full_paid", label: "Full Paid" },
                    { id: "partial_payment", label: "Partial Pay" },
                    { id: "full_debt", label: "Full Debt" },
                  ] as { id: PaymentStatus; label: string }[]
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPaymentStatus(s.id)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      paymentStatus === s.id
                        ? "bg-slate-800 text-lime-400 ring-1 ring-lime-400/40"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {paymentStatus === "partial_payment" && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">Paying now ($):</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={grandTotal}
                    value={customPaidAmount}
                    onChange={(e) => setCustomPaidAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-24 px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Final Financial Summary Panel (As shown in screenshot) */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-center sm:text-left w-full sm:w-auto">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Grand Total</div>
              <div className="text-lg font-black text-white">${grandTotal.toFixed(2)}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Paid On Sale</div>
              <div className="text-lg font-black text-emerald-400">
                ${calculatedPaidAmount.toFixed(2)}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Balance (Debt)</div>
              <div
                className={`text-lg font-black ${
                  remainingBalance > 0 ? "text-rose-400" : "text-slate-400"
                }`}
              >
                ${remainingBalance.toFixed(2)}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Est. Profit</div>
              <div className="text-lg font-black text-lime-400">${grossProfit.toFixed(2)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-confirm-record-sale"
              disabled={cart.length === 0}
              className="px-6 py-2.5 bg-[#bef264] hover:bg-[#a3e635] text-black font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              Record Sale
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
