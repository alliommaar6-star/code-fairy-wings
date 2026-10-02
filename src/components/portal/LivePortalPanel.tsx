import React, { useCallback, useEffect, useState } from "react";
import type { Order } from "../../types";
import {
  completeOrder,
  getStaffSession,
  loadAttempts,
  loadServerOrder,
  portalUrlFor,
  publishOrder,
  regenerateToken,
  rejectAttempt,
  staffSignIn,
  staffSignUp,
  verifyAttempt,
  type ServerAttempt,
  type ServerOrder,
} from "../../lib/portal-publish";
import { supabase } from "@/integrations/supabase/client";

const money = (value: number) => `$${Number(value || 0).toFixed(2)}`;

export const LivePortalPanel: React.FC<{ order: Order }> = ({ order }) => {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [server, setServer] = useState<ServerOrder | null>(null);
  const [attempts, setAttempts] = useState<ServerAttempt[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const found = await loadServerOrder(order.orderNo);
    setServer(found);
    setAttempts(found ? await loadAttempts(found.id) : []);
  }, [order.orderNo]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const session = await getStaffSession();
      if (!active) return;
      setSignedIn(!!session);
      if (session) await refresh();
    })();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
      if (session) void refresh();
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [refresh]);

  useEffect(() => {
    if (!signedIn || !server) return;
    const interval = setInterval(() => void refresh(), 10000);
    return () => clearInterval(interval);
  }, [signedIn, server, refresh]);

  const handleAuth = async (mode: "in" | "up") => {
    setBusy(true);
    setAuthError(null);
    const error = mode === "in" ? await staffSignIn(email, password) : await staffSignUp(email, password);
    setBusy(false);
    if (error) setAuthError(error);
    else if (mode === "up") setAuthError("Akoon waa la sameeyay. Hadda gal (Sign in).");
  };

  const handlePublish = async () => {
    setBusy(true);
    setMessage(null);
    const result = await publishOrder(order);
    setBusy(false);
    if ("error" in result) {
      setMessage("Lama xafidin server-ka: " + result.error);
      return;
    }
    setServer(result.order);
    setAttempts(await loadAttempts(result.order.id));
    setMessage("Link-ga macmiilka waa diyaar.");
  };

  const url = server ? portalUrlFor(server.token) : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const shareLink = async () => {
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: "Banadir Store — Lacag Bixin", url });
      } catch {
        /* user cancelled */
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank");
    }
  };

  const act = async (fn: () => Promise<{ error: string | null }>, label: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    setMessage(error ? `${label} way fashilantay: ${error}` : `${label} waa la sameeyay.`);
    await refresh();
  };

  return (
    <div className="mt-4 rounded-2xl border border-lime-500/30 bg-slate-900/60 p-4 text-slate-200">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-lime-400">
          Customer Portal (Live)
        </h4>
        {server && (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              server.token_active ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300"
            }`}
          >
            {server.token_active ? "Active" : "Inactive"}
          </span>
        )}
      </div>

      {signedIn === false && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-slate-400">
            Gal si aad u maamusho lacag bixinta macmiilka (xog ammaan ah).
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
          </div>
          {authError && <p className="text-[11px] text-amber-300">{authError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleAuth("in")}
              className="rounded-xl bg-lime-500 px-4 py-2 text-xs font-black text-slate-900 disabled:opacity-60"
            >
              GAL
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleAuth("up")}
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 disabled:opacity-60"
            >
              Samee Akoon
            </button>
          </div>
        </div>
      )}

      {signedIn && !server && (
        <div className="mt-3">
          <p className="text-[11px] text-slate-400">
            Dalabkan weli lagama sameyn link joogto ah oo server ku jira.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handlePublish()}
            className="mt-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-60"
          >
            💳 SAMEE LINK-GA LACAG BIXINTA
          </button>
        </div>
      )}

      {signedIn && server && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
            <div className="rounded-xl bg-slate-800 p-2">
              <p className="text-slate-400">Wadarta</p>
              <p className="font-black text-white">{money(server.total)}</p>
            </div>
            <div className="rounded-xl bg-slate-800 p-2">
              <p className="text-slate-400">La Bixiyay</p>
              <p className="font-black text-emerald-400">{money(server.paid_amount)}</p>
            </div>
            <div className="rounded-xl bg-slate-800 p-2">
              <p className="text-slate-400">Haraaga</p>
              <p className="font-black text-rose-400">
                {money(Math.max(server.total - server.paid_amount, 0))}
              </p>
            </div>
            <div className="rounded-xl bg-slate-800 p-2">
              <p className="text-slate-400">Xaaladda</p>
              <p className="font-black text-white">{server.fulfillment_status}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px]">
            <button type="button" onClick={() => void copyLink()} className="rounded-xl bg-slate-800 px-3 py-2 font-bold">
              {copied ? "Waa La Nuuxiyay" : "Copy Link"}
            </button>
            <button type="button" onClick={() => void shareLink()} className="rounded-xl bg-slate-800 px-3 py-2 font-bold">
              Share
            </button>
            <button type="button" onClick={() => window.open(url, "_blank")} className="rounded-xl bg-slate-800 px-3 py-2 font-bold">
              Open
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handlePublish()}
              className="rounded-xl bg-slate-800 px-3 py-2 font-bold"
            >
              Cusboonaysii Xogta
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  const res = await regenerateToken(server.id);
                  return { error: res.error };
                }, "Token cusub")
              }
              className="rounded-xl bg-amber-600/80 px-3 py-2 font-bold text-white"
            >
              Regenerate Token
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  const res = await completeOrder(server.id);
                  return { error: res.error };
                }, "Dhameystirka dalabka")
              }
              className="rounded-xl bg-emerald-600 px-3 py-2 font-bold text-white"
            >
              Dhameystir + Iib
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            Last accessed:{" "}
            {server.last_accessed_at ? new Date(server.last_accessed_at).toLocaleString() : "weli lama furin"}
          </p>

          <div>
            <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Lacag Bixinada
            </h5>
            {attempts.length === 0 ? (
              <p className="mt-1 text-[11px] text-slate-500">Wali ma jiro lacag bixin.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {attempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-800 p-2.5 text-[11px]"
                  >
                    <div>
                      <p className="font-black text-white">
                        {money(attempt.amount)} · {attempt.method}
                      </p>
                      <p className="text-slate-400">
                        {new Date(attempt.created_at).toLocaleString()} · {attempt.status}
                      </p>
                    </div>
                    {attempt.status === "customer_confirmed" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void act(() => verifyAttempt(attempt.id), "Xaqiijinta")}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 font-black text-white"
                        >
                          VERIFY
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void act(() => rejectAttempt(attempt.id, "Lama helin lacagta"), "Diidmada")
                          }
                          className="rounded-lg bg-rose-600 px-3 py-1.5 font-black text-white"
                        >
                          REJECT
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {message && <p className="mt-3 text-[11px] text-lime-300">{message}</p>}
    </div>
  );
};

export default LivePortalPanel;
