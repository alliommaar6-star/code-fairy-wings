import React, { useState } from "react";
import { StoreProvider, useStore } from "./context/StoreContext";
import { Sidebar, NavSection } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { DashboardView } from "./components/views/DashboardView";
import { PosView } from "./components/views/PosView";
import { ProductsView } from "./components/views/ProductsView";
import { InventoryView } from "./components/views/InventoryView";
import { PurchasesView } from "./components/views/PurchasesView";
import { ExpensesView } from "./components/views/ExpensesView";
import { IncomeView } from "./components/views/IncomeView";
import { AccountsView } from "./components/views/AccountsView";
import { CustomersView } from "./components/views/CustomersView";
import { CargoView } from "./components/views/CargoView";
import { DeliveryManagementView } from "./components/views/DeliveryManagementView";
import { TargetsView } from "./components/views/TargetsView";
import { PettyCashView } from "./components/views/PettyCashView";
import { BranchSalesPanel } from "./components/views/BranchSalesPanel";
import { EvcReconciliationView } from "./components/views/EvcReconciliationView";
import { ReportsView } from "./components/views/ReportsView";
import { SettingsView } from "./components/views/SettingsView";

import { NewSaleModal } from "./components/views/NewSaleModal";
import { NewExpenseModal } from "./components/views/NewExpenseModal";
import { NewIncomeModal } from "./components/views/NewIncomeModal";
import { NewCustomerModal } from "./components/views/NewCustomerModal";
import { NewProductModal } from "./components/views/NewProductModal";
import { NewDriverModal } from "./components/views/NewDriverModal";
import { ReceivePaymentModal } from "./components/views/ReceivePaymentModal";
import { AccountTransferModal } from "./components/views/AccountTransferModal";
import { SalesReturnModal } from "./components/views/SalesReturnModal";
import { ReceiptModal } from "./components/common/ReceiptModal";
import { SalesOrdersView } from "./components/views/SalesOrdersView";
import { TrackingView } from "./components/views/TrackingView";
import { AccountantView } from "./components/views/AccountantView";
import { AlertCenter } from "./components/layout/AlertCenter";
import { CustomerOrderPortalModal } from "./components/views/CustomerOrderPortalModal";
import { CustomerPortalView } from "./components/views/CustomerPortalView";
import { Sale, Customer, Product, Order } from "./types";
import { decodeOrderData } from "./utils/portalUrl";
import { Search, ShoppingBag, PhoneCall, AlertTriangle, ShieldOff } from "lucide-react";
import { StockInsightsView } from "./components/views/StockInsightsView";
import { canAccess, useStaffRole, ROLE_LABELS } from "./lib/roles";

