import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Phase = 'checking' | 'login' | 'not_staff' | 'ready';

/**
 * The admin system only opens for a signed-in staff account, so every change is
 * stored in the cloud database (source of truth) — never only inside one browser.
 * The first account ever created becomes the Owner.
 */
export const StaffGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [phase, setPhase] = useState<Phase>('checking');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [offlineOk, setOfflineOk] = useState(false);

  const check = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return setPhase('login');
    if (!navigator.onLine) return setPhase('ready'); // cached session: work offline, sync later
    const { data: r, error } = await supabase.rpc('claim_first_owner');
    if (error) return setPhase('ready'); // network hiccup: keep working, sync retries
    setPhase((r as { staff?: boolean })?.staff ? 'ready' : 'not_staff');
  };

  useEffect(() => { void check(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    const res = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
      : await supabase.auth.signUp({ email: email.trim(), password: pw, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (res.error) {
      const m = res.error.message;
      setErr(/invalid login/i.test(m) ? 'Email ama password khaldan.' : /already registered/i.test(m) ? 'Email-kan akoon ayuu leeyahay — gal.' : /at least 6/i.test(m) ? 'Password-ku waa inuu ahaadaa ugu yaraan 6 xaraf.' : /weak|pwned|leaked|compromised/i.test(m) ? 'Password-kan waa mid daciif ah ama hore u baxay — dooro mid adag.' : m);
      return;
    }
    if (!res.data.session) { setErr('Akoonka waa la sameeyay. Gal hadda.'); setMode('in'); return; }
    setPhase('checking');
    void check();
  };

  if (phase === 'ready' || offlineOk) return <>{children}</>;

  const shell = (body: React.ReactNode) => (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-950 px-5">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-2xl">⚡</div>
          <h1 className="text-lg font-extrabold text-slate-900">BANADIR STORE</h1>
        </div>
        {body}
      </div>
    </div>
  );

  if (phase === 'checking') return shell(<p className="text-center text-sm text-slate-500">Waa la hubinayaa...</p>);

  if (phase === 'not_staff') return shell(
    <div className="space-y-3 text-center text-sm">
      <p className="font-bold text-rose-700">Akoonkan weli looma oggolaan system-ka.</p>
      <p className="text-slate-600">Owner-ka ha kugu daro: Settings → System Management → Shaqaalaha.</p>
      <button onClick={() => { void supabase.auth.signOut().then(() => setPhase('login')); }} className="w-full rounded-xl bg-slate-900 py-2.5 font-bold text-white">Ka bax</button>
    </div>
  );

  return shell(
    <form onSubmit={submit} className="space-y-3">
      <p className="text-center text-xs text-slate-500">
        {mode === 'in' ? 'Gal si xogtaada si joogto ah online loogu kaydiyo.' : 'Akoonka ugu horreeya wuxuu noqonayaa Owner.'}
      </p>
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
      <input type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
      {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-slate-900 py-2.5 font-bold text-amber-300 disabled:opacity-50">
        {busy ? '...' : mode === 'in' ? 'Gal' : 'Samee Akoon'}
      </button>
      <button type="button" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(''); }} className="w-full text-xs font-bold text-slate-600">
        {mode === 'in' ? 'Akoon ma lihid? Samee mid cusub' : 'Akoon horay ayaad u leedahay? Gal'}
      </button>
      {!navigator.onLine && (
        <button type="button" onClick={() => setOfflineOk(true)} className="w-full rounded-xl border border-slate-300 py-2 text-xs font-bold">
          Internet ma jiro — sii wad offline (waa la kaydin doonaa marka aad gasho)
        </button>
      )}
    </form>
  );
};
