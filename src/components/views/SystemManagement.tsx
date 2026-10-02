import React, { useEffect, useState } from 'react';
import { Database, Download, Upload, Cloud, ShieldCheck, Trash2, Activity, History, AlertTriangle } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { getSyncStatus, subscribeSync, pendingCount, flush } from '@/lib/cloud-sync';
import { normalizeRole, ROLE_LABELS } from '@/lib/roles';

/** Business data keys cleared by Hard Reset (configuration such as settings, payment-account lists, delivery companies is kept). */
const RESET_KEYS: Record<string, string> = {
  benadir_products: '[]', benadir_inventory_movements: '[]', benadir_customers: '[]', benadir_suppliers: '[]',
  benadir_supplier_payments: '[]', benadir_sales: '[]', benadir_orders: '[]', benadir_returns: '[]',
  benadir_drivers: '[]', benadir_deliveries: '[]', benadir_transfers: '[]', benadir_expenses: '[]',
  benadir_incomes: '[]', benadir_purchases: '[]', benadir_cargo: '[]', benadir_audit_logs: '[]',
  benadir_tracking_v1: '{}', benadir_journal_manual_v1: '[]', benadir_ai_accountant_chat_v1: '[]',
};

const DATA_LABELS: [string, string][] = [
  ['benadir_products', 'Products'], ['benadir_customers', 'Customers'], ['benadir_suppliers', 'Suppliers'],
  ['benadir_sales', 'Sales'], ['benadir_orders', 'Orders'], ['benadir_returns', 'Returns'],
  ['benadir_purchases', 'Purchases'], ['benadir_expenses', 'Expenses'], ['benadir_incomes', 'Incomes'],
  ['benadir_inventory_movements', 'Stock movements'], ['benadir_accounts', 'Payment accounts'],
  ['benadir_journal_manual_v1', 'Manual journal entries'], ['benadir_audit_logs', 'Audit log entries'],
];

function count(key: string): number {
  try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0; } catch { return 0; }
}
function allKeys() {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (k.startsWith('benadir_') && !k.startsWith('benadir__') && k !== 'benadir_portal_auth') out[k] = localStorage.getItem(k)!;
  }
  return out;
}

