import { SyncBadge } from "./SyncBadge";
import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  Search,
  Target,
  Plus,
  Bell,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  UserPlus,
  PackagePlus,
  Truck,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { NavSection } from "./Sidebar";
import { PortalLauncher } from "./PortalLauncher";

interface HeaderProps {
  onToggleSidebar?: () => void;
  onNavigate: (tab: NavSection) => void;
  onOpenNewSale: () => void;
  onOpenNewExpense: () => void;
  onOpenNewIncome: () => void;
  onOpenNewCustomer: () => void;
  onOpenNewProduct: () => void;
  onOpenNewDriver: () => void;
  onOpenTransfer?: () => void;
  onOpenReceivePayment?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar = () => {},
  onNavigate,
  onOpenNewSale,
  onOpenNewExpense,
  onOpenNewIncome,
  onOpenNewCustomer,
  onOpenNewProduct,
  onOpenNewDriver,
  onOpenTransfer,
  onOpenReceivePayment,
}) => {
  const { currentUser, getTodayStats, settings, sales } = useStore();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const quickAddRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const { todayNetProfit, todayTarget } = getTodayStats();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickAddRef.current && !quickAddRef.current.contains(event.target as Node)) {
        setShowQuickAdd(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left side: Hamburger + Global Search */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xl">
        <button
          id="btn-toggle-sidebar"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center gap-1.5 shrink-0 group border border-slate-200/60 lg:hidden"
          title="Fura Menu-ga (Toggle Navigation Menu)"
          aria-label="Fura Menu-ga"
        >
          <Menu className="w-5 h-5 text-slate-700 group-hover:scale-105 transition-transform" />
          <span className="hidden sm:inline text-xs font-bold text-slate-700">Menu</span>
        </button>

        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            id="global-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anything... (Sales, Products, Customers)"
            className="w-full pl-9 pr-14 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-xs"
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-xs">
              Ctrl+K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right side: Today Target, Quick Add, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        <SyncBadge />
        {/* Today Target Badge (Red pill like in screenshot) */}
        <button
          id="btn-today-target-header"
          onClick={() => onNavigate("targets")}
          className="flex h-9 min-w-0 items-center gap-1.5 rounded bg-primary px-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:px-3"
          title="View Target Command Center"
        >
          <Target className="w-3.5 h-3.5 animate-pulse" />
          <span className="hidden md:inline font-bold text-[11px] uppercase">Today target</span>
          <span className={`text-[11px] font-bold ${todayNetProfit > todayTarget ? 'text-positive' : todayNetProfit < todayTarget ? 'text-destructive' : 'text-primary-foreground'}`}>{todayNetProfit > todayTarget ? '+' : todayNetProfit < todayTarget ? '-' : ''}${Math.abs(todayNetProfit - todayTarget).toFixed(2)}</span>
          <span className="hidden xl:inline text-[11px] font-medium opacity-75">target ${todayTarget.toFixed(2)} · profit ${todayNetProfit.toFixed(2)}</span>
        </button>

        {/* Quick Add Dropdown */}
        <div className="relative" ref={quickAddRef}>
          <button
            id="btn-quick-add-header"
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-lime-400 stroke-[3]" />
            <span className="hidden sm:inline">Quick Add</span>
          </button>

          {showQuickAdd && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Quick Actions
              </div>
              <button
                onClick={() => {
                  setShowQuickAdd(false);
                  onOpenNewSale();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">New Sale</div>
                  <div className="text-[10px] text-slate-400">Record customer invoice</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickAdd(false);
                  onOpenNewExpense();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Add Expense</div>
                  <div className="text-[10px] text-slate-400">Log cost or operating bill</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickAdd(false);
                  onOpenNewIncome();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Add Income</div>
                  <div className="text-[10px] text-slate-400">Commission or other intake</div>
                </div>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                onClick={() => {
                  setShowQuickAdd(false);
                  onOpenNewCustomer();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">New Customer</div>
                  <div className="text-[10px] text-slate-400">Add client & credit account</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickAdd(false);
                  onOpenNewProduct();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <PackagePlus className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">New Product</div>
                  <div className="text-[10px] text-slate-400">Add SKU, cost & pricing</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickAdd(false);
                  onOpenNewDriver();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">New Driver</div>
                  <div className="text-[10px] text-slate-400">Register delivery partner</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Multi-Portal Launcher */}
        <PortalLauncher />

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            id="btn-notifications-header"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 relative transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <span className="text-xs font-bold text-slate-900">Activity Notifications</span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Live Synced
                </span>
              </div>
              <div className="space-y-2">
                {sales.slice(0, 3).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-start gap-2 p-2 rounded-xl hover:bg-slate-50 text-xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-slate-900">
                        {s.invoiceNo} • ${s.grandTotal.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {s.customerName} ({s.paymentMethod})
                      </p>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {s.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Badge */}
        <div
          onClick={() => onNavigate("settings")}
          className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
          title="User Profile & Settings"
        >
          <div className="w-8 h-8 rounded-full bg-slate-900 text-lime-400 font-bold text-xs flex items-center justify-center ring-2 ring-slate-100 uppercase">
            {currentUser.name.slice(0, 2)}
          </div>
          <div className="hidden xl:block text-left text-xs leading-tight">
            <div className="font-bold text-slate-800">{currentUser.name}</div>
            <div className="text-[10px] text-slate-400">{currentUser.role}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