const MainApp: React.FC = () => {
  const { convertOrderToSale, getOrderByPortalToken, registerExternalOrder, orders } = useStore();
  const staffRole = useStaffRole();
  const [activeTab, setActiveTab] = useState<NavSection>("dashboard");
  // Sidebar wuu xirnaanayaa marka hore — wuxuu furmayaa oo kaliya marka badhanka Menu la riixo
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Modals state
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [newRecordSignal, setNewRecordSignal] = useState(0);
  const openNewRecord = () => {
    setActiveTab("orders");
    setIsSidebarOpen(false);
    setNewRecordSignal((n) => n + 1);
  };
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [isNewIncomeOpen, setIsNewIncomeOpen] = useState(false);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [isNewDriverOpen, setIsNewDriverOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Contextual modals
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [activeReturnSale, setActiveReturnSale] = useState<Sale | null>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false);
  const [directPortalOrder, setDirectPortalOrder] = useState<Order | null>(null);
  const [isDirectCustomerRoute, setIsDirectCustomerRoute] = useState<boolean>(false);
  const [searchOrderQuery, setSearchOrderQuery] = useState<string>("");
  const [prefilledProduct, setPrefilledProduct] = useState<Product | null>(null);

  // Check URL on load for direct portal token links & encoded order payload (pdata)
  React.useEffect(() => {
    try {
      const pathname = window.location.pathname;
      const pMatch = pathname.match(/^\/p\/([^/?#]+)/);
      const tokenFromPath = pMatch ? decodeURIComponent(pMatch[1]) : null;

      const params = new URLSearchParams(window.location.search);
      const hashParams = window.location.hash.includes("?")
        ? new URLSearchParams(window.location.hash.split("?")[1])
        : new URLSearchParams();

      const pdata =
        params.get("pdata") || params.get("d") || hashParams.get("pdata") || hashParams.get("d");
      const token =
        tokenFromPath ||
        params.get("portal_token") ||
        params.get("order_token") ||
        params.get("token") ||
        hashParams.get("portal_token") ||
        hashParams.get("token");

      // 1. If payload is present in the link, decode and hydrate it immediately
      if (pdata) {
        const decoded = decodeOrderData(pdata);
        if (decoded) {
          const registered = registerExternalOrder(decoded);
          setDirectPortalOrder(registered);
          setIsDirectCustomerRoute(true);
          return;
        }
      }

      // 2. If token is present, check existing orders
      if (token) {
        const found = getOrderByPortalToken(token);
        if (found) {
          setDirectPortalOrder(found);
          setIsDirectCustomerRoute(true);
        } else {
          // Token provided in URL, so user definitely intended to visit the customer portal!
          // Mark customer route as true so they are NOT dumped into the admin POS system!
          setIsDirectCustomerRoute(true);
        }
      } else if (tokenFromPath || pathname.startsWith("/p/")) {
        setIsDirectCustomerRoute(true);
      }
    } catch (err) {
      console.error("Portal routing error:", err);
    }
  }, [getOrderByPortalToken, registerExternalOrder]);

  // Keep directPortalOrder fresh with live store state
  const currentPortalOrder = directPortalOrder
    ? orders.find(
        (o) => o.id === directPortalOrder.id || o.portalToken === directPortalOrder.portalToken,
      ) || directPortalOrder
    : null;

  // Direct standalone PWA portal view for customers
  if (isDirectCustomerRoute) {
    if (currentPortalOrder) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center">
          <CustomerPortalView
            order={currentPortalOrder}
            isStandalone={true}
            onClose={() => {
              setIsDirectCustomerRoute(false);
              setDirectPortalOrder(null);
              try {
                window.history.pushState({}, "", "/");
              } catch {}
            }}
            onNavigateToOrder={(newOrd) => {
              setDirectPortalOrder(newOrd);
              try {
                window.history.pushState(
                  {},
                  "",
                  `/?portal_token=${newOrd.portalToken || newOrd.id}`,
                );
              } catch {}
            }}
          />
        </div>
      );
    }

    // Fallback: If customer clicked a link where token could not be resolved,
    // display a clean, reassuring Somali portal lookup screen instead of admin POS!
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">Benadir Store - Raadi Dalabkaaga</h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Xiriirka dalabkaagu ma furmin xogta tooska ah. Fadlan geli lambarkaaga taleefanka ama
              lambarka dalabka si aad u hesho xisaabta iyo halka uu marayo.
            </p>
          </div>

          <div className="space-y-3 text-left">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Lambarka Dalabka ama Tel:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchOrderQuery}
                  onChange={(e) => setSearchOrderQuery(e.target.value)}
                  placeholder="Tusaale: ORD-1002 ama 61xxxxxxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-lime-400"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              </div>
            </div>

            <button
              onClick={() => {
                const clean = searchOrderQuery.trim().toLowerCase();
                if (!clean) return;
                const found = orders.find(
                  (o) =>
                    o.orderNo.toLowerCase() === clean ||
                    o.id.toLowerCase() === clean ||
                    (o.customerPhone && o.customerPhone.includes(clean)),
                );
                if (found) {
                  setDirectPortalOrder(found);
                } else {
                  alert(
                    "Lama helin dalab u dhigma xogtaada. Fadlan hubi lambarka ama la xiriir dukaanka.",
                  );
                }
              }}
              className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-black uppercase tracking-wider transition shadow-md shadow-lime-400/20"
            >
              Raadi Dalabka
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <a
              href="https://wa.me/252615001234?text=Salaamu%20Calaykum%2C%20waxaan%20rabaa%20in%20aan%20ogaado%20dalabkayga"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-lime-400 hover:underline font-semibold"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Nala Xiriir (WhatsApp)</span>
            </a>

            <button
              onClick={() => {
                if (orders.length > 0) {
                  setDirectPortalOrder(orders[0]);
                } else {
                  setIsDirectCustomerRoute(false);
                }
              }}
              className="text-slate-400 hover:text-white"
            >
              Tus Dalabkii Ugu Dambeeyay
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quick sale pre-fill product

  const handleOpenReceivePayment = (customer?: Customer | null) => {
    setPaymentCustomer(customer || null);
    setIsReceivePaymentOpen(true);
  };

  const handleOpenReturn = (sale: Sale) => {
    setActiveReturnSale(sale);
  };

  const handleViewReceipt = (sale: Sale) => {
    setActiveReceiptSale(sale);
  };

  const handleSaleCompleted = (sale: Sale) => {
    setActiveReceiptSale(sale);
  };

  const handleQuickSellProduct = (product: Product) => {
    setPrefilledProduct(product);
    setActiveTab("pos");
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 antialiased overflow-hidden selection:bg-[#bef264] selection:text-black">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeSection={activeTab}
        onSelectSection={(tab) => {
          setActiveTab(tab);
          setIsSidebarOpen(false);
        }}
        onOpenNewSale={openNewRecord}
      />

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenNewSale={openNewRecord}
          onOpenNewExpense={() => setIsNewExpenseOpen(true)}
          onOpenNewIncome={() => setIsNewIncomeOpen(true)}
          onOpenNewCustomer={() => setIsNewCustomerOpen(true)}
          onOpenNewProduct={() => setIsNewProductOpen(true)}
          onOpenNewDriver={() => setIsNewDriverOpen(true)}
          onOpenTransfer={() => setIsTransferOpen(true)}
          onOpenReceivePayment={() => handleOpenReceivePayment(null)}
          onNavigate={(tab) => {
            setActiveTab(tab as NavSection);
            setIsSidebarOpen(false);
          }}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto pb-16">
          {!canAccess(staffRole, activeTab) ? (
            <div className="max-w-md mx-auto mt-24 text-center space-y-2 p-6">
              <ShieldOff className="w-10 h-10 mx-auto text-slate-400" />
              <h2 className="font-extrabold text-slate-900">No access</h2>
              <p className="text-sm text-slate-500">Your role ({ROLE_LABELS[staffRole]}) can't open this section. Ask the owner if you need it.</p>
            </div>
          ) : (<>
          {activeTab === "insights" && <StockInsightsView />}
          {activeTab === "dashboard" && (
            <DashboardView
              onNavigate={setActiveTab}
              onOpenNewSale={openNewRecord}
              onOpenNewExpense={() => setIsNewExpenseOpen(true)}
              onOpenNewIncome={() => setIsNewIncomeOpen(true)}
              onOpenReceivePayment={() => handleOpenReceivePayment(null)}
              onOpenNewDelivery={() => setIsNewDriverOpen(true)}
              onOpenNewAccount={() => setIsTransferOpen(true)}
            />
          )}

          {(activeTab === "sales" || activeTab === "orders" || activeTab === "returns") && (
            /* Order and Sale are one flow — a single unified list, no split tabs */
            <SalesOrdersView
              openNewSignal={newRecordSignal}
              onConvertSale={(orderId) => {
                const sale = convertOrderToSale(orderId);
                if (sale) setActiveReceiptSale(sale);
              }}
              onViewReceipt={handleViewReceipt}
              onOpenReturn={handleOpenReturn}
              onReceivePayment={(sale) => {
                const dummyCust: Customer = {
                  id: sale.customerId,
                  name: sale.customerName,
                  phone: sale.customerPhone || "",
                  balance: sale.remainingBalance,
                  creditLimit: 1000,
                  totalPurchases: sale.grandTotal,
                  status: "active",
                };
                handleOpenReceivePayment(dummyCust);
              }}
            />
          )}

          {activeTab === "pos" && <PosView onSaleComplete={handleSaleCompleted} />}

          {activeTab === "products" && (
            <ProductsView
              onOpenNewProduct={() => setIsNewProductOpen(true)}
              onQuickSell={handleQuickSellProduct}
            />
          )}

          {activeTab === "inventory" && <InventoryView />}

          {activeTab === "purchases" && <PurchasesView initialTab="purchases" />}

          {activeTab === "suppliers" && <PurchasesView initialTab="suppliers" />}

          {activeTab === "expenses" && (
            <ExpensesView onOpenNewExpense={() => setIsNewExpenseOpen(true)} />
          )}

          {activeTab === "income" && (
            <IncomeView onOpenNewIncome={() => setIsNewIncomeOpen(true)} />
          )}

          {activeTab === "accounts" && (
            <AccountsView
              onOpenTransfer={() => setIsTransferOpen(true)}
              onOpenNewExpense={() => setIsNewExpenseOpen(true)}
              onOpenNewIncome={() => setIsNewIncomeOpen(true)}
            />
          )}

          {activeTab === "customers" && (
            <CustomersView
              onOpenNewCustomer={() => setIsNewCustomerOpen(true)}
              onReceivePayment={handleOpenReceivePayment}
            />
          )}

          {activeTab === "cargo" && <CargoView />}
          {activeTab === "tracking" && <TrackingView />}
          {activeTab === "accounting" && <AccountantView />}

          {activeTab === "drivers" && <DeliveryManagementView />}

          {activeTab === "targets" && <TargetsView />}
          {activeTab === "pettycash" && <PettyCashView />}
          {activeTab === "branches" && <div className="p-4 md:p-6"><h1 className="text-xl font-extrabold mb-4">Branches &amp; Stock</h1><BranchSalesPanel /></div>}
          {activeTab === "evcrecon" && <EvcReconciliationView />}

          {activeTab === "reports" && <ReportsView />}

          {activeTab === "settings" && <SettingsView />}
          </>)}
        </main>
        <AlertCenter onOpen={() => setActiveTab("tracking" as NavSection)} />
      </div>

      {/* Global Modals */}
      <NewSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        onSaleSuccess={(sale: Sale) => {
          setActiveReceiptSale(sale);
        }}
      />

      <NewExpenseModal isOpen={isNewExpenseOpen} onClose={() => setIsNewExpenseOpen(false)} />

      <NewIncomeModal isOpen={isNewIncomeOpen} onClose={() => setIsNewIncomeOpen(false)} />

      <NewCustomerModal isOpen={isNewCustomerOpen} onClose={() => setIsNewCustomerOpen(false)} />

      <NewProductModal isOpen={isNewProductOpen} onClose={() => setIsNewProductOpen(false)} />

      <NewDriverModal isOpen={isNewDriverOpen} onClose={() => setIsNewDriverOpen(false)} />

      <AccountTransferModal isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} />

      <ReceivePaymentModal
        isOpen={isReceivePaymentOpen}
        onClose={() => {
          setIsReceivePaymentOpen(false);
          setPaymentCustomer(null);
        }}
        customer={paymentCustomer}
      />

      <SalesReturnModal
        isOpen={!!activeReturnSale}
        onClose={() => setActiveReturnSale(null)}
        sale={activeReturnSale}
      />

      <ReceiptModal
        isOpen={!!activeReceiptSale}
        onClose={() => setActiveReceiptSale(null)}
        sale={activeReceiptSale}
      />

      <CustomerOrderPortalModal
        isOpen={!!currentPortalOrder && !isDirectCustomerRoute}
        onClose={() => setDirectPortalOrder(null)}
        order={currentPortalOrder}
        onConvertSale={(orderId) => {
          const sale = convertOrderToSale(orderId);
          if (sale) {
            setActiveReceiptSale(sale);
          }
        }}
      />
    </div>
  );
};

export function App() {
  return (
    <StoreProvider>
      <MainApp />
    </StoreProvider>
  );
}

export default App;
