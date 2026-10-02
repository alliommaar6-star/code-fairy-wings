import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  Phone,
  Share2,
  Copy,
  Check,
  Building2,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  ChevronRight,
  Smartphone,
  Info,
  X,
  Plus,
  Minus,
  ShoppingCart,
  Receipt,
  RotateCcw,
  Sparkles,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Car,
} from 'lucide-react';
import { Order, OrderItem, Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import {
  generateUssdCode,
  getOrderTrackingStages,
  buildWhatsAppShareUrl,
  MOGADISHU_DISTRICTS,
} from '../../utils/portalConstants';

interface CustomerPortalViewProps {
  order: Order;
  isStandalone?: boolean;
  onClose?: () => void;
  onNavigateToOrder?: (order: Order) => void;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  order,
  isStandalone = false,
  onClose,
  onNavigateToOrder,
}) => {
  const {
    products,
    orders,
    drivers,
    currentUser,
    confirmOrderPaymentByCustomer,
    verifyOrderPayment,
    rejectOrderPayment,
    completeOrder,
    assignDriverToOrder,
    updateOrderFulfillmentStage,
    createOrder,
    generateCustomerPortalUrl,
  } = useStore();

  // Active portal tab: 'current' | 'history' | 'shop'
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'shop'>('current');

  // Accidental exit safeguard state
  const [exitAttempts, setExitAttempts] = useState<number>(0);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  // Payment flow splash state
  // 'idle' -> 'method_select' -> 'confirm_prompt' -> 'ussd_active'
  const [paymentStep, setPaymentStep] = useState<'idle' | 'method_select' | 'confirm_prompt' | 'ussd_active'>('idle');
  const [paymentTypeChoice, setPaymentTypeChoice] = useState<'advance' | 'full'>('full');
  const [selectedMethod, setSelectedMethod] = useState<'EVC Plus' | 'E-Dahab' | 'Jeeb'>('EVC Plus');
  const [senderPhoneInput, setSenderPhoneInput] = useState<string>(order.customerPhone || '');
  const [transactionRefInput, setTransactionRefInput] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);
  const [copiedUssd, setCopiedUssd] = useState<boolean>(false);

  // Admin verification action states
  const [showAdminRejectModal, setShowAdminRejectModal] = useState<boolean>(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [adminVerificationRef, setAdminVerificationRef] = useState<string>('');

  // Re-order / Continue Shopping Cart state
  const [shopCart, setShopCart] = useState<Record<string, number>>({});
  const [shopSearch, setShopSearch] = useState<string>('');
  const [isPlacingShopOrder, setIsPlacingShopOrder] = useState<boolean>(false);
  const [shopDeliveryFeePayer, setShopDeliveryFeePayer] = useState<'Customer' | 'Business'>('Customer');

  // PWA Install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Check if iOS
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIos) {
        setShowIosGuide(true);
      } else {
        alert('Si aad app-ka ugu darto shaashaddaada, taabo saddexda dhibcood ee browser-kaaga oo dooro "Add to Home Screen" ama "Install App".');
      }
    }
  };

  // Real-time authoritative computations
  const subtotalAfterDiscount = Math.max(0, order.subtotal - order.discount);
  const remainingBalance = Math.max(0, order.total - order.paidAmount);
  const isFullyPaid = remainingBalance <= 0;

  // Auto-open payment splash popup on link load if balance remains & not yet confirmed
  const [isPaymentSplashOpen, setIsPaymentSplashOpen] = useState<boolean>(() => {
    return remainingBalance > 0 && order.paymentStatus !== 'customer_confirmed';
  });
  const [splashExitConfirm, setSplashExitConfirm] = useState<boolean>(false);
  const [showInitialSplash, setShowInitialSplash] = useState<boolean>(true);
  const [hasCustomerPaidChoice, setHasCustomerPaidChoice] = useState<'unanswered' | 'yes' | 'no'>('unanswered');

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInitialSplash(false);
    }, 1100);
    return () => clearTimeout(timer);
  }, []);

  // Selected payment amount
  const paymentAmountToPay = useMemo(() => {
    if (paymentTypeChoice === 'advance') {
      // If order has an advanceAmount configured and it hasn't been paid yet
      if (order.advanceAmount && order.paidAmount < order.advanceAmount) {
        return Math.min(remainingBalance, order.advanceAmount - order.paidAmount);
      }
      // Default advance: 50% of remaining, or at least delivery fee + 30%, rounded up
      const fee = (order.deliveryFeePayer || 'Customer') === 'Customer' ? order.deliveryFee : 0;
      const half = Math.ceil(remainingBalance * 0.5);
      return Math.max(1, Math.min(remainingBalance, Math.max(fee, half)));
    }
    return remainingBalance;
  }, [paymentTypeChoice, order, remainingBalance]);

  const ussdInfo = useMemo(() => {
    return generateUssdCode(selectedMethod, paymentAmountToPay);
  }, [selectedMethod, paymentAmountToPay]);

  const trackingStages = useMemo(() => {
    return getOrderTrackingStages(order);
  }, [order]);

  // Customer's other orders for History tab
  const customerOrders = useMemo(() => {
    if (!order.customerId && !order.customerPhone) return [order];
    return orders.filter(
      (o) =>
        (order.customerId && o.customerId === order.customerId) ||
        (order.customerPhone && o.customerPhone && o.customerPhone === order.customerPhone)
    );
  }, [orders, order]);

  // Handle Accidental Exit Safeguard
  const handleExitRequest = () => {
    if (exitAttempts === 0) {
      setExitAttempts(1);
      setShowExitConfirm(true);
    } else {
      // Confirmed exit
      if (onClose) {
        onClose();
      } else {
        window.location.href = '/';
      }
    }
  };

  // Copy USSD
  const handleCopyUssd = () => {
    navigator.clipboard.writeText(ussdInfo.code);
    setCopiedUssd(true);
    setTimeout(() => setCopiedUssd(false), 2500);
  };

  // Submit Payment Confirmation by Customer
  const handleCustomerSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (order.paymentStatus === 'customer_confirmed') {
      alert('Lacag bixintaada mar hore ayaa la diray oo maamulku ku jiraa xaqiijinteeda!');
      return;
    }

    setIsSubmittingPayment(true);
    confirmOrderPaymentByCustomer(
      order.id,
      paymentAmountToPay,
      paymentTypeChoice,
      selectedMethod,
      senderPhoneInput.trim(),
      transactionRefInput.trim() || undefined
    );
    setIsSubmittingPayment(false);
    setPaymentStep('idle');
  };

  // Admin Verification Handlers
  const handleAdminVerify = () => {
    verifyOrderPayment(order.id, adminVerificationRef || undefined);
    setAdminVerificationRef('');
  };

  const handleAdminReject = () => {
    if (!rejectionReasonInput.trim()) {
      alert('Fadlan geli sababta diidmada (tusaale: SMS lama helin / lacagtu ma soo dhicin)');
      return;
    }
    rejectOrderPayment(order.id, rejectionReasonInput.trim());
    setShowAdminRejectModal(false);
    setRejectionReasonInput('');
  };

  const handleAdminCompleteOrder = () => {
    completeOrder(order.id);
  };

  // Continue Shopping / Reorder Logic
  const handleAddToCart = (prodId: string) => {
    setShopCart((prev) => ({
      ...prev,
      [prodId]: (prev[prodId] || 0) + 1,
    }));
  };

  const handleRemoveFromCart = (prodId: string) => {
    setShopCart((prev) => {
      const copy = { ...prev };
      if (copy[prodId] > 1) {
        copy[prodId] -= 1;
      } else {
        delete copy[prodId];
      }
      return copy;
    });
  };

  const shopTotal = useMemo(() => {
    return Object.entries(shopCart).reduce((sum, [prodId, qty]) => {
      const prod = products.find((p) => p.id === prodId);
      return sum + (prod ? prod.sellingPrice * qty : 0);
    }, 0);
  }, [shopCart, products]);

  const handlePlaceReorder = () => {
    const items: OrderItem[] = Object.entries(shopCart)
      .map(([prodId, qty]) => {
        const prod = products.find((p) => p.id === prodId);
        if (!prod) return null;
        return {
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          sellingPrice: prod.sellingPrice,
          costPrice: prod.costPrice,
          total: prod.sellingPrice * qty,
        };
      })
      .filter(Boolean) as OrderItem[];

    if (items.length === 0) return;

    setIsPlacingShopOrder(true);

    const deliveryFee = 2.0;
    const effectiveFee = shopDeliveryFeePayer === 'Customer' ? deliveryFee : 0;
    const grandTotal = shopTotal + effectiveFee;

    const newOrder = createOrder({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items,
      subtotal: shopTotal,
      discount: 0,
      deliveryFee: effectiveFee,
      deliveryFeePayer: shopDeliveryFeePayer,
      cargoFee: 0,
      total: grandTotal,
      paidAmount: 0,
      advanceAmount: 0,
      fulfillmentType: 'Delivery',
      deliveryDistrict: order.deliveryDistrict || 'Hodan',
      deliveryAddress: order.deliveryAddress,
      status: 'pending',
      paymentStatus: 'unpaid',
      notes: 'Customer reordered via Customer Portal',
    });

    setIsPlacingShopOrder(false);
    setShopCart({});
    setActiveTab('current');

    if (onNavigateToOrder) {
      onNavigateToOrder(newOrder);
    }
  };

  const filteredShopProducts = useMemo(() => {
    return products.filter((p) => {
      const match =
        p.name.toLowerCase().includes(shopSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(shopSearch.toLowerCase());
      return match && p.isActive !== false;
    });
  }, [products, shopSearch]);

  const isAdmin = currentUser && currentUser.role !== 'Cashier';

  return (
    <div
      id="customer-portal-root"
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center selection:bg-lime-400 selection:text-slate-950 font-sans ${
        isStandalone ? 'w-full' : 'w-full max-w-2xl mx-auto rounded-3xl shadow-2xl overflow-hidden my-auto'
      }`}
    >
      {/* PWA / iOS Install Banner */}
      {!isInstalled && (
        <div className="w-full bg-linear-to-r from-lime-500 to-emerald-500 text-slate-950 px-4 py-2.5 flex items-center justify-between text-xs font-bold shadow-md">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>Ku dar Shaashadda Teleefankaaga (PWA App)</span>
          </div>
          <button
            id="btn-pwa-install-banner"
            onClick={handleInstallClick}
            className="px-3 py-1 bg-slate-950 text-lime-400 hover:bg-slate-900 rounded-full text-[11px] font-extrabold uppercase tracking-wide transition shrink-0"
          >
            Ku Dar (Install)
          </button>
        </div>
      )}

      {/* iOS Installation Instructions Guide */}
      {showIosGuide && (
        <div className="w-full bg-slate-900 border-b border-slate-800 p-4 text-xs space-y-2 text-slate-300">
          <div className="flex items-center justify-between">
            <span className="font-bold text-lime-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Habka iPhone (iOS)
            </span>
            <button onClick={() => setShowIosGuide(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <ol className="list-decimal pl-5 space-y-1 text-slate-300">
            <li>Guji astaanta <strong>Share</strong> (sanduuqa falladdu ka soo baxdo) ee hoose Safari.</li>
            <li>Hoos u deg oo taabo <strong>Add to Home Screen (Ku dar shaashadda)</strong>.</li>
            <li>Taabo <strong>Add</strong> dhanka midig ee sare.</li>
          </ol>
        </div>
      )}

      {/* Accidental Exit Safeguard Dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Ma hubtaa inaad ka baxdo lacag bixinta?
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Dalabkaagu waa diiwaangashan yahay. Mar kasta waad dib ugu soo laaban kartaa linkigan si aad u bixiso ama ula socoto gaarsiinta.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                id="btn-safeguard-stay"
                onClick={() => setShowExitConfirm(false)}
                className="py-3 px-4 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition uppercase tracking-wider"
              >
                KA NOQO
              </button>
              <button
                id="btn-safeguard-confirm-exit"
                onClick={handleExitRequest}
                className="py-3 px-4 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 transition uppercase tracking-wider"
              >
                HAA, KA BAX
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN BRANDED OPENING SPLASH SCREEN (1.1s) */}
      {showInitialSplash && (
        <div className="fixed inset-0 z-[70] bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-3xl bg-lime-400 text-slate-950 flex items-center justify-center shadow-2xl shadow-lime-400/30 font-black text-2xl animate-pulse">
              <CreditCard className="w-10 h-10 text-slate-950" />
            </div>
            <div className="absolute -inset-2 rounded-3xl border-2 border-lime-400/30 animate-ping pointer-events-none" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-bold text-lime-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>BANADIR STORE</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Lacag Bixinta Dalabka
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Dalabka: <strong className="text-white">#{order.orderNo}</strong>
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-lime-400 rounded-full animate-pulse" />
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Bogga bixinta tooska ah ayaa furmaya...
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIRECT CUSTOMER PAYMENT SPLASH SCREEN POPUP MODAL (WAA IN PAYMENT-KU TOOS U SOO BOODAA) */}
      {/* ========================================================================= */}
      {isPaymentSplashOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div
            id="customer-payment-splash-modal"
            className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl my-auto text-slate-100 flex flex-col max-h-[92vh] relative"
          >
            {/* Splash Top Bar */}
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shadow-md shadow-rose-600/30">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                      Lacag Bixin Degdeg ah
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  </div>
                  <h2 className="text-sm font-black text-white leading-none mt-0.5">
                    Shaashadda Bixinta Dalabka
                  </h2>
                </div>
              </div>

              <button
                id="btn-close-splash-popup"
                onClick={() => {
                  if (exitAttempts === 0) {
                    setSplashExitConfirm(true);
                  } else {
                    setIsPaymentSplashOpen(false);
                  }
                }}
                className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition"
                title="Xir oo Arag Gaarsiinta"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Exit Confirmation Guard inside Splash */}
            {splashExitConfirm && (
              <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Ma hubtaa inaad ka baxdo lacag bixinta?
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                    Waad xiri kartaa si aad u aragto 9-ka marxaladood ee gaarsiinta iyo alaabta. Mar kasta waad dib ugu soo laaban kartaa bixinta lacagta.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-xs pt-1">
                  <button
                    id="btn-splash-stay-payment"
                    onClick={() => setSplashExitConfirm(false)}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition uppercase tracking-wider"
                  >
                    KA NOQO
                  </button>
                  <button
                    id="btn-splash-exit-payment"
                    onClick={() => {
                      setSplashExitConfirm(false);
                      setIsPaymentSplashOpen(false);
                      setExitAttempts((prev) => prev + 1);
                    }}
                    className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition uppercase tracking-wider"
                  >
                    HAA, KA BAX
                  </button>
                </div>
              </div>
            )}

            {/* Splash Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* If Payment Was Already Confirmed By Customer */}
              {order.paymentStatus === 'customer_confirmed' ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      Lacag Bixintaada Waa La Gudbiyay!
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                      Waxaad bixisay <strong className="text-white">${order.customerConfirmedPayment?.amount.toFixed(2) || order.total.toFixed(2)}</strong> via <strong className="text-lime-400">{order.customerConfirmedPayment?.method || 'Mobile Money'}</strong>. Maamulku hadda ayuu xaqiijinayaa.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsPaymentSplashOpen(false)}
                    className="py-3 px-6 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black uppercase tracking-wider text-xs transition shadow-md shadow-lime-400/20"
                  >
                    Kala Soco Halka Uu Marayo Dalabkaaga
                  </button>
                </div>
              ) : paymentStep === 'confirm_prompt' ? (
                /* STEP 2: PROMPT TO DIAL USSD */
                <div className="space-y-4 py-2 text-center animate-in fade-in">
                  <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center mx-auto">
                    <Smartphone className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-white leading-relaxed">
                      Ma rabtaa inaad u dirto Banadir Store <span className="text-lime-400 text-base">${paymentAmountToPay.toFixed(2)}</span>?
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Dooro adeegga lacag bixinta ee aad isticmaalayso:
                    </p>
                  </div>

                  {/* Payment Methods */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-left">
                    {(['EVC Plus', 'E-Dahab', 'Jeeb'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setSelectedMethod(method)}
                        className={`p-2.5 rounded-xl border text-center transition ${
                          selectedMethod === method
                            ? 'border-lime-400 bg-lime-400/15 text-white ring-1 ring-lime-400 font-bold'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <p className="text-xs font-black">{method}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                          {method === 'EVC Plus' ? '*712*' : method === 'E-Dahab' ? '*110*' : '*812*'}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Yes / No Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setPaymentStep('idle')}
                      className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition uppercase tracking-wider"
                    >
                      MAYA (Dib u noqo)
                    </button>
                    <a
                      href={ussdInfo.telUrl}
                      onClick={() => setPaymentStep('ussd_active')}
                      className="py-3.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-black transition uppercase tracking-wider flex items-center justify-center gap-1 shadow-lg shadow-lime-400/20"
                    >
                      <span>HAA (Wac Hadda)</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ) : paymentStep === 'ussd_active' ? (
                /* STEP 3: ACTIVE USSD CODE & CONFIRMATION QUESTION */
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-lime-400 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" /> Bixinta USSD ({selectedMethod})
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentStep('idle');
                        setHasCustomerPaidChoice('unanswered');
                      }}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      Dib u noqo
                    </button>
                  </div>

                  {/* USSD Box */}
                  <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <span className="font-mono text-sm font-black text-lime-400 tracking-wider select-all">
                      {ussdInfo.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyUssd}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
                      >
                        {copiedUssd ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUssd ? 'Waa La Koobiyeeyay' : 'Koobiyee'}</span>
                      </button>
                      <a
                        href={ussdInfo.telUrl}
                        className="px-3 py-1.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-black transition flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Wac</span>
                      </a>
                    </div>
                  </div>

                  {/* PROMPT REQUIREMENT #14: MA BIXISAY LACAGTA? */}
                  {hasCustomerPaidChoice === 'unanswered' ? (
                    <div className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 text-center space-y-3">
                      <h4 className="text-sm font-black text-white uppercase tracking-wide">
                        MA BIXISAY LACAGTA?
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Haddii aad teleefankaaga ka dirtay lacagta (${paymentAmountToPay.toFixed(2)} via {selectedMethod}), fadlan dooro:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <button
                          id="btn-customer-paid-yes"
                          type="button"
                          onClick={() => setHasCustomerPaidChoice('yes')}
                          className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>HAA — WAXAAN BIXIYAY</span>
                        </button>
                        <button
                          id="btn-customer-paid-no"
                          type="button"
                          onClick={() => setHasCustomerPaidChoice('no')}
                          className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition"
                        >
                          MAYA
                        </button>
                      </div>
                    </div>
                  ) : hasCustomerPaidChoice === 'no' ? (
                    <div className="p-4 bg-slate-950/90 rounded-2xl border border-amber-500/30 text-center space-y-3">
                      <p className="text-xs text-amber-300 font-medium">
                        Haddii aadan weli dirin, fadlan garaac koodhka kore ama dib ugu noqo si aad hab kale u doorato.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <a
                          href={ussdInfo.telUrl}
                          className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-black transition flex items-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Wac Hadda</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setHasCustomerPaidChoice('yes')}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                        >
                          Hadda Waan Bixiyay
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentStep('idle');
                            setHasCustomerPaidChoice('unanswered');
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                        >
                          Dib u noqo
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Customer selected HAA: show verification form */
                    <form onSubmit={handleCustomerSubmitPayment} className="space-y-3 pt-2 border-t border-slate-800 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Faahfaahinta Lacag Bixintaada:
                        </span>
                        <button
                          type="button"
                          onClick={() => setHasCustomerPaidChoice('unanswered')}
                          className="text-[10px] text-slate-400 hover:text-white"
                        >
                          Beddel doorashada
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Taleefanka Lacagta Laga Soo Diray *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="Tusaale: 061XXXXXXX"
                          value={senderPhoneInput}
                          onChange={(e) => setSenderPhoneInput(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-lime-400 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Tixraaca SMS-ka (Trx ID / Ikhtiyaari)
                        </label>
                        <input
                          type="text"
                          placeholder="Tusaale: Trx ID ama qoraalka SMS"
                          value={transactionRefInput}
                          onChange={(e) => setTransactionRefInput(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-lime-400 font-mono"
                        />
                      </div>

                      <button
                        id="btn-customer-submit-confirmation"
                        type="submit"
                        disabled={isSubmittingPayment}
                        className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>XAQIIJI LACAGTA (Gudbi Dalabka)</span>
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* STEP 1: INITIAL SUMMARY & CHOICE OF ADVANCE OR FULL + LARGE RED BUTTON HADDA BIXI */
                <div className="space-y-4 animate-in fade-in">
                  {/* Customer Number & District */}
                  <div className="bg-slate-950 rounded-2xl p-3.5 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Lambarka Macmiilka (Customer Number)
                      </span>
                      <span className="text-xs font-black text-white font-mono">
                        {order.customerPhone || order.customerId || 'CUST-WALKIN'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Degmada (District)
                      </span>
                      <span className="text-xs font-black text-lime-400 flex items-center justify-end gap-1">
                        <MapPin className="w-3 h-3" />
                        {order.deliveryDistrict || order.deliveryAddress || 'Muqdisho'}
                      </span>
                    </div>
                  </div>

                  {/* Products List (Product Name + Image + Qty + Sale Price + Discount) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                      <span>Alaabta Dalabka ({order.items.length})</span>
                      <span>Qiimaha</span>
                    </div>

                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800 flex items-center gap-3"
                        >
                          <div className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-slate-500" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white truncate text-xs">
                              {item.productName}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span>Tirada: <strong className="text-slate-200">x{item.quantity}</strong></span>
                              <span>•</span>
                              <span>Qiimaha: <strong className="text-slate-200">${item.sellingPrice.toFixed(2)}</strong></span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-white text-xs">
                              ${item.total.toFixed(2)}
                            </span>
                            {item.discount && item.discount > 0 ? (
                              <span className="text-[10px] text-emerald-400 block font-semibold">
                                -${item.discount.toFixed(2)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Details (Subtotal, Discount, Delivery, Total, Advance, Remaining) */}
                  <div className="bg-slate-950 rounded-2xl p-3.5 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Wadarta Badeecadaha:</span>
                      <span className="font-semibold text-white">${order.subtotal.toFixed(2)}</span>
                    </div>

                    {order.discount > 0 && (
                      <div className="flex items-center justify-between text-emerald-400">
                        <span>Qiimo Dhimis (Discount):</span>
                        <span className="font-semibold">-${order.discount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Gaarsiinta (Delivery):</span>
                      {order.deliveryFeePayer === 'Business' || order.deliveryFee === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                          <Check className="w-3 h-3" /> FREE DELIVERY
                        </span>
                      ) : (
                        <span className="font-semibold text-white">${order.deliveryFee.toFixed(2)}</span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
                      <span className="font-black text-white">Wadarta Guud (Total):</span>
                      <span className="text-base font-black text-lime-400">
                        ${order.total.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Hormaris La Bixiyay:</span>
                      <span className="font-bold text-white">${order.paidAmount.toFixed(2)}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="font-extrabold uppercase tracking-wide text-rose-400">
                        Hadhaa La Rabyo (Balance):
                      </span>
                      <span className="text-base font-black text-rose-400">
                        ${remainingBalance.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Customer Chooses: ADVANCE PAYMENT or FULL PAYMENT */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block">
                      Dooro Nooca Bixinta:
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentTypeChoice('advance')}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                          paymentTypeChoice === 'advance'
                            ? 'border-lime-400 bg-lime-400/15 text-white ring-1 ring-lime-400'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-lime-400">
                          ADVANCE PAYMENT
                        </span>
                        <span className="text-base font-black text-white mt-1">
                          ${((remainingBalance > 4 ? Math.ceil(remainingBalance * 0.5) : remainingBalance)).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          Hormaris Dammaanad ah
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentTypeChoice('full')}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                          paymentTypeChoice === 'full'
                            ? 'border-lime-400 bg-lime-400/15 text-white ring-1 ring-lime-400'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-lime-400">
                          FULL PAYMENT
                        </span>
                        <span className="text-base font-black text-white mt-1">
                          ${remainingBalance.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          Wadarta Guud
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* LARGE RED BOLD BUTTON: HADDA BIXI */}
                  <button
                    id="btn-splash-hadda-bixi"
                    type="button"
                    onClick={() => setPaymentStep('confirm_prompt')}
                    className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white text-base font-black uppercase tracking-wider transition shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>HADDA BIXI (${paymentAmountToPay.toFixed(2)})</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Dismiss / View Tracking Bar */}
            <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 text-center shrink-0">
              <button
                type="button"
                onClick={() => setIsPaymentSplashOpen(false)}
                className="text-xs text-slate-400 hover:text-lime-400 font-semibold transition"
              >
                Kala Soco Halka Uu Marayo Dalabkaaga (9 Marxaladood) & Alaabta &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-md flex-1 flex flex-col pb-12">
        {/* Top App Bar */}
        <header className="px-5 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-lime-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-lime-400/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                BANADIR STORE
                <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
              </h1>
              <span className="text-[11px] font-mono text-slate-400">
                {order.orderNo}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Accidental Exit Guard Button */}
            <button
              id="btn-exit-portal-guard"
              onClick={handleExitRequest}
              title="Ka bax / Exit Safeguard"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 text-xs font-medium transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-lime-400" />
              <span>Xir</span>
            </button>
          </div>
        </header>

        {/* Portal Navigation Tabs */}
        <nav className="flex items-center border-b border-slate-800 bg-slate-900/40 text-xs font-bold px-4">
          <button
            id="tab-current-order"
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'current'
                ? 'border-lime-400 text-lime-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Dalabka Hadda</span>
          </button>
          <button
            id="tab-order-history"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-lime-400 text-lime-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Dalabyadii Hore</span>
            {customerOrders.length > 1 && (
              <span className="px-1.5 py-0.2 bg-slate-800 text-lime-400 rounded-full text-[10px]">
                {customerOrders.length}
              </span>
            )}
          </button>
          <button
            id="tab-continue-shopping"
            onClick={() => setActiveTab('shop')}
            className={`flex-1 py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'shop'
                ? 'border-lime-400 text-lime-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Dalbo Mar Kale</span>
            {Object.keys(shopCart).length > 0 && (
              <span className="px-1.5 py-0.2 bg-lime-400 text-slate-950 font-black rounded-full text-[10px]">
                {Object.values(shopCart).reduce((a, b) => a + b, 0)}
              </span>
            )}
          </button>
        </nav>

        {/* TAB 1: CURRENT ORDER SPLASH FLOW & LIVE TRACKING */}
        {activeTab === 'current' && (
          <div className="p-4 space-y-4">
            {/* Customer & Location Identity Card */}
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Customer Number
                  </span>
                  <p className="text-sm font-black text-white font-mono">
                    {order.customerPhone || order.customerId || 'CUST-WALKIN'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Degmada (District)
                  </span>
                  <div className="flex items-center gap-1 text-lime-400 text-xs font-bold justify-end mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{order.deliveryDistrict || order.deliveryAddress || 'Muqdisho'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                <span className="text-slate-400">Magaca Macmiilka:</span>
                <span className="font-bold text-white">{order.customerName}</span>
              </div>
            </div>

            {/* ORDER ITEMS LIST */}
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Alaabta Dalabka ({order.items.length})
                </h3>
                <span className="text-[11px] text-slate-500">
                  {order.date} • {order.time}
                </span>
              </div>

              <div className="divide-y divide-slate-800/60">
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-3">
                    {/* Product Image */}
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/80 overflow-hidden flex items-center justify-center shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-slate-500" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {item.productName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        <span>Tirada: <strong className="text-slate-200">x{item.quantity}</strong></span>
                        <span>•</span>
                        <span>Qiimaha: <strong className="text-slate-200">${item.sellingPrice.toFixed(2)}</strong></span>
                      </div>
                    </div>

                    {/* Line Total */}
                    <div className="text-right">
                      <p className="text-xs font-black text-white">
                        ${item.total.toFixed(2)}
                      </p>
                      {item.discount && item.discount > 0 ? (
                        <span className="text-[10px] text-emerald-400 block">
                          -${item.discount.toFixed(2)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FINANCIALS & BREAKDOWN CARD */}
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Wadarta Badeecadaha (Subtotal):</span>
                <span className="font-semibold text-white">${order.subtotal.toFixed(2)}</span>
              </div>

              {order.discount > 0 && (
                <div className="flex items-center justify-between text-emerald-400">
                  <span>Qiimo dhimis (Discount):</span>
                  <span className="font-semibold">-${order.discount.toFixed(2)}</span>
                </div>
              )}

              {/* Delivery Fee & Free Delivery Badge */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Lacagta Gaarsiinta (Delivery):</span>
                {order.deliveryFeePayer === 'Business' || order.deliveryFee === 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-black tracking-wide">
                    <Check className="w-3 h-3" /> FREE DELIVERY
                  </span>
                ) : (
                  <span className="font-semibold text-white">${order.deliveryFee.toFixed(2)}</span>
                )}
              </div>

              {order.cargoFee > 0 && (
                <div className="flex items-center justify-between text-slate-400">
                  <span>Khidmadda Cargo:</span>
                  <span className="font-semibold text-white">${order.cargoFee.toFixed(2)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
                <span className="font-black text-white">Wadarta Guud (Total):</span>
                <span className="text-base font-black text-lime-400">
                  ${order.total.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span>Hormaris (Advance Paid):</span>
                <span className="font-bold text-white">${order.paidAmount.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="font-extrabold uppercase tracking-wide text-slate-300 text-xs">
                  Hadhaa (Remaining Balance):
                </span>
                {isFullyPaid ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black">
                    FULLY PAID (Waa La Wada Bixiyay)
                  </span>
                ) : (
                  <span className="text-sm font-black text-rose-400">
                    ${remainingBalance.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* PAYMENT STATE NOTICES */}
            {order.paymentStatus === 'customer_confirmed' && (
              <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 space-y-2">
                <div className="flex items-start gap-2.5">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wide text-amber-400">
                      Lacag Bixintaada Waa La Helay (Awaiting Verification)
                    </h4>
                    <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
                      Waxa aad sheegtay inaad bixisay <strong>${order.customerConfirmedPayment?.amount.toFixed(2)}</strong> via <strong>{order.customerConfirmedPayment?.method}</strong>. Maamulka Banadir Store ayaa xaqiijinaya daqiiqado gudahood.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {order.paymentStatus === 'rejected' && (
              <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 space-y-2">
                <div className="flex items-start gap-2.5">
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wide text-rose-400">
                      Lacag Bixinta Lama Xaqiijin (Payment Rejected)
                    </h4>
                    <p className="text-xs text-rose-200/90 mt-0.5 leading-relaxed">
                      Sababta: <strong>{order.paymentRejectionReason || 'SMS ama tixraac lacageed lama helin.'}</strong>. Fadlan dib u bixi ama la xiriir xafiiska.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PAYMENT WORKFLOW BUTTON / SPLASH */}
            {!isFullyPaid && order.paymentStatus !== 'customer_confirmed' && paymentStep === 'idle' && (
              <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-4 shadow-xl">
                <div className="space-y-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Dooro Qaabka Bixinta Lacagta
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Dooro hormaris ama bixi wadarta guud si degdeg ah looguugu adeego
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentTypeChoice('advance')}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                      paymentTypeChoice === 'advance'
                        ? 'border-lime-400 bg-lime-400/10 text-white ring-1 ring-lime-400'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-lime-400">
                      ADVANCE PAYMENT
                    </span>
                    <span className="text-base font-black text-white mt-1">
                      ${((remainingBalance > 4 ? Math.ceil(remainingBalance * 0.5) : remainingBalance)).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      Hormaris Dammaanad ah
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentTypeChoice('full')}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                      paymentTypeChoice === 'full'
                        ? 'border-lime-400 bg-lime-400/10 text-white ring-1 ring-lime-400'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-lime-400">
                      FULL PAYMENT
                    </span>
                    <span className="text-base font-black text-white mt-1">
                      ${remainingBalance.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      Wadarta Guud
                    </span>
                  </button>
                </div>

                {/* LARGE RED BOLD BUTTON: HADDA BIXI */}
                <button
                  id="btn-hadda-bixi"
                  type="button"
                  onClick={() => {
                    setIsPaymentSplashOpen(true);
                    setPaymentStep('confirm_prompt');
                  }}
                  className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white text-base font-black uppercase tracking-wider transition shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  <span>HADDA BIXI (${paymentAmountToPay.toFixed(2)})</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* PAYMENT STEP 2: SELECT METHOD */}
            {paymentStep === 'method_select' && (
              <div className="bg-slate-900/95 rounded-2xl p-5 border border-slate-800 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Dooro Habka Lacag Bixinta
                  </h3>
                  <button
                    onClick={() => setPaymentStep('idle')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Kansal
                  </button>
                </div>

                <div className="space-y-2">
                  {(['EVC Plus', 'E-Dahab', 'Jeeb'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => {
                        setSelectedMethod(method);
                        setPaymentStep('confirm_prompt');
                      }}
                      className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition ${
                        selectedMethod === method
                          ? 'border-lime-400 bg-lime-400/10 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-lime-400">
                          {method === 'EVC Plus' ? 'E' : method === 'E-Dahab' ? 'D' : 'J'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{method}</p>
                          <p className="text-[10px] text-slate-400">
                            {method === 'EVC Plus' ? '*712*' : method === 'E-Dahab' ? '*110*' : '*812*'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PAYMENT STEP 3: CONFIRMATION PROMPT ("Ma rabtaa inaad u dirto Banadir Store $AMOUNT?") */}
            {paymentStep === 'confirm_prompt' && (
              <div className="bg-slate-900/95 rounded-2xl p-5 border border-slate-800 space-y-4 text-center animate-in fade-in">
                <div className="w-12 h-12 rounded-2xl bg-lime-400/10 text-lime-400 flex items-center justify-center mx-auto">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white leading-relaxed">
                    Ma rabtaa inaad u dirto Banadir Store <span className="text-lime-400">${paymentAmountToPay.toFixed(2)}</span>?
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Qaabka: <strong>{selectedMethod}</strong> ({paymentTypeChoice === 'advance' ? 'Hormaris' : 'Wadarta Guud'})
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    id="btn-confirm-pay-maya"
                    onClick={() => setPaymentStep('idle')}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition uppercase tracking-wider"
                  >
                    MAYA
                  </button>
                  <a
                    id="btn-confirm-pay-haa"
                    href={ussdInfo.telUrl}
                    onClick={() => setPaymentStep('ussd_active')}
                    className="py-3 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-black transition uppercase tracking-wider flex items-center justify-center gap-1 shadow-md shadow-lime-400/20"
                  >
                    <span>HAA</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            {/* PAYMENT STEP 4: ACTIVE USSD + CONFIRMATION FORM */}
            {paymentStep === 'ussd_active' && (
              <div className="bg-slate-900/95 rounded-2xl p-5 border border-slate-800 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-lime-400 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" /> Bixinta USSD ({selectedMethod})
                  </h3>
                  <button
                    onClick={() => setPaymentStep('idle')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Dib u noqo
                  </button>
                </div>

                {/* USSD Box */}
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <span className="font-mono text-sm font-black text-lime-400 tracking-wider">
                    {ussdInfo.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      id="btn-copy-ussd-code"
                      onClick={handleCopyUssd}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
                    >
                      {copiedUssd ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUssd ? 'Waa La Koobiyeeyay' : 'Koobiyee'}</span>
                    </button>
                    <a
                      href={ussdInfo.telUrl}
                      className="px-2.5 py-1.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-black transition flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Wac</span>
                    </a>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  Haddii teleefankaagu aanu si toos ah u furin lambarka, fadlan koobiyee koodhka kore oo garaac. Kadib marka aad bixiso, buuxi foomka hoose si maamulku u xaqiijiyo.
                </p>

                {/* Confirmation Form */}
                <form onSubmit={handleCustomerSubmitPayment} className="space-y-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Taleefanka Lacagta Laga Soo Diray *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 061XXXXXXX"
                      value={senderPhoneInput}
                      onChange={(e) => setSenderPhoneInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-lime-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Tixraaca SMS-ka (Ikhtiyaari)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tixraac / Trx ID / Qoraalka SMS-ka"
                      value={transactionRefInput}
                      onChange={(e) => setTransactionRefInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-lime-400"
                    />
                  </div>

                  <button
                    id="btn-customer-confirm-paid"
                    type="submit"
                    disabled={isSubmittingPayment}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>WAAN BIXIYAY - XAQIIJI LACAGTA</span>
                  </button>
                </form>
              </div>
            )}

            {/* DRIVER INFORMATION CARD (When Assigned) */}
            {(order.driverName || order.driverId) && (
              <div className="bg-slate-900/90 rounded-2xl p-4 border border-lime-400/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-lime-400 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" /> Darawalka Dalabkaaga
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {order.driverVehicle || 'Mooto/Gaaadhi'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white">{order.driverName}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {order.driverPhone || 'Taleefan lama diiwaangelin'}
                    </p>
                  </div>
                  {order.driverPhone && (
                    <a
                      id="btn-call-driver"
                      href={`tel:${order.driverPhone.replace(/[^0-9+]/g, '')}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-black transition shadow-md shadow-lime-400/10"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Wac Darawalka</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* AUTHORITATIVE 9-STAGE REAL DATABASE TRACKING */}
            <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    La Socodka Dalabka (Live Order Tracking)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Xogta dhabta ah ee xaaladda alaabtaada waqti xaadirkan
                  </p>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-lime-400 font-bold border border-slate-700">
                  {order.status.toUpperCase()}
                </span>
              </div>

              {/* 9-Stage Stepper */}
              <div className="relative pl-6 space-y-4 border-l-2 border-slate-800 ml-2">
                {trackingStages.map((stage) => {
                  let dotBg = 'bg-slate-800 border-slate-700 text-slate-500';
                  if (stage.isCompleted) {
                    dotBg = 'bg-emerald-500 border-emerald-400 text-white';
                  } else if (stage.isCurrent) {
                    dotBg = 'bg-lime-400 border-lime-300 text-slate-950 ring-4 ring-lime-400/20 animate-pulse';
                  }

                  return (
                    <div key={stage.key} className="relative group">
                      {/* Step Indicator Dot */}
                      <div
                        className={`absolute -left-[31px] top-0.5 w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-black transition ${dotBg}`}
                      >
                        {stage.isCompleted ? <Check className="w-3.5 h-3.5" /> : stage.stepNumber}
                      </div>

                      {/* Content */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-xs font-extrabold ${
                              stage.isCurrent ? 'text-lime-400' : stage.isCompleted ? 'text-white' : 'text-slate-500'
                            }`}
                          >
                            {stage.labelSomali}
                          </h4>
                          <span className="text-[10px] text-slate-500">
                            ({stage.labelEnglish})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ADMIN-ONLY MANAGEMENT / VERIFICATION DRAWER */}
            {isAdmin && (
              <div className="bg-slate-900/95 rounded-2xl p-5 border border-slate-700 space-y-4 mt-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-black text-lime-400 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Maamulka Banadir Store (Admin Verification)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    Staff Mode
                  </span>
                </div>

                {/* Pending Verification Banner */}
                {order.paymentStatus === 'customer_confirmed' && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                    <div className="text-xs text-amber-200">
                      <strong>Codsi Lacag Bixin:</strong> Macmiilku wuxuu xaqiijiyay bixinta{' '}
                      <strong>${order.customerConfirmedPayment?.amount.toFixed(2)}</strong> via{' '}
                      <strong>{order.customerConfirmedPayment?.method}</strong>.
                      {order.customerConfirmedPayment?.transactionRef && (
                        <span className="block font-mono text-[11px] text-amber-300 mt-1">
                          Ref: {order.customerConfirmedPayment.transactionRef}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        id="btn-admin-verify-pay"
                        onClick={handleAdminVerify}
                        className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Xaqiiji (Verify)</span>
                      </button>
                      <button
                        id="btn-admin-reject-pay"
                        onClick={() => setShowAdminRejectModal(true)}
                        className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Diid (Reject)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Driver Assignment Dropdown */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    U Qoondee Darawal (Assign Driver):
                  </label>
                  <select
                    id="select-assign-driver"
                    value={order.driverId || ''}
                    onChange={(e) => assignDriverToOrder(order.id, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                  >
                    <option value="">-- Dooro Darawal --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.phone}) - {d.vehicleType || 'Mooto'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fulfillment Stage Updater */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Cusbooneysii Marxaladda (Update Fulfillment):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                    {(['PREPARING', 'READY', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => updateOrderFulfillmentStage(order.id, st)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition ${
                          order.fulfillmentStatus === st
                            ? 'bg-lime-400 text-slate-950 border-lime-400'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Idempotent Order Completion & Sale Finalization */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Dhamaystir Dalabka & Invoice-ka
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {order.convertedSaleId ? `Waa la beddelay (Sale ID: ${order.convertedSaleId.slice(0, 8)})` : 'Abuur hal Sale oo dhab ah'}
                    </span>
                  </div>
                  <button
                    id="btn-admin-complete-order"
                    onClick={handleAdminCompleteOrder}
                    disabled={Boolean(order.convertedSaleId) || order.status === 'Completed'}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-lime-400 border border-slate-700 text-xs font-bold transition disabled:opacity-40"
                  >
                    {order.convertedSaleId ? 'Waa La Dhamaystiray' : 'Dhamaystir Hadda'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ORDER HISTORY & PREVIOUS PAYMENTS */}
        {activeTab === 'history' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Dalabyadii Hore ee Macmiilka
                </h3>
                <p className="text-[11px] text-slate-400">
                  Dhammaan dalabyada ku xiran {order.customerName} ({order.customerPhone})
                </p>
              </div>
              <span className="text-xs font-bold text-lime-400 font-mono">
                {customerOrders.length} Dalab
              </span>
            </div>

            <div className="space-y-3">
              {customerOrders.map((ord) => {
                const isCurrent = ord.id === order.id;
                const rem = Math.max(0, ord.total - ord.paidAmount);
                return (
                  <div
                    key={ord.id}
                    className={`bg-slate-900/90 rounded-2xl p-4 border transition ${
                      isCurrent ? 'border-lime-400 ring-1 ring-lime-400/30' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-white">
                            {ord.orderNo}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.2 bg-lime-400/20 text-lime-400 rounded-full text-[10px] font-bold">
                              Kani waa kii hadda
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {ord.date} • {ord.items.length} badeecooyin
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-white block">
                          ${ord.total.toFixed(2)}
                        </span>
                        <span
                          className={`text-[10px] font-bold ${
                            rem <= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {rem <= 0 ? 'Fully Paid' : `Hadhaa: $${rem.toFixed(2)}`}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 capitalize">
                        {ord.status}
                      </span>

                      {!isCurrent && onNavigateToOrder && (
                        <button
                          onClick={() => onNavigateToOrder(ord)}
                          className="text-xs font-bold text-lime-400 hover:underline flex items-center gap-1"
                        >
                          <span>Fur Dalabkan</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: DALBO MAR KALE (CONTINUE SHOPPING E-COMMERCE) */}
        {activeTab === 'shop' && (
          <div className="p-4 space-y-4">
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-lime-400">
                    Dalbo Mar Kale (Continue Shopping)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Dalbo alaabo cusub adiga oo aan dib u gelin xogtaada
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-lime-400/10 text-lime-400 flex items-center justify-center font-bold">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Raadi badeecooyin..."
                value={shopSearch}
                onChange={(e) => setShopSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-lime-400"
              />
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 gap-3">
              {filteredShopProducts.map((p) => {
                const inCartQty = shopCart[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-full aspect-square rounded-xl bg-slate-800 border border-slate-700/60 overflow-hidden flex items-center justify-center mb-2.5">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-slate-600" />
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white truncate" title={p.name}>
                        {p.name}
                      </h4>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-black text-lime-400">
                          ${p.sellingPrice.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Kaydka: {p.stock}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800">
                      {inCartQty > 0 ? (
                        <div className="flex items-center justify-between bg-slate-950 rounded-xl p-1 border border-slate-800">
                          <button
                            onClick={() => handleRemoveFromCart(p.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-white">{inCartQty}</span>
                          <button
                            onClick={() => handleAddToCart(p.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(p.id)}
                          className="w-full py-2 rounded-xl bg-slate-800 hover:bg-lime-400 hover:text-slate-950 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ku dar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Shopping Cart Bar & Instant Reorder Checkout */}
            {Object.keys(shopCart).length > 0 && (
              <div className="sticky bottom-4 z-20 bg-slate-900 border border-lime-400/40 rounded-2xl p-4 shadow-2xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">
                    Badeecadaha Xulan ({Object.values(shopCart).reduce((a, b) => a + b, 0)}):
                  </span>
                  <span className="text-base font-black text-lime-400">
                    ${shopTotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Gaarsiinta:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setShopDeliveryFeePayer(shopDeliveryFeePayer === 'Customer' ? 'Business' : 'Customer')
                    }
                    className="text-[11px] text-lime-400 font-bold hover:underline"
                  >
                    {shopDeliveryFeePayer === 'Customer' ? 'Macmiilka ($2.00)' : 'FREE DELIVERY (Ganacsiga)'}
                  </button>
                </div>

                <button
                  id="btn-place-reorder-portal"
                  onClick={handlePlaceReorder}
                  disabled={isPlacingShopOrder}
                  className="w-full py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-black uppercase tracking-wider transition shadow-lg shadow-lime-400/20 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Xaqiiji Dalabkan Cusub</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin Rejection Modal */}
      {showAdminRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-rose-400 flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Diidmada Lacag Bixinta
              </h3>
              <button
                onClick={() => setShowAdminRejectModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Sababta Diidmada:
              </label>
              <textarea
                rows={3}
                placeholder="Tusaale: SMS lama helin / Lambarka lacagta laga diray ma ahan midka saxda ah"
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowAdminRejectModal(false)}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-700 transition"
              >
                Kansal
              </button>
              <button
                id="btn-confirm-reject-payment"
                onClick={handleAdminReject}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
              >
                Xaqiiji Diidmada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
