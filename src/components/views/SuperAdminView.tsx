import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  Database,
  Download,
  Upload,
  RefreshCw,
  Users,
  Activity,
  DollarSign,
  AlertTriangle,
  Lock,
  CheckCircle2,
  FileText,
  Search,
  Key,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";

export const SuperAdminView: React.FC = () => {
  const {
    currentUser,
    auditLogs,
    sales,
    products,
    customers,
    accounts,
    orders,
    factoryReset,
    preResetBackup,
    createManualBackup,
    restorePreResetBackup,
    addAuditLog,
    settings,
  } = useStore();

  const [auditSearch, setAuditSearch] = useState("");
  const [auditFilter, setAuditFilter] = useState("ALL");
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);

  // Overall Financial & System KPIs
  const kpis = useMemo(() => {
    const totalSalesVolume = sales.reduce((sum, s) => sum + s.grandTotal, 0);
    const totalInventoryValue = products.reduce((sum, p) => sum + p.costPrice * p.stock, 0);
    const totalReceivables = customers.reduce((sum, c) => sum + Math.max(0, c.balance), 0);
    const totalVaultBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    const totalOrdersCount = orders.length;

    return {
      totalSalesVolume,
      totalInventoryValue,
      totalReceivables,
      totalVaultBalance,
      totalOrdersCount,
    };
  }, [sales, products, customers, accounts, orders]);

  // Filtered audit logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchSearch =
        log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.target.toLowerCase().includes(auditSearch.toLowerCase()) ||
        (log.details?.toLowerCase().includes(auditSearch.toLowerCase()) ?? false) ||
        log.actor.toLowerCase().includes(auditSearch.toLowerCase());

      const matchFilter = auditFilter === "ALL" || log.portal === auditFilter;
      return matchSearch && matchFilter;
    });
  }, [auditLogs, auditSearch, auditFilter]);

  // Export JSON Backup
  const handleExportBackup = () => {
    const backupData = {
      exportDate: new Date().toISOString(),
      store: settings.storeName,
      sales,
      products,
      customers,
      accounts,
      orders,
      auditLogs,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `banadir_erp_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addAuditLog("DATA_BACKUP_EXPORT", "System Database", "Exported JSON full backup file");
  };

  // Factory Reset Handlers
  const handleCreateSnapshot = () => {
    const backup = createManualBackup("Admin Hub Manual Snapshot");
    setBackupNotice(`Nuqul keyd ah ayaa la abuuray (${backup.createdAt}).`);
    setTimeout(() => setBackupNotice(null), 5000);
  };

  const handleRestoreSnapshot = () => {
    if (!preResetBackup) return;
    if (
      confirm(
        `Ma hubtaa inaad dib u soo celiso xogtii kahor dib-u-celinta (${preResetBackup.createdAt})?`,
      )
    ) {
      const restored = restorePreResetBackup();
      if (restored) {
        setResetMessage("Xogtii hore si guul leh ayaa dib loogu soo celiyay.");
        setTimeout(() => setResetMessage(null), 5000);
      } else {
        alert("Khalad ayaa dhacay intii dib loo soo celinayay xogta.");
      }
    }
  };

  const handleExecuteReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetConfirmation.trim() !== "RESET") {
      alert('Fadlan si sax ah u qor "RESET" si aad u xaqiijiso.');
      return;
    }
    const success = factoryReset("RESET");
    if (success) {
      setShowResetConfirm(false);
      setResetConfirmation("");
      setResetMessage(
        "Nidaamka si buuxda ayaa dib loogu celiyay bilowgii (Factory Reset Complete). Xogta hore waxaa lagu keydiyay Restore Point.",
      );
      setTimeout(() => setResetMessage(null), 7000);
    } else {
      alert("Dib u celinta waa la diiday. Kaliya doorka Owner ayaa loo ogolyahay.");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Control Plane Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold shadow-lg">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Level 0 Control Plane
                </span>
                <span className="text-xs text-slate-400">Authenticated as {currentUser.name}</span>
              </div>
              <h1 className="text-2xl font-black text-white mt-1">Super Admin Master Hub</h1>
              <p className="text-xs text-slate-400">
                Kormeerka guud ee xogta xisaabaadka, hubinta badbaadada (Audit Logs), iyo maamulka
                keydka ERP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportBackup}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              Soo Deji Backup (JSON)
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
              Dib u Celinta Bilowga (Factory Reset)
            </button>
          </div>
        </div>
      </div>

      {resetMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* System Health Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Wadarta Dakhliga Iibka</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-900 mt-2">
            ${kpis.totalSalesVolume.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total GMV Invoiced</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Qiimaha Kaydka (Inventory)</span>
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-900 mt-2">
            ${kpis.totalInventoryValue.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">At Cost Valuation</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-rose-600 font-semibold">
            <span>Deyn Macmiil (Receivables)</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-mono font-bold text-rose-600 mt-2">
            ${kpis.totalReceivables.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Uncollected Customer Debt</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
            <span>Kaydka Lacagta (Vaults/EVC)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-700 mt-2">
            ${kpis.totalVaultBalance.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Liquid Balances Across Accounts</div>
        </div>
      </div>

      {/* Role & Permissions Matrix Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-slate-600" />
          Qaab-dhismeedka Xuquuqda Isticmaalayaasha (Access Control Matrix)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="font-bold text-xs text-slate-800">Super Admin / Owner</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Full access, system audits, factory reset, financial controls.
            </div>
            <div className="mt-2 text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block">
              Pass: 123456
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="font-bold text-xs text-slate-800">Banadir Manager</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Full ERP operations, inventory restocking, sales approvals, reporting.
            </div>
            <div className="mt-2 text-[10px] font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">
              Pass: 1234
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="font-bold text-xs text-slate-800">POS Cashier</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Quick sales, receipt issuance, return requests, daily shift cash.
            </div>
            <div className="mt-2 text-[10px] font-mono font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block">
              POS Terminal
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="font-bold text-xs text-slate-800">Delivery Driver</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Assigned parcels, COD cash tracking, delivery mark, direct dialer.
            </div>
            <div className="mt-2 text-[10px] font-mono font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded inline-block">
              Pass: 12345
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="font-bold text-xs text-slate-800">Customer Public</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Live tracking timeline, EVC/Sahal/eDahab USSD dialer, invoice view.
            </div>
            <div className="mt-2 text-[10px] font-mono font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded inline-block">
              No login required
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Trail */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Diiwaanka Dhaqdhaqaaqa Nidaamka (Master Audit Trail)
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
              {filteredLogs.length} logs
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Raadi ficil, actor..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <select
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
            >
              <option value="ALL">Dhammaan Portallada</option>
              <option value="banadir">Banadir ERP</option>
              <option value="super_admin">Super Admin</option>
              <option value="delivery">Delivery App</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Waqtiga</th>
                <th className="py-2.5 px-4">Portal</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">Ficilka (Action)</th>
                <th className="py-2.5 px-4">Bartilmaameedka</th>
                <th className="py-2.5 px-4">Faahfaahinta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                      {log.portal}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-800">{log.actor}</td>
                  <td className="py-2.5 px-4">
                    <span className="font-mono font-bold text-slate-900">{log.action}</span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 font-mono">{log.target}</td>
                  <td className="py-2.5 px-4 text-slate-500 truncate max-w-xs">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Factory Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Controlled Factory Reset (Owner Only)
                </h3>
                <span className="text-[11px] font-bold text-rose-600">
                  Wipes Demo & Business Data • Preserves Architecture & Schema
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-950">
              <p className="font-semibold leading-relaxed">
                Tani waxay masaxaysaa kaliya xogta ganacsiga / muunadda (Sample & Test data) si aad
                u bilowdo ganacsi dhab ah oo nadiif ah:
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="bg-white/70 p-2 rounded border border-rose-200">
                  <span className="font-bold text-rose-900 block mb-0.5">La Masaxayo:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                    <li>Dhammaan Badeecadaha</li>
                    <li>Iibka & Dalabyada</li>
                    <li>Macaamiisha & Deynka</li>
                    <li>Alaab-qeybiyaasha & Iibsiga</li>
                    <li>Dhaqdhaqaaqa Bakhaarka</li>
                  </ul>
                </div>
                <div className="bg-white/70 p-2 rounded border border-emerald-200">
                  <span className="font-bold text-emerald-900 block mb-0.5">La Badbaadinayo:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                    <li>Database Schema & Tables</li>
                    <li>Koontooyinka & Lacagaha</li>
                    <li>Habeynta Settings-ka</li>
                    <li>Qaybaha (Categories & Brands)</li>
                    <li>Audit Logs & Xuquuqaha</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950">
                  Nuqulka Keydka (Authoritative Restore Point):
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">
                  MANDATORY
                </span>
              </div>
              <p className="text-[11px] text-indigo-900 leading-relaxed">
                Nidaamku wuxuu si otomaatig ah u qaadayaa nuqul buuxa oo xogta ah (Pre-Reset
                Snapshot) kahor inta aan waxba la tirtirin, si haddii loo baahdo loogu noqon karo.
              </p>
              {preResetBackup && (
                <div className="text-[11px] font-mono text-indigo-800 pt-1 flex items-center justify-between border-t border-indigo-200 mt-2">
                  <span>Nuqul Hore: {preResetBackup.createdAt}</span>
                  <button
                    type="button"
                    onClick={handleRestoreSnapshot}
                    className="text-xs text-indigo-700 underline font-bold hover:text-indigo-900"
                  >
                    Dib u soo celi kan hore
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleExecuteReset} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Si aad u xaqiijiso, fadlan qor kelmadda{" "}
                  <span className="font-mono text-rose-600 font-black">RESET</span>:
                </label>
                <input
                  type="text"
                  required
                  value={resetConfirmation}
                  onChange={(e) => setResetConfirmation(e.target.value)}
                  placeholder="Geli RESET"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono tracking-widest uppercase focus:ring-2 focus:ring-rose-500 font-bold text-rose-600"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCreateSnapshot}
                  className="px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg"
                >
                  Qaad Backup Hadda
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetConfirm(false);
                      setResetConfirmation("");
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Ka Noqo
                  </button>
                  <button
                    type="submit"
                    disabled={resetConfirmation.trim() !== "RESET"}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-md transition"
                  >
                    Xaqiiji & Bilow Nadiifinta (Execute Reset)
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
