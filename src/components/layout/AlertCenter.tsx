import { useEffect, useRef, useState } from "react";
import { BellRing, X } from "lucide-react";
import { useTrackItems } from "../../lib/tracking-items";
import { updateTrack, todayStr } from "../../lib/tracking-store";

function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.2, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.3);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    /* ignore */
  }
}

function notify(title: string, body: string) {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") new Notification(title, { body });
    else if (Notification.permission === "default") Notification.requestPermission();
  } catch {
    /* ignore */
  }
}

export function AlertCenter({ onOpen }: { onOpen: () => void }) {
  const items = useTrackItems();
  const [, tick] = useState(0);
  const [hidden, setHidden] = useState(false);
  const lastKey = useRef("");

  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const cash = items.filter((i) => i.cashOverdue);
  const debts = items.filter((i) => i.debtState === "soon" || i.debtState === "overdue");
  const today = todayStr();
  const freshDebt = debts.filter((d) => d.track.lastDebtReminder !== today);

  // Sound + notification: every minute while cash is overdue; once per day per debt.
  useEffect(() => {
    const minute = Math.floor(Date.now() / 60000);
    const key = `${cash.length}:${freshDebt.length}:${cash.length ? minute : ""}`;
    if ((cash.length || freshDebt.length) && key !== lastKey.current) {
      lastKey.current = key;
      beep();
      setHidden(false);
      if (cash.length)
        notify(
          "Lacagta Driver-ka",
          `${cash.length} driver ayaan lacagta soo collect garayn 1 saac kadib.`,
        );
      if (freshDebt.length) {
        notify(
          "Xasuusin Deyn",
          `${freshDebt.length} macmiil ayaa deyn bixintiisu dhow tahay ama dhaaftay.`,
        );
        freshDebt.forEach((d) => updateTrack(d.id, { lastDebtReminder: today }));
      }
    }
  });

  if (!cash.length && !debts.length) return null;
  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="fixed bottom-5 right-5 z-50 bg-red-600 text-white rounded-full p-4 shadow-2xl animate-bounce"
      >
        <BellRing className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 bg-white text-red-600 rounded-full text-xs font-black px-2">
          {cash.length + debts.length}
        </span>
      </button>
    );
  }
  return (
    <div className="fixed bottom-5 right-5 z-50 w-[340px] max-w-[92vw] bg-white border-2 border-red-500 rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-red-600 text-white px-4 py-3 flex items-center gap-2 animate-pulse">
        <BellRing className="w-5 h-5 animate-bounce" />
        <b className="flex-1 text-sm">Digniin — Xasuusin</b>
        <button onClick={() => setHidden(true)} aria-label="Xir">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-sm">
        {cash.map((c) => (
          <div key={c.id} className="px-4 py-2">
            <b className="text-red-700">Wac {c.carrier}</b> — ${c.balance.toFixed(2)} lacag ah (
            {c.ref}) weli lama soo dirin.
          </div>
        ))}
        {debts.map((d) => (
          <div key={d.id} className="px-4 py-2">
            <b className={d.debtState === "overdue" ? "text-red-700" : "text-amber-700"}>
              Wac {d.customer}
            </b>{" "}
            — deyn ${d.balance.toFixed(2)}{" "}
            {d.debtState === "overdue" ? "waqtigii waa dhaafay" : "bixintu waa berri"}.
          </div>
        ))}
      </div>
      <button onClick={onOpen} className="w-full bg-slate-900 text-lime-400 py-2 text-xs font-bold">
        Fur Tracking
      </button>
    </div>
  );
}
