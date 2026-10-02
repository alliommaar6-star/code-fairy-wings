import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Truck,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { Product, PaymentMethod, PaymentStatus, Sale } from "../../types";

interface PosViewProps {
  onSaleComplete: (sale: Sale) => void;
}

export const PosView: React.FC<PosViewProps> = ({ onSaleComplete }) => {
  const { products, customers, drivers, createSale, currentUser } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);

  // Right-side form controls
  const [customerId, setCustomerId] = useState("cust-walk-in");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [hasDelivery, setHasDelivery] = useState(false);
  const [driverId, setDriverId] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("2.00");
  const [payTerms, setPayTerms] = useState<"full" | "credit" | "partial">("full");
  const [amountPaidCustom, setAmountPaidCustom] = useState("");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");

  const categories = useMemo(() => {
    return ["All", ...Array.from(new Set(products.map((p) => p.category)))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === "All" || p.category === selectedCategory;
      const matchQuery =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery));
      return matchCat && matchQuery && p.isActive;
    });
  }, [products, selectedCategory, searchQuery]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      (prev) =>
        prev
          .map((item) => {
            if (item.product.id === productId) {
              const next = item.quantity + delta;
              return next > 0 ? { ...item, quantity: next } : null;
            }
            return item;
          })
          .filter(Boolean) as { product: Product; quantity: number }[],
    );
  };

  const subtotal = cart.reduce((sum, it) => sum + it.product.sellingPrice * it.quantity, 0);
  const costOfGoods = cart.reduce((sum, it) => sum + it.product.costPrice * it.quantity, 0);
  const discountVal = parseFloat(discount) || 0;
  const deliveryVal = hasDelivery ? parseFloat(deliveryFee) || 0 : 0;
  const grandTotal = Math.max(0, subtotal - discountVal + deliveryVal);

  const amountPaidCalculated = useMemo(() => {
    if (payTerms === "full") return grandTotal;
    if (payTerms === "credit") return 0;
    const custom = parseFloat(amountPaidCustom);
    return isNaN(custom) ? 0 : Math.min(grandTotal, custom);
  }, [payTerms, grandTotal, amountPaidCustom]);

  const balanceDebt = Math.max(0, grandTotal - amountPaidCalculated);
  const grossProfit = Math.max(0, grandTotal - costOfGoods);

  const handleSaveInvoice = () => {
    if (cart.length === 0) {
      alert("Cart is empty. Please select products to sell.");
      return;
    }

    const customer = customers.find((c) => c.id === customerId) || customers[0];
    const driver = drivers.find((d) => d.id === driverId);

    const saleItems = cart.map((it) => ({
      productId: it.product.id,
      productName: it.product.name,
      sku: it.product.sku,
      quantity: it.quantity,
      costPrice: it.product.costPrice,
      sellingPrice: it.product.sellingPrice,
      discount: 0,
      total: it.product.sellingPrice * it.quantity,
    }));

    const paymentStatus: PaymentStatus =
      payTerms === "full" ? "full_paid" : payTerms === "credit" ? "full_debt" : "partial_payment";

    const newSale = createSale({
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: saleItems,
      subtotal,
      discount: discountVal,
      deliveryFee: deliveryVal,
      grandTotal,
      costOfGoods,
      grossProfit,
      amountPaid: amountPaidCalculated,
      remainingBalance: balanceDebt,
      paymentMethod,
      paymentStatus,
      fulfillmentType: hasDelivery ? "Delivery" : "Pickup",
      fulfillmentStatus: hasDelivery ? "Preparing" : "Fulfilled",
      driverId: driver?.id,
      driverName: driver?.name,
      notes,
      status: "Completed",
      cashierName: currentUser.name,
    });

    setCart([]);
    setAmountPaidCustom("");
    onSaleComplete(newSale);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Quick sale
        </h2>
        <p className="text-xs text-slate-500">Scan or click an invoice in seconds.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Product Selector & Live Catalog */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product by name, code or category..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const inCart = cart.find((i) => i.product.id === p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    inCart
                      ? "border-emerald-500 bg-emerald-50/20 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-mono">{p.sku}</span>
                      <span className="font-semibold text-slate-600">Qty: {p.stock}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 line-clamp-2">{p.name}</div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">
                      ${p.sellingPrice.toFixed(2)}
                    </span>
                    {inCart ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {inCart.quantity}
                      </span>
                    ) : (
                      <span className="p-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Checkout Form & Receipt Summary (Matching Screenshot 8) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
            </span>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-[11px] text-rose-600 hover:underline"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart items */}
          {cart.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              Your cart is empty. Click any item on the left to add.
            </div>
          ) : (
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {cart.map((it) => (
                <div
                  key={it.product.id}
                  className="flex items-center justify-between text-xs py-1 border-b border-slate-50"
                >
                  <div className="flex-1 pr-2 truncate">
                    <div className="font-semibold text-slate-800 truncate">{it.product.name}</div>
                    <div className="text-[10px] text-slate-400">
                      ${it.product.sellingPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(it.product.id, -1)}
                      className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                    >
                      <Minus className="w-3 h-3 text-slate-600" />
                    </button>
                    <span className="w-5 text-center font-bold text-xs">{it.quantity}</span>
                    <button
                      onClick={() => updateQuantity(it.product.id, 1)}
                      className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                    >
                      <Plus className="w-3 h-3 text-slate-600" />
                    </button>
                  </div>
                  <div className="w-14 text-right font-bold text-slate-900">
                    ${(it.product.sellingPrice * it.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Customer & Payment Form (Screenshot 8) */}
          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Customer
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.balance > 0 ? `(Debt: $${c.balance.toFixed(2)})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Discount ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.05"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="Cash">Cash</option>
                  <option value="EVC Plus">EVC Plus</option>
                  <option value="Sahal">Sahal</option>
                  <option value="Premier Bank">Premier Bank</option>
                  <option value="Dahabshiil">Dahabshiil</option>
                </select>
              </div>
            </div>

            {/* Delivery checkbox */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={hasDelivery}
                  onChange={(e) => setHasDelivery(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900"
                />
                <span>Add delivery</span>
              </label>

              {hasDelivery && (
                <div className="grid grid-cols-2 gap-2 mt-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <select
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">-- Assign Driver --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.vehicleType})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    placeholder="Fee ($)"
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
              )}
            </div>

            {/* Amount paid / Pay full / Credit */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Payment Terms
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="pos-pay"
                    checked={payTerms === "full"}
                    onChange={() => setPayTerms("full")}
                  />
                  <span>Pay full</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="pos-pay"
                    checked={payTerms === "credit"}
                    onChange={() => setPayTerms("credit")}
                  />
                  <span>All on credit</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="pos-pay"
                    checked={payTerms === "partial"}
                    onChange={() => setPayTerms("partial")}
                  />
                  <span>Partial</span>
                </label>
              </div>

              {payTerms === "partial" && (
                <div className="mt-1">
                  <input
                    type="number"
                    step="0.01"
                    value={amountPaidCustom}
                    onChange={(e) => setAmountPaidCustom(e.target.value)}
                    placeholder="Amount paid now ($)..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional invoice notes..."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Pricing Calculation Summary (Screenshot 8 bottom right) */}
          <div className="pt-3 border-t border-slate-200 space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discountVal > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount:</span>
                <span>-${discountVal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1 border-t border-slate-100">
              <span>Grand Total:</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-700 font-medium">
              <span>Amount Paid:</span>
              <span className="text-emerald-600 font-bold">${amountPaidCalculated.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-xs pt-0.5">
              <span>Balance (Debt):</span>
              <span className={balanceDebt > 0 ? "text-rose-600" : "text-slate-500"}>
                ${balanceDebt.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Save Invoice Button */}
          <button
            id="btn-save-invoice-pos"
            onClick={handleSaveInvoice}
            disabled={cart.length === 0}
            className="w-full py-3 bg-[#1e293b] hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
          >
            <CheckCircle2 className="w-4 h-4 text-lime-400" />
            Save Invoice
          </button>
        </div>
      </div>
    </div>
  );
};
