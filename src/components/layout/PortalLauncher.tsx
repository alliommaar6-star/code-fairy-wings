import React, { useState } from "react";
import {
  ShieldAlert,
  Truck,
  Store,
  ChevronDown,
  Lock,
  LogOut,
  Sparkles,
  KeyRound,
  X,
  Check,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { SystemPortal } from "../../types";

export const PortalLauncher: React.FC = () => {
  const { currentPortal, isPortalAuthenticated, loginToPortal, logoutPortal, switchPortal } =
    useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [targetPortal, setTargetPortal] = useState<SystemPortal | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const portals: {
    id: SystemPortal;
    label: string;
    sub: string;
    icon: React.ElementType;
    color: string;
    defaultUser: string;
    defaultPass: string;
  }[] = [
    {
      id: "banadir",
      label: "Banadir ERP",
      sub: "Main Retail & Business Suite",
      icon: Store,
      color: "bg-emerald-500 text-white",
      defaultUser: "Banadir",
      defaultPass: "1234",
    },
    {
      id: "delivery",
      label: "Delivery App",
      sub: "Rider & COD Handover Portal",
      icon: Truck,
      color: "bg-sky-500 text-white",
      defaultUser: "Delivery",
      defaultPass: "12345",
    },
    {
      id: "super_admin",
      label: "Super Admin",
      sub: "Control Plane & Master Logs",
      icon: ShieldAlert,
      color: "bg-amber-500 text-slate-950",
      defaultUser: "admin",
      defaultPass: "123456",
    },
  ];

  const currentConfig = portals.find((p) => p.id === currentPortal) || portals[0];

  const handleOpenLogin = (portal: SystemPortal) => {
    setTargetPortal(portal);
    const cfg = portals.find((p) => p.id === portal);
    if (cfg) {
      setUsername(cfg.defaultUser);
      setPassword(cfg.defaultPass);
    }
    setAuthError(null);
    setIsOpen(false);
  };

  const handleInstantSwitch = (portal: SystemPortal) => {
    const cfg = portals.find((p) => p.id === portal);
    if (cfg) {
      const ok = loginToPortal(portal, cfg.defaultUser, cfg.defaultPass);
      if (ok) {
        setTargetPortal(null);
        setIsOpen(false);
      }
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPortal) return;
    const ok = loginToPortal(targetPortal, username, password);
    if (ok) {
      setTargetPortal(null);
      setUsername("");
      setPassword("");
      setAuthError(null);
    } else {
      setAuthError("Magaca ama sirta waa qalad! Fadlan isticmaal xogta tusaalaha.");
    }
  };

  return (
    <>
      {/* Portal Trigger Pill */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-white text-xs font-semibold border border-slate-700 shadow-sm transition"
        >
          <div
            className={`w-2 h-2 rounded-full ${currentPortal === "super_admin" ? "bg-amber-400" : currentPortal === "delivery" ? "bg-sky-400" : "bg-emerald-400"} animate-pulse`}
          />
          <span>{currentConfig.label}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Dooro Portal (Switch Portal)
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Nidaamka wuxuu leeyahay 3 portal oo si toos ah isugu xiran
              </div>
            </div>

            <div className="py-1 space-y-1">
              {portals.map((p) => {
                const Icon = p.icon;
                const isCurrent = currentPortal === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleInstantSwitch(p.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between group ${
                      isCurrent ? "bg-slate-100 font-bold" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.color} shadow-xs`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{p.label}</div>
                        <div className="text-[10px] text-slate-500">{p.sub}</div>
                      </div>
                    </div>

                    {isCurrent ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        Switch
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 px-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Ku xiran: {currentConfig.label}</span>
              <button
                onClick={() => {
                  logoutPortal();
                  setIsOpen(false);
                }}
                className="text-rose-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <LogOut className="w-3 h-3" />
                Ka Bax
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Login Authentication Modal */}
      {targetPortal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-lime-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Galitaanka {portals.find((p) => p.id === targetPortal)?.label}
                  </h3>
                  <p className="text-xs text-slate-500">Geli magaca iyo furaha sirta ah</p>
                </div>
              </div>
              <button
                onClick={() => setTargetPortal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {authError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700">
                {authError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Quick credential chips */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600">
                <div className="font-semibold text-slate-700 mb-1">
                  Xogta Tusaalaha (Demo Login):
                </div>
                <div className="font-mono">
                  User: <strong>{portals.find((p) => p.id === targetPortal)?.defaultUser}</strong> |
                  Pass: <strong>{portals.find((p) => p.id === targetPortal)?.defaultPass}</strong>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetPortal(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Ka Noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-lime-400 font-bold text-xs rounded-xl shadow-sm transition"
                >
                  Soo Gal (Login)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
