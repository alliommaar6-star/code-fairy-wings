import React, { useState, useMemo } from "react";
import {
  Truck,
  Phone,
  MapPin,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Send,
  Navigation,
  Check,
  AlertCircle,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";

export const DeliveryPortalView: React.FC = () => {
  const {
    currentUser,
    deliveries,
    drivers,
    updateDeliveryStatus,
    handoverDriverCash,
    accounts,
    addAuditLog,
  } = useStore();

  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || "");
  const [showHandoverModal, setShowHandoverModal] = useState<boolean>(false);
  const [handoverSuccess, setHandoverSuccess] = useState<string | null>(null);

  // Active driver identity
  const currentDriver = useMemo(() => {
    return (
      drivers.find((d) => d.id === "drv-1" || d.name.toLowerCase().includes("guled")) ||
      drivers[0] || {
        id: "drv-1",
        name: currentUser.name || "Guled Nuur Ali",
        phone: "+252 61 555 1122",
        vehicleType: "Motorcycle (Honda 125)",
        status: "Active",
        cashHeld: 65.0,
        pendingDeliveries: 3,
        totalDeliveriesCompleted: 142,
      }
    );
  }, [drivers, currentUser]);

  // Deliveries for this driver
  const driverDeliveries = useMemo(() => {
    return deliveries.filter(
      (d) => !d.driverId || d.driverId === currentDriver.id || d.driverName === currentDriver.name,
    );
  }, [deliveries, currentDriver]);

  const activeDeliveries = useMemo(() => {
    return driverDeliveries.filter((d) => d.status !== "Delivered" && d.status !== "Failed");
  }, [driverDeliveries]);

  const completedDeliveries = useMemo(() => {
    return driverDeliveries.filter((d) => d.status === "Delivered");
  }, [driverDeliveries]);

  const handleStartTransit = (deliveryId: string) => {
    updateDeliveryStatus(deliveryId, "In Transit");
  };

  const handleCompleteDelivery = (deliveryId: string, _cashToCollect: number) => {
    updateDeliveryStatus(deliveryId, "Delivered", currentDriver.id);
  };

  const handleExecuteHandover = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentDriver.cashHeld <= 0) {
      alert("Ma jirto lacag kaash ah oo aad gacanta ku hayso.");
      return;
    }
    handoverDriverCash(currentDriver.id, selectedAccountId);
    setShowHandoverModal(false);
    setHandoverSuccess(`Waxaad si guul leh lacagta ugu wareejisay qasnadda dukaanka.`);
    setTimeout(() => setHandoverSuccess(null), 4000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Driver Identity Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-lime-400 text-black flex items-center justify-center font-extrabold text-lg shadow-md">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Online Rider
                </span>
                <span className="text-xs text-slate-400">{currentDriver.vehicleType}</span>
              </div>
              <h1 className="text-xl font-bold text-white mt-1">{currentDriver.name}</h1>
              <p className="text-xs text-slate-400">{currentDriver.phone}</p>
            </div>
          </div>

          {/* Cash In Hand Box */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 flex items-center gap-4">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Lacagta Gacanta (COD)</div>
              <div className="text-xl font-mono font-bold text-lime-400">
                ${currentDriver.cashHeld.toFixed(2)}
              </div>
            </div>
            <button
              onClick={() => setShowHandoverModal(true)}
              className="px-3 py-2 bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-bold rounded-lg transition shadow-sm"
            >
              Wareeji Lacagta
            </button>
          </div>
        </div>
      </div>

      {handoverSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{handoverSuccess}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "active"
              ? "bg-slate-900 text-lime-400 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Clock className="w-4 h-4" />
          Dalabaadka Firfircoon ({activeDeliveries.length})
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "completed"
              ? "bg-slate-900 text-lime-400 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          La Dhameeyay ({completedDeliveries.length})
        </button>
      </div>

      {/* Deliveries List */}
      {activeTab === "active" ? (
        <div className="space-y-3">
          {activeDeliveries.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400 text-xs">
              Wax dalab ah oo kuu qorsheysan hadda ma jiraan.
            </div>
          ) : (
            activeDeliveries.map((del) => (
              <div
                key={del.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                      {del.invoiceNo}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{del.customerName}</h3>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      del.status === "In Transit"
                        ? "bg-sky-100 text-sky-800 border border-sky-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {del.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <a
                      href={`tel:${del.customerPhone}`}
                      className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {del.customerPhone}
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                        Wac Hadda
                      </span>
                    </a>
                  </div>

                  <div className="flex items-start gap-1.5 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{del.deliveryAddress}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between border border-slate-100">
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">
                      Lacagta Laga Rabo (Cash to Collect)
                    </div>
                    <div className="text-base font-bold font-mono text-emerald-700">
                      ${del.cashToCollect.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {del.status !== "In Transit" && (
                      <button
                        onClick={() => handleStartTransit(del.id)}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        Bilow Gaarsiinta
                      </button>
                    )}

                    <button
                      onClick={() => handleCompleteDelivery(del.id, del.cashToCollect)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-lime-400 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
                    >
                      <Check className="w-3.5 h-3.5 text-lime-400" />
                      La Gaarsiiyay & Qabo ${del.cashToCollect.toFixed(2)}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {completedDeliveries.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400 text-xs">
              Weli ma jiraan dalabaad la dhamaystiray.
            </div>
          ) : (
            completedDeliveries.map((del) => (
              <div
                key={del.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-slate-700">{del.invoiceNo}</div>
                  <div className="text-sm font-semibold text-slate-900">{del.customerName}</div>
                  <div className="text-xs text-slate-500">{del.deliveryAddress}</div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-emerald-700 font-bold font-mono">
                    +${del.cashCollected.toFixed(2)} Collected
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold uppercase">
                    Delivered
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Cash Handover Modal */}
      {showHandoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Wareejinta Lacagta Gacanta (COD Deposit)
            </h3>
            <p className="text-xs text-slate-600">
              Waxaad ku wareejineysaa lacagta qasnadda dukaanka:{" "}
              <strong className="text-slate-900 font-mono">
                ${currentDriver.cashHeld.toFixed(2)}
              </strong>
            </p>

            <form onSubmit={handleExecuteHandover} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Xisaabta / Qasnadda Loo Wareejinayo
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type}) - ${acc.balance.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHandoverModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Ka Noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-lime-400 font-bold text-xs rounded-lg transition shadow-xs"
                >
                  Xaqiiji Wareejinta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
