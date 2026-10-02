import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  Truck,
  Building2,
  Package,
  User,
  Phone,
  MapPin,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { Product, OrderItem, Customer, Order } from "../../types";
import { MOGADISHU_DISTRICTS } from "../../utils/portalConstants";
import { DeliveryFields, resolveDelivery } from "../delivery/DeliveryFields";
import { useDelivery, type DeliverySelection } from "../../lib/delivery-store";
import { nextCode } from "../../utils/codes";
import { PaymentAccountsPicker, type PaySelection } from "./PaymentAccountsPicker";

type PayMode = "partial" | "full" | "debt" | "advance";

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: (order: Order, asSale?: boolean) => void;
  /** "sale" = direct Pickup sale with full payment; "order" = Delivery/Cargo order */
  mode?: "sale" | "order";
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
  mode = "sale",
}) => {
  const isSaleMode = mode === "sale";
  const { products, customers, drivers, createOrder, addCustomer, orders, sales } = useStore();
  const [recordCode, setRecordCode] = useState<string>("");
  const suggestedCode = nextCode("SO", [
    ...orders.map((o) => o.orderNo),
    ...sales.map((s) => s.invoiceNo),
  ]);

  // Customer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState<boolean>(false);
  const [customerFieldsHidden, setCustomerFieldsHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem("benadir_order_customer_fields_hidden") === "1";
    } catch {
      return false;
    }
  });
  const [newCustName, setNewCustName] = useState<string>("");
  const [phonePrefix, setPhonePrefix] = useState<string>("+25261");
  const [newCustPhone, setNewCustPhone] = useState<string>("");
  const [newCustAddress, setNewCustAddress] = useState<string>("");

  // Cart / Items State
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [productSearch, setProductSearch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Fulfillment State
  const [fulfillmentType, setFulfillmentType] = useState<"Pickup" | "Delivery" | "Cargo">(
    "Delivery",
  );
  const [deliveryFee, setDeliveryFee] = useState<number>(2.0);
  const [deliveryFeePayer, setDeliveryFeePayer] = useState<"Customer" | "Business">("Customer");
  const [deliveryDistrict, setDeliveryDistrict] = useState<string>("Hodan");
  const [cargoFee, setCargoFee] = useState<number>(10.0);
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [cargoCompany, setCargoCompany] = useState<string>("Bakaara Express Cargo");

  const [delSel, setDelSel] = useState<DeliverySelection>({
    locationId: "",
    companyId: "",
    driverId: "",
    payer: "Customer",
  });
  const deliveryStore = useDelivery();
  const del = resolveDelivery(deliveryStore, delSel);

  // Financials & Payment
  const [discount, setDiscount] = useState<number>(0);
  const [paidAdvance, setPaidAdvanceRaw] = useState<number>(0);
  const [payMode, setPayMode] = useState<PayMode>("debt");
  const [partialAmount, setPartialAmount] = useState<number>(0);
  const [payAccount, setPayAccount] = useState<PaySelection>(null);
  const setPaidAdvance = (v: number) => {
    setPaidAdvanceRaw(v);
    if (v > 0) setPayMode("advance");
    else setPayMode((m) => (m === "advance" ? "debt" : m));
  };
  const [notes, setNotes] = useState<string>("");

  // Direct sale is always Pickup; an order is Delivery or Cargo.
  useEffect(() => {
    if (!isOpen) return;
    setFulfillmentType(isSaleMode ? "Pickup" : "Delivery");
    setPayMode(isSaleMode ? "full" : "advance");
  }, [isOpen, isSaleMode]);

  // Default payment mode per fulfillment: Pickup/Cargo → Full Payment, Delivery → Hormaris.
  useEffect(() => {
    setPayMode(fulfillmentType === "Delivery" ? "advance" : "full");
  }, [fulfillmentType]);

  // Filtered products
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return ["All", ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.barcode && p.barcode.includes(productSearch));
      const matchCat = selectedCategory === "All" || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, productSearch, selectedCategory]);

  // Pricing calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.total, 0);
  }, [cartItems]);

  const activeFee =
    fulfillmentType === "Delivery" ? del.customerFee : fulfillmentType === "Cargo" ? cargoFee : 0;
  const grandTotal = Math.max(0, subtotal - discount + activeFee);
  const effectivePayMode: PayMode =
    payMode === "advance" && fulfillmentType !== "Delivery" ? "debt" : payMode;
  const effectiveAdvance = Math.min(
    grandTotal,
    effectivePayMode === "full"
      ? grandTotal
      : effectivePayMode === "debt"
        ? 0
        : effectivePayMode === "partial"
          ? partialAmount
          : paidAdvance,
  );
  const remainingBalance = Math.max(0, grandTotal - effectiveAdvance);

  if (!isOpen) return null;

  const handleAddToCart = (product: Product) => {
    const existing = cartItems.find((i) => i.productId === product.id);
    if (existing) {
      setCartItems((prev) =>
        prev.map((i) =>
          i.productId === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                total: (i.quantity + 1) * i.sellingPrice,
              }
            : i,
        ),
      );
    } else {
      const newItem: OrderItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        total: product.sellingPrice,
        imageUrl: product.imageUrl,
      };
      setCartItems((prev) => [...prev, newItem]);
    }
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCartItems(
      (prev) =>
        prev
          .map((i) => {
            if (i.productId === productId) {
              const newQty = i.quantity + delta;
              if (newQty <= 0) return null;
              return {
                ...i,
                quantity: newQty,
                total: newQty * i.sellingPrice,
              };
            }
            return i;
          })
          .filter(Boolean) as OrderItem[],
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const toggleCustomerFields = () => {
    setCustomerFieldsHidden((current) => {
      const next = !current;
      try {
        localStorage.setItem("benadir_order_customer_fields_hidden", next ? "1" : "0");
      } catch {
        /* This display preference is optional. */
      }
      return next;
    });
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      alert("Fadlan ku dar ugu yaraan 1 badeeco dalabka!");
      return;
    }

    let customerId = selectedCustomerId;
    let customerName = "";
    let customerPhone = "";

    if (isAddingNewCustomer && !customerFieldsHidden) {
      const normalizedPhone = newCustPhone.replace(/\D/g, "");
      const created = addCustomer({
        name: newCustName.trim() || "Macmiil Guud",
        phone: normalizedPhone ? `${phonePrefix}${normalizedPhone}` : "",
        address: newCustAddress.trim(),
        balance: 0,
        creditLimit: 500,
        status: "active",
      });
      customerId = created.id;
      customerName = created.name;
      customerPhone = created.phone;
    } else {
      const existing = customers.find((c) => c.id === selectedCustomerId);
      if (existing) {
        customerName = existing.name;
        customerPhone = existing.phone;
      } else {
        customerName = "Walk-in Customer";
        customerPhone = "+252 61 000 0000";
      }
    }

    if (fulfillmentType === "Delivery" && !del.valid) {
      alert("Fadlan dooro Goobta iyo Shirkadda Gaarsiinta.");
      return;
    }
    const isDel = fulfillmentType === "Delivery";
    const adv = effectiveAdvance;
    if (payMode !== "debt" && adv > 0 && !payAccount) {
      alert("Fadlan dooro akoonka lacagta lagu bixiyay.");
      return;
    }

    const newOrder = createOrder({
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      customerId: customerId || "cust-walk-in",
      customerName,
      customerPhone,
      items: cartItems,
      subtotal,
      discount,
      deliveryFee: isDel ? del.customerFee : 0,
      deliveryFeePayer: isDel ? delSel.payer : undefined,
      deliveryRate: isDel ? del.amount : undefined,
      deliveryDistrict: isDel ? del.loc?.district : undefined,
      deliveryLocation: isDel ? del.loc?.name : undefined,
      deliveryCompany: isDel ? del.company?.name : undefined,
      cargoFee: fulfillmentType === "Cargo" ? cargoFee : 0,
      total: grandTotal,
      paidAmount: adv,
      advanceAmount: adv,
      fulfillmentType,
      deliveryAddress: isDel ? deliveryAddress || del.loc?.name : undefined,
      driverId: isDel ? del.driver?.id : undefined,
      driverName: isDel ? del.driver?.name : undefined,
      driverPhone: isDel ? del.driver?.phone : undefined,
      cargoCompany: fulfillmentType === "Cargo" ? cargoCompany : undefined,
      status: adv >= grandTotal ? "confirmed" : "pending",
      paymentType:
        payMode === "full"
          ? "full_payment"
          : payMode === "debt"
            ? "full_credit"
            : "partial_payment",
      paymentMethod: payAccount && payMode !== "debt" ? payAccount.name : undefined,
      paymentProvider: payAccount && payMode !== "debt" ? payAccount.group : undefined,
      notes,
      orderNo: recordCode.trim() || suggestedCode,
    });

    if (onOrderCreated) {
      onOrderCreated(newOrder, isSaleMode);
    }
    setRecordCode("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-6 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-lime-400 text-black flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                {isSaleMode ? "Iib Toos ah (Sale) — Pickup, Lacag Buuxda" : "Dalab Cusub (Order) — Delivery / Cargo"}
              </h2>
              <p className="text-xs text-slate-400">
                {new Date().toLocaleDateString()} ·{" "}
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmitOrder} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Record ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-slate-600 whitespace-nowrap">ID:</label>
              <input
                type="text"
                value={recordCode}
                onChange={(e) => setRecordCode(e.target.value)}
                placeholder={suggestedCode}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold bg-white"
              />
            </div>
          </div>

          {/* STEP 1: Customer Selection */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-500" />
                1. Xogta Macmiilka (Customer Selection)
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingNewCustomer(!isAddingNewCustomer)}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  {isAddingNewCustomer ? "Dooro Macmiil Hore" : "+ Diiwaangeli Macmiil Cusub"}
                </button>
                <button
                  type="button"
                  onClick={toggleCustomerFields}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  {customerFieldsHidden ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                  {customerFieldsHidden ? "Muuji" : "Qari"}
                </button>
              </div>
            </div>

            {customerFieldsHidden ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-xs text-slate-500">
                Xogta macmiilka waa optional waana la qariyay.
              </p>
            ) : isAddingNewCustomer ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Magaca Macmiilka (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="Tusaale: Ahmed Hassan"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Taleefanka (Optional)
                  </label>
                  <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-slate-900">
                    <select
                      aria-label="Furaha taleefanka"
                      value={phonePrefix}
                      onChange={(e) => setPhonePrefix(e.target.value)}
                      className="border-r border-slate-300 bg-slate-100 px-2 py-2 text-xs font-bold outline-none"
                    >
                      {["+25261", "+25277", "+25262", "+25290", "+25263"].map((prefix) => (
                        <option key={prefix} value={prefix}>
                          {prefix}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="XXXXXXX"
                      className="min-w-0 flex-1 px-3 py-2 text-xs outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Degmada (Optional)
                  </label>
                  <select
                    value={newCustAddress}
                    onChange={(e) => {
                      setNewCustAddress(e.target.value);
                      setDeliveryAddress(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    <option value="">Dooro degmada</option>
                    {MOGADISHU_DISTRICTS.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Dooro Macmiilka Jira
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      const c = customers.find((cust) => cust.id === e.target.value);
                      if (c && c.address) setDeliveryAddress(c.address);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    <option value="">Walk-in (Macmiil Guud)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) - Hadhaa: ${c.balance.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Ciwaanka Gaarsiinta (Delivery Address)
                  </label>
                  <select
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    <option value="">Dooro degmada</option>
                    {MOGADISHU_DISTRICTS.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Products & Cart Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Catalog Selector */}
            <div className="lg:col-span-7 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>2. Xulo Badeecadaha (Catalog)</span>
                <span className="text-slate-400 font-normal">{filteredProducts.length} items</span>
              </div>

              {/* Search & Category Filter */}
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Raadi magaca ama SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Grid */}
              <div className="flex-1 overflow-y-auto max-h-56 divide-y divide-slate-200 border border-slate-200 rounded-lg bg-white">
                {filteredProducts.map((p) => {
                  const inCart = cartItems.find((i) => i.productId === p.id);
                  return (
                    <div
                      key={p.id}
                      className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-2xl">
                              📦
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 truncate">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span className="font-mono text-emerald-700 font-bold">
                              ${p.sellingPrice.toFixed(2)}
                            </span>
                            <span>•</span>
                            <span
                              className={p.stock < 5 ? "text-rose-600 font-bold" : "text-slate-400"}
                            >
                              Stock: {p.stock}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddToCart(p)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          inCart
                            ? "bg-lime-400 text-black shadow-xs"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        {inCart ? `Ku dar (${inCart.quantity})` : "Xulo"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Cart Items */}
            <div className="lg:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Dambiisha Dalabka (Cart)</span>
                  <span className="text-slate-500 font-mono font-bold">
                    {cartItems.length} items
                  </span>
                </div>

                {cartItems.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Weli wax badeeco ah laguma darin dambiisha.
                  </div>
                ) : (
                  <div className="overflow-y-auto max-h-56 divide-y divide-slate-200 border border-slate-200 rounded-lg bg-white">
                    {cartItems.map((item) => (
                      <div
                        key={item.productId}
                        className="p-2 flex items-center justify-between text-xs"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-2xl">
                                📦
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-800 truncate">
                              {item.productName}
                            </div>
                            <div className="text-slate-500 font-mono text-[11px]">
                              ${item.sellingPrice.toFixed(2)} x {item.quantity} = $
                              {item.total.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.productId, -1)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-bold font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.productId, 1)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.productId)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Subtotal Preview */}
              <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center text-xs font-semibold text-slate-700">
                <span>Subtotal badeecadaha:</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* STEP 3: Fulfillment Configuration */}
          <div hidden={isSaleMode} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              3. Qaabka Gaarsiinta (Fulfillment Mode)
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                hidden
                onClick={() => setFulfillmentType("Pickup")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-xs font-semibold ${
                  fulfillmentType === "Pickup"
                    ? "bg-amber-500/10 border-amber-500 text-amber-900 ring-2 ring-amber-400"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Package className="w-5 h-5 text-amber-600" />
                <span>Iska Soo Qaad (Pickup)</span>
                <span className="text-[10px] text-slate-400">$0.00 Fee</span>
              </button>

              <button
                type="button"
                onClick={() => setFulfillmentType("Delivery")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-xs font-semibold ${
                  fulfillmentType === "Delivery"
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-900 ring-2 ring-emerald-400"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Truck className="w-5 h-5 text-emerald-600" />
                <span>Gaarsiin Gudaha (Delivery)</span>
                <span className="text-[10px] text-slate-400">Mogadishu Rider</span>
              </button>

              <button
                type="button"
                onClick={() => setFulfillmentType("Cargo")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-xs font-semibold ${
                  fulfillmentType === "Cargo"
                    ? "bg-blue-500/10 border-blue-500 text-blue-900 ring-2 ring-blue-400"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>Cargo Gobolada (Freight)</span>
                <span className="text-[10px] text-slate-400">Inter-city Freight</span>
              </button>
            </div>

            {/* Sub-inputs for Fulfillment */}
            {fulfillmentType === "Delivery" && (
              <DeliveryFields value={delSel} onChange={setDelSel} />
            )}

            {fulfillmentType === "Cargo" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Shirkadda Cargada (Cargo Company)
                  </label>
                  <input
                    type="text"
                    value={cargoCompany}
                    onChange={(e) => setCargoCompany(e.target.value)}
                    placeholder="Bakaara Express, Al-Hilaal..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Lacagta Cargada (Cargo Fee $)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={cargoFee}
                    onChange={(e) => setCargoFee(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 font-mono font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* STEP 4: Financials, Advance Payment & Notes */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              4. Xisaabta & Hormaris (Pricing & Advance Payment)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Qiimo Dhimis (Discount $)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={discount || ""}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono bg-white"
                />
              </div>

              {fulfillmentType === "Delivery" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Hormaris La Bixiyay (Advance / Hormaris $)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={grandTotal}
                    value={paidAdvance || ""}
                    onChange={(e) => setPaidAdvance(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold text-emerald-700 bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Faahfaahin / Fariin (Notes)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tusaale: Soo wac ka hor imaanshaha..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            {/* Qaabka Lacag Bixinta */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 mb-3">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Qaabka Lacag Bixinta
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    ["partial", "Qeyb Kamid Ah"],
                    ["full", "Full Payment"],
                    ["debt", "Full Deyn"],
                    ...(fulfillmentType === "Delivery" ? [["advance", "Hormaris"]] : []),
                  ] as [PayMode, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPayMode(id)}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold transition ${payMode === id ? "bg-slate-900 text-lime-400 border-slate-900" : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {payMode === "partial" && (
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={grandTotal}
                  value={partialAmount || ""}
                  onChange={(e) => setPartialAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Lacagta la bixiyay $"
                  className="mt-2 w-full sm:w-56 px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold"
                />
              )}
              {payMode === "advance" && (
                <div className="mt-2 text-[11px] text-emerald-700 font-semibold">
                  Hormaris: ${paidAdvance.toFixed(2)} (si otomaatig ah looga qaatay qeybta kore)
                </div>
              )}
            </div>

            {/* Payment Accounts */}
            {payMode !== "debt" && (
              <div className="bg-white p-3 rounded-lg border border-slate-200 mb-3">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Akoonka Lacagta Lagu Bixiyay (Payment Account)
                </div>
                <PaymentAccountsPicker value={payAccount} onChange={setPayAccount} />
              </div>
            )}

            {/* Total Summary Strip */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400">Wadarta Guud (Grand Total):</div>
                <div className="text-xl font-mono font-bold text-lime-400">
                  ${grandTotal.toFixed(2)}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400">Hormaris (Paid Advance):</div>
                <div className="text-sm font-mono font-semibold text-emerald-400">
                  ${effectiveAdvance.toFixed(2)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400">Haraaga Dhiman (Remaining Balance):</div>
                <div className="text-base font-mono font-bold text-rose-400">
                  ${remainingBalance.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Ka Noqo (Cancel)
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-lime-400 rounded-xl text-xs font-bold shadow-lg transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-lime-400" />
              Abuur Dalabka (Create Order)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
