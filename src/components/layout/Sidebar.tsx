import React from "react";
import {
  LayoutGrid,
  ShoppingCart,
  RotateCcw,
  ClipboardList,
  Users,
  Sparkles,
  Package,
  ShoppingBag,
  Building2,
  Truck,
  Car,
  DollarSign,
  Wallet,
  Receipt,
  TrendingUp,
  BarChart3,
  Target,
  BookOpen,
  ShieldCheck,
  Settings,
  Zap,
  ChevronRight,
  X,
  MapPin,
  LineChart,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { canAccess, useStaffRole } from "@/lib/roles";

export type NavSection =
  | "dashboard"
  | "sales"
  | "returns"
  | "orders"
  | "customers"
  | "products"
  | "inventory"
  | "purchases"
  | "suppliers"
  | "delivery"
  | "cargo"
  | "tracking"
  | "drivers"
  | "payments"
  | "accounts"
  | "expenses"
  | "income"
  | "reports"
  | "targets"
  | "accounting"
  | "insights"
  | "users"
  | "settings"
  | "pos";

export interface SidebarProps {
  activeTab?: NavSection;
  setActiveTab?: (tab: NavSection) => void;
  activeSection?: NavSection;
  onSelectSection?: (section: NavSection) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onOpenNewSale?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  activeSection,
  onSelectSection,
  isOpen = false,
  onClose = () => {},
  onOpenNewSale,
}) => {
  const currentTab = activeSection || propActiveTab || "dashboard";
  const handleSelectTab = onSelectSection || propSetActiveTab || (() => {});
  const { currentUser, settings } = useStore();
  const staffRole = useStaffRole();

  const menuItems = [
    { id: "dashboard" as NavSection, label: "Dashboard", icon: LayoutGrid },
    { id: "orders" as NavSection, label: "Sales / Orders", icon: ClipboardList },
    { id: "customers" as NavSection, label: "Customers", icon: Users },
    { id: "products" as NavSection, label: "Products", icon: Sparkles },
    { id: "inventory" as NavSection, label: "Inventory", icon: Package },
    { id: "purchases" as NavSection, label: "Purchases", icon: ShoppingBag },
    { id: "suppliers" as NavSection, label: "Suppliers", icon: Building2 },
    { id: "delivery" as NavSection, label: "Local Delivery", icon: Truck },
    { id: "cargo" as NavSection, label: "Cargo (Freight)", icon: Truck },
    { id: "tracking" as NavSection, label: "Tracking & Alerts", icon: MapPin },
    { id: "drivers" as NavSection, label: "Delivery", icon: Car },
    { id: "payments" as NavSection, label: "Payments", icon: DollarSign },
    { id: "accounts" as NavSection, label: "Payment Accounts", icon: Wallet },
    { id: "expenses" as NavSection, label: "Expenses", icon: Receipt },
    { id: "income" as NavSection, label: "Income", icon: TrendingUp },
    { id: "reports" as NavSection, label: "Reports", icon: BarChart3 },
    { id: "targets" as NavSection, label: "Targets", icon: Target },
    { id: "accounting" as NavSection, label: "Accounting", icon: BookOpen },
    { id: "insights" as NavSection, label: "Stock Advisor (AI)", icon: LineChart },
    { id: "users" as NavSection, label: "Users & Roles", icon: ShieldCheck },
    { id: "settings" as NavSection, label: "Settings", icon: Settings },
  ].filter((m) => canAccess(staffRole, m.id));

  const handleSelect = (tab: NavSection) => {
    handleSelectTab(tab);
    // Marka shay la doorto, si toos ah u fur boggaas kadibna xir sidebar-ka (mobile iyo desktop labadaba)
    onClose();
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop — guji meel kasta oo bannaan si aad u xirto (mobile iyo desktop labadaba) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 z-40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in lg:hidden"
          onClick={onClose}
          aria-label="Xir Menu-ga"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] bg-[#0d131f] text-slate-300 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out select-none border-r border-slate-800/80 lg:static lg:z-auto lg:shadow-none lg:pointer-events-auto lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1e293b] border border-amber-500/30 flex items-center justify-center shadow-inner relative group">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div>
              <h1 className="text-white font-bold text-[15px] tracking-tight leading-none flex items-center gap-1.5">
                {settings.storeName}
              </h1>
              <span className="text-slate-400 text-xs font-medium tracking-wide">
                Online POS • Cycle 1
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors lg:hidden"
            title="Xir / Qari Menu-ga (Collapse)"
            aria-label="Xir / Qari Menu-ga"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Launch POS Button */}
        <div className="px-3 pt-3">
          <button
            id="quick-pos-launch-btn"
            onClick={() => handleSelect("pos")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs tracking-wide transition-all shadow-sm ${
              currentTab === "pos"
                ? "bg-[#bef264] text-black font-bold shadow-md shadow-lime-950/20 ring-1 ring-lime-400"
                : "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30"
            }`}
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Quick POS Terminal
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300">
              F2
            </span>
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          <div className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            Main Menu
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-all group ${
                  isActive
                    ? "bg-[#bef264] text-black font-semibold shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? "text-black" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-black opacity-80" />}
              </button>
            );
          })}
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#090d16]/70">
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#bef264] text-black font-bold text-xs flex items-center justify-center uppercase ring-2 ring-slate-800">
                {currentUser.name.slice(0, 2)}
              </div>
              <div className="leading-tight text-left">
                <div className="text-white text-xs font-semibold">{currentUser.name}</div>
                <div className="text-slate-400 text-[11px]">{currentUser.role}</div>
              </div>
            </div>
            <span
              className="w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20"
              title="Online"
            />
          </div>
        </div>
      </aside>
    </>
  );
};