const StaffAndHistory: React.FC = () => {
  const [staff, setStaff] = useState<{ user_id: string; email: string | null; role: string }[]>([]);
  const [versions, setVersions] = useState<{ id: number; key: string; archived_at: string; size: number }[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [msg, setMsg] = useState('');
  const load = async () => {
    const { data: s } = await supabase.from('staff_members').select('user_id, email, role').order('created_at');
    setStaff(s || []);
    const { data: v } = await supabase.from('app_state_history').select('id, key, archived_at, value').order('archived_at', { ascending: false }).limit(40);
    setVersions((v || []).map((r) => {
      const raw = (r.value as { s?: string } | null)?.s || '';
      let size = 0; try { const j = JSON.parse(raw); size = Array.isArray(j) ? j.length : Object.keys(j || {}).length; } catch { /* ignore */ }
      return { id: r.id as number, key: r.key as string, archived_at: r.archived_at as string, size };
    }));
  };
  useEffect(() => { void load(); }, []);
  const add = async () => {
    setMsg('');
    const { data, error } = await supabase.rpc('owner_add_staff', { p_email: newEmail });
    const r = data as { error?: string } | null;
    if (error || r?.error) return setMsg(r?.error === 'no_account' ? 'Qofkan marka hore ha sameeyo akoon (Samee Akoon).' : r?.error === 'not_owner' ? 'Kaliya Owner-ka.' : 'Cilad.');
    setNewEmail(''); setMsg('Waa la ku daray.'); void load();
  };
  const setRole = async (id: string, role: string) => {
    setMsg('');
    const { data, error } = await supabase.from('staff_members').update({ role }).eq('user_id', id).select('user_id');
    if (error || !data?.length) return setMsg('Role could not be saved — only the owner can change roles.');
    setMsg('Role updated.'); void load();
  };
  const remove = async (id: string) => {
    if (!window.confirm('Ka saar shaqaalahan?')) return;
    await supabase.rpc('owner_remove_staff', { p_user: id }); void load();
  };
  const restore = async (id: number, key: string) => {
    if (!window.confirm(`Soo celi nooca hore ee "${key.replace('benadir_', '')}"? Xogta hadda ee qeybtan waxaa lagu beddelayaa nooca la doortay (kan hadda sidoo kale waa la kaydinayaa).`)) return;
    const { data } = await supabase.from('app_state_history').select('value').eq('id', id).single();
    const s = (data?.value as { s?: string } | null)?.s;
    if (typeof s !== 'string') return alert('Lama helin.');
    localStorage.setItem(key, s);
    await flush();
    window.location.reload();
  };
  const card = 'bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3';
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className={card}>
        <div className="font-bold text-slate-800">Staff accounts (Shaqaalaha)</div>
        <ul className="text-sm divide-y divide-slate-100">
          {staff.map((m) => (
            <li key={m.user_id} className="py-1.5 flex justify-between items-center gap-2">
              <span className="truncate">{m.email || m.user_id.slice(0, 8)}</span>
              {m.role === 'owner' ? <b className="text-[10px] uppercase text-slate-500">Owner</b> : (
                <span className="flex items-center gap-2">
                  <select value={normalizeRole(m.role)} onChange={(e) => void setRole(m.user_id, e.target.value)} className="rounded-lg border border-slate-300 px-1.5 py-0.5 text-xs">
                    {(['admin', 'cashier', 'inventory'] as const).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                  <button onClick={() => void remove(m.user_id)} className="text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </span>
              )}
            </li>
          ))}
          {staff.length === 0 && <li className="py-1.5 text-slate-500">No staff yet.</li>}
        </ul>
        <div className="flex gap-2">
          <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email-ka shaqaalaha" className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <button onClick={() => void add()} className="rounded-xl bg-slate-900 text-white px-3 text-sm font-bold">Ku dar</button>
        </div>
        {msg && <p className="text-xs font-bold text-slate-600">{msg}</p>}
      </div>
      <div className={card}>
        <div className="font-bold text-slate-800">Cloud version history (soo celin)</div>
        <p className="text-xs text-slate-500">Isbeddel kasta nooca hore waa la kaydiyaa weligiis. Haddii xog lumo, halkan ka soo celi.</p>
        {versions.length === 0 ? <p className="text-sm text-slate-500">No previous versions yet.</p> : (
          <ul className="text-xs divide-y divide-slate-100 max-h-60 overflow-auto">
            {versions.map((v) => (
              <li key={v.id} className="py-1.5 flex justify-between items-center gap-2">
                <span className="truncate"><b>{v.key.replace('benadir_', '')}</b> · {v.size} · <span className="text-slate-400">{new Date(v.archived_at).toLocaleString()}</span></span>
                <button onClick={() => void restore(v.id, v.key)} className="shrink-0 rounded-lg border border-slate-300 px-2 py-0.5 font-bold">Soo celi</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export const SystemManagement: React.FC = () => {
  const { currentUser, auditLogs } = useStore();
  const [, force] = useState(0);
  const [cloud, setCloud] = useState<{ rows: number; last: string | null; email: string | null } | null>(null);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const isOwner = currentUser.role === 'Owner';

  useEffect(() => { const off = subscribeSync(() => force((n) => n + 1)); return () => { off(); }; }, []);
  useEffect(() => {
    void (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) return setCloud({ rows: 0, last: null, email: null });
      const { data } = await supabase.from('app_state').select('updated_at').order('updated_at', { ascending: false });
      setCloud({ rows: data?.length || 0, last: data?.[0]?.updated_at || null, email: s.session.user.email || null });
    })();
  }, []);

  const status = getSyncStatus();
  const signedIn = !!cloud?.email;

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ app: 'benadir', version: 1, exportedAt: new Date().toISOString(), data: allKeys() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `benadir-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const importBackup = (file: File) => {
    file.text().then((t) => {
      try {
        const j = JSON.parse(t);
        if (j?.app !== 'benadir' || !j.data) throw new Error();
        if (!window.confirm('Restore this backup? Current data will be replaced by the backup contents.')) return;
        for (const [k, v] of Object.entries(j.data as Record<string, string>)) if (k.startsWith('benadir_')) localStorage.setItem(k, v);
        void flush().finally(() => window.location.reload());
      } catch { alert('Invalid backup file.'); }
    });
  };

  const hardReset = async () => {
    if (!isOwner || confirm.trim() !== 'HARD RESET') return;
    setBusy(true);
    // Safety copy of everything before clearing (kept in the cloud, never shown as data).
    if (signedIn) {
      await supabase.from('app_state').upsert({ key: 'benadir__backup_before_hard_reset', value: { s: JSON.stringify(allKeys()) }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }
    for (const [k, v] of Object.entries(RESET_KEYS)) localStorage.setItem(k, v);
    try {
      const acc = JSON.parse(localStorage.getItem('benadir_accounts') || '[]');
      localStorage.setItem('benadir_accounts', JSON.stringify(Array.isArray(acc) ? acc.map((a: { balance?: number }) => ({ ...a, balance: 0 })) : []));
    } catch { /* ignore */ }
    localStorage.setItem('benadir_factory_reset_done', 'true');
    await flush();
    window.location.reload();
  };

  const card = 'bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3';
  const lastMigration = '0010 — staff access & permanent version history (additive)';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-emerald-600" />
        <h2 className="font-extrabold text-slate-900 text-lg">System Management</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className={card}>
          <div className="flex items-center gap-2 font-bold text-slate-800"><Cloud className="w-4 h-4" /> Database status</div>
          <div className="text-sm space-y-1">
            <div>Cloud database: <b className={signedIn ? 'text-emerald-700' : 'text-rose-700'}>{signedIn ? 'Connected' : 'Not signed in'}</b></div>
            <div>Sync: <b>{status}</b> · pending changes: <b>{pendingCount()}</b></div>
            <div>Stored records groups: <b>{cloud?.rows ?? '…'}</b></div>
            <div>Last cloud save: <b>{cloud?.last ? new Date(cloud.last).toLocaleString() : '—'}</b></div>
            {signedIn && <div className="text-xs text-slate-500">Staff: {cloud?.email}</div>}
          </div>
          {!signedIn && cloud && (
            <p className="text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-2">
              Data is only on this device until a staff account signs in (top bar). Sign in so data is saved permanently in the cloud and survives updates, new devices and new accounts.
            </p>
          )}
        </div>

        <div className={card}>
          <div className="flex items-center gap-2 font-bold text-slate-800"><Activity className="w-4 h-4" /> Health & migrations</div>
          <ul className="text-sm space-y-1">
            <li>Persistence: <b>cloud database (source of truth) + offline copy</b></li>
            <li>Startup seeding: <b className="text-emerald-700">disabled — no sample data</b></li>
            <li>Migrations: <b>versioned, additive only</b></li>
            <li className="text-xs text-slate-500">Latest: {lastMigration}</li>
            <li>Update / deploy / restart / new account: <b className="text-emerald-700">data preserved</b></li>
          </ul>
        </div>

        <div className={card}>
          <div className="flex items-center gap-2 font-bold text-slate-800"><Database className="w-4 h-4" /> Backup & restore</div>
          <button onClick={exportBackup} className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white py-2 text-sm font-bold"><Download className="w-4 h-4" /> Export full backup</button>
          <label className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-2 text-sm font-bold cursor-pointer">
            <Upload className="w-4 h-4" /> Import backup
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])} />
          </label>
        </div>
      </div>

      <div className={card}>
        <div className="font-bold text-slate-800">Data overview</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {DATA_LABELS.map(([k, l]) => (
            <div key={k} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <div className="text-[11px] text-slate-500">{l}</div>
              <div className="text-xl font-extrabold text-slate-900 tabular-nums">{count(k)}</div>
            </div>
          ))}
        </div>
      </div>

      {signedIn && <StaffAndHistory />}

      <div className={card}>
        <div className="flex items-center gap-2 font-bold text-slate-800"><History className="w-4 h-4" /> Recent activity</div>
        {auditLogs.length === 0 ? <p className="text-sm text-slate-500">No activity yet.</p> : (
          <ul className="text-xs divide-y divide-slate-100 max-h-60 overflow-auto">
            {auditLogs.slice(0, 40).map((l) => (
              <li key={l.id} className="py-1.5 flex gap-2"><span className="text-slate-400 shrink-0">{l.timestamp}</span><b className="shrink-0">{l.action}</b><span className="text-slate-600 truncate">{l.details}</span></li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-2xl border-2 border-rose-300 p-5 space-y-3">
        <div className="flex items-center gap-2 font-extrabold text-rose-800"><AlertTriangle className="w-5 h-5" /> Hard Reset — Clear All Data</div>
        <p className="text-sm text-slate-700">
          The only action that deletes data. Clears products, customers, suppliers, sales, orders, returns, purchases, expenses, incomes, stock movements, tracking, journal and history, and sets balances to 0 — on every device. Settings and account lists are kept. <b>No sample data is created afterwards.</b>
        </p>
        {!isOwner ? <p className="text-sm text-rose-700">Only the Owner can run a Hard Reset.</p> : (
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder='Type "HARD RESET" to confirm' className="flex-1 rounded-xl border border-rose-300 px-3 py-2 text-sm" />
            <button disabled={busy || confirm.trim() !== 'HARD RESET'} onClick={() => { if (window.confirm('Final confirmation: permanently clear all business data?')) void hardReset(); }} className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 disabled:opacity-40 text-white px-4 py-2 text-sm font-bold">
              <Trash2 className="w-4 h-4" /> {busy ? 'Clearing…' : 'Hard Reset'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
