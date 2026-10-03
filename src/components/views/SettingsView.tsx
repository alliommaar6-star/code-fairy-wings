import React, { useState } from "react";
import {
  Settings,
  Store,
  DollarSign,
  Shield,
  RotateCcw,
  CheckCircle2,
  Users,
  Database,
  Building2,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Lock,
  Trash2,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { SystemManagement } from "./SystemManagement";
import { useStaffRole } from "@/lib/roles";

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    currentUser,
    resetToDemoData,
    factoryReset,
    preResetBackup,
    restorePreResetBackup,
  } = useStore();

  const [storeName, setStoreName] = useState(settings.storeName);
  const [storeAddress, setStoreAddress] = useState(settings.storeAddress);
  const [storePhone, setStorePhone] = useState(settings.storePhone);
  const [storeEmail, setStoreEmail] = useState(settings.storeEmail);
  const [currency, setCurrency] = useState(settings.currency);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Controlled Factory Reset State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetCompleted, setResetCompleted] = useState(false);
  const [resetError, setResetError] = useState("");

  const isOwner = useStaffRole() === "owner";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName,
      storeAddress,
      storePhone,
      storeEmail,
      currency,
      receiptFooter,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExecuteFactoryReset = () => {
    setResetError("");
    if (!isOwner) {
      setResetError("Access Denied: Only users with the OWNER role can execute a Factory Reset.");
      return;
    }
    if (resetConfirmText.trim() !== "RESET") {
      setResetError('Type the exact word "RESET" to confirm.');
      return;
    }

    const success = factoryReset("RESET");
    if (success) {
      setResetCompleted(true);
      setShowResetModal(false);
      setResetConfirmText("");
    } else {
      setResetError("Factory reset failed. Please ensure you have Owner privileges.");
    }
  };

  const handleResetDemoData = () => {
    if (
      confirm("Reload Benadir Store sample commercial demonstration catalogue and ledger data?")
    ) {
      resetToDemoData();
      alert("Sample demonstration dataset loaded.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Settings & Commercial Store Profile
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Store branding, currency configuration, receipt details, and database maintenance.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Settings saved successfully.
        </div>
      )}

      {/* Main Settings Form */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5"
      >
        <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
          <Store className="w-4 h-4 text-slate-600" />
          Store Identity & Receipt Header
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Store Name
            </label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-slate-900"
            >
              <option value="USD">USD ($) - US Dollar</option>
              <option value="SOS">SOS (Sh.So) - Somali Shilling</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Email
            </label>
            <input
              type="email"
              value={storeEmail}
              onChange={(e) => setStoreEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Store Physical Location
          </label>
          <input
            type="text"
            value={storeAddress}
            onChange={(e) => setStoreAddress(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Receipt Footer Note
          </label>
          <textarea
            value={receiptFooter}
            onChange={(e) => setReceiptFooter(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95"
          >
            Save Settings
          </button>
        </div>
      </form>

      {/* User Session Profile & Role */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-3">
        <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-600" />
          Active User Session
        </h3>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">{currentUser.name}</div>
              <div className="text-slate-400">{currentUser.email}</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold uppercase text-[10px]">
            {currentUser.role}
          </span>
        </div>
      </div>

      <SystemManagement />

      {/* Reset System Data Section */}
      <div className="bg-white rounded-2xl border border-rose-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-rose-100 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-rose-950 text-base">Controlled Factory Reset</h3>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black uppercase tracking-wider">
            <Lock className="w-3 h-3" /> Owner Only
          </span>
        </div>

        {resetCompleted && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-black text-emerald-950 text-sm">FACTORY RESET COMPLETE</p>
              <p>
                All test and sample business data have been wiped clean. System schemas, roles,
                configuration, and security foundations remain intact and ready for real production
                commercial data.
              </p>
            </div>
          </div>
        )}

        <div className="text-xs text-slate-600 space-y-2">
          <p className="font-medium text-slate-800">
            Execute a controlled factory wipe to prepare the system for live operations or clear
            testing data.
          </p>
          <ul className="list-disc pl-4 space-y-1 text-slate-500">
            <li>
              <strong className="text-slate-700">Deletes:</strong> All sample products, orders,
              sales, customer debt records, inventory movements, purchases, and expenses.
            </li>
            <li>
              <strong className="text-slate-700">Preserves:</strong> Database schema, storage
              architecture, accounts definitions, user roles (RBAC/RLS), and general configuration.
            </li>
          </ul>
        </div>

        {preResetBackup && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-indigo-950">Restore Point Available:</span>
              <span className="text-indigo-800 ml-1.5 font-mono text-[11px]">
                {preResetBackup.createdAt}
              </span>
              <span className="text-slate-500 ml-1 text-[11px]">
                ({preResetBackup.itemCounts.products} items, {preResetBackup.itemCounts.sales}{" "}
                sales)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Restore system snapshot from ${preResetBackup.createdAt}?`)) {
                  restorePreResetBackup();
                  alert("System state restored from pre-reset backup point.");
                }
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shrink-0 transition"
            >
              Restore Previous State
            </button>
          </div>
        )}

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setResetError("");
              setResetConfirmText("");
              setShowResetModal(true);
            }}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Initiate Factory Reset
          </button>
        </div>
      </div>

      {/* Controlled Factory Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-rose-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-rose-950 tracking-tight">
                  Confirm Controlled Factory Reset
                </h3>
                <p className="text-xs text-rose-800">
                  This action is strictly restricted to the <strong>OWNER</strong> role.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Warning: Irreversible Business Data Deletion
                </p>
                <p>
                  You are about to purge all products, inventory ledgers, sales receipts, customer
                  debts, and transaction movements. System infrastructure, user accounts, and
                  financial accounts definitions will be preserved.
                </p>
              </div>

              {!isOwner ? (
                <div className="p-4 rounded-xl bg-rose-100/70 border border-rose-300 text-rose-900 text-xs font-semibold">
                  Access Blocked: Your current user session role is{" "}
                  <strong>{currentUser.role}</strong>. Only users with the <strong>Owner</strong>{" "}
                  role can perform a factory reset.
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    To confirm reset, type{" "}
                    <span className="font-mono text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      RESET
                    </span>{" "}
                    below:
                  </label>
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="RESET"
                    className="w-full px-3.5 py-2.5 text-sm font-mono font-bold tracking-widest border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    autoFocus
                  />
                </div>
              )}

              {resetError && <p className="text-xs text-rose-600 font-semibold">{resetError}</p>}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isOwner || resetConfirmText.trim() !== "RESET"}
                onClick={handleExecuteFactoryReset}
                className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Confirm & Wipe Business Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
