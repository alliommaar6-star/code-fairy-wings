import { useEffect, useState } from "react";
import { Truck, Package, Wallet, CalendarClock, Phone, CheckCircle2, BellRing } from "lucide-react";
import { useTrackItems, TrackItem } from "../../lib/tracking-items";
import { STAGES, updateTrack, TrackStage, HOUR } from "../../lib/tracking-store";

type Tab = "Delivery" | "Cargo" | "cash" | "debt";

const fmtMin = (ms: number) => {
  const m = Math.floor(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}s ${m % 60}d` : `${m} daqiiqo`;
};
const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");

export function TrackingView({ initialTab = "Delivery" }: { initialTab?: Tab }) {
  const items = useTrackItems();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const cash = items.filter(
    (i) =>
      i.kind === "Delivery" &&
      i.track.stage === "delivered" &&
      i.balance > 0 &&
      !i.track.cashCollectedAt,
  );
  const debts = items.filter(
    (i) =>
      i.balance > 0 &&
      !(i.kind === "Delivery" && i.track.stage === "delivered" && !i.track.cashCollectedAt),
  );
  const overdueCash = cash.filter((i) => i.cashOverdue).length;
  const alertDebt = debts.filter((i) => i.debtState === "soon" || i.debtState === "overdue").length;

  const tabs: { id: Tab; label: string; icon: typeof Truck; badge?: number }[] = [
    { id: "Delivery", label: "Delivery (Drivers)", icon: Truck },
    { id: "Cargo", label: "Cargo (Companies)", icon: Package },
    { id: "cash", label: "Lacagta Driver-ka", icon: Wallet, badge: overdueCash },
    { id: "debt", label: "Deynta", icon: CalendarClock, badge: alertDebt },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Tracking</h1>
        <p className="text-sm text-slate-500">
          La soco alaabta la qaaday, tan macmiilku helay, lacagta driver-ka iyo deynta.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition ${tab === t.id ? "bg-slate-900 text-lime-400 border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {!!t.badge && (
              <span className="ml-1 bg-red-600 text-white rounded-full px-2 py-0.5 text-[10px] animate-pulse">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {(tab === "Delivery" || tab === "Cargo") && (
        <StageTable rows={items.filter((i) => i.kind === tab)} kind={tab} />
      )}
      {tab === "cash" && <CashTable rows={cash} />}
      {tab === "debt" && <DebtTable rows={debts} />}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function StageTable({ rows, kind }: { rows: TrackItem[]; kind: "Delivery" | "Cargo" }) {
  if (!rows.length) return <Empty text={`Ma jiro ${kind} weli.`} />;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
          <tr>
            <th className="p-3 text-left">ID</th>
            <th className="p-3 text-left">Macmiil</th>
            <th className="p-3 text-left">{kind === "Cargo" ? "Shirkadda" : "Driver"}</th>
            <th className="p-3 text-left">Heerka</th>
            <th className="p-3 text-left">La Qaaday</th>
            <th className="p-3 text-left">La Helay</th>
            <th className="p-3 text-right">Haraaga</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className={`border-t border-slate-100 ${r.cashOverdue ? "bg-red-50 animate-pulse" : ""}`}
            >
              <td className="p-3 font-bold">
                {r.ref}
                <div className="text-[10px] text-slate-400">{r.date}</div>
              </td>
              <td className="p-3">
                {r.customer}
                <div className="text-[10px] text-slate-400">{r.phone}</div>
              </td>
              <td className="p-3">
                {r.carrier}
                <div className="text-[10px] text-slate-400">{r.carrierPhone}</div>
              </td>
              <td className="p-3">
                <select
                  value={r.track.stage}
                  onChange={(e) => updateTrack(r.id, { stage: e.target.value as TrackStage })}
                  className={`border rounded-lg px-2 py-1 text-xs font-bold ${r.track.stage === "delivered" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : r.track.stage === "failed" ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200"}`}
                >
                  {STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="p-3 text-xs">{fmtTime(r.track.pickedAt)}</td>
              <td className="p-3 text-xs">{fmtTime(r.track.deliveredAt)}</td>
              <td className="p-3 text-right font-bold">${r.balance.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CashTable({ rows }: { rows: TrackItem[] }) {
  if (!rows.length)
    return <Empty text="Driver kuma maqna lacag — dhammaan waa la soo collect gareeyay." />;
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Driver-ku waa inuu lacagta haraaga ah soo collect gareeyaa <b>1 saac gudahood</b> marka
        alaabta la gaarsiiyo. Kuwa dhaafa waxay noqonayaan casaan, alarm-na wuu dhawaaqayaa.
      </p>
      {rows.map((r) => {
        const left = HOUR - r.cashPendingMs;
        return (
          <div
            key={r.id}
            className={`flex flex-wrap items-center gap-4 p-4 rounded-2xl border-2 ${r.cashOverdue ? "border-red-500 bg-red-50 animate-pulse" : "border-amber-300 bg-amber-50"}`}
          >
            <BellRing
              className={`w-6 h-6 ${r.cashOverdue ? "text-red-600 animate-bounce" : "text-amber-600"}`}
            />
            <div className="flex-1 min-w-[200px]">
              <div className="font-black text-slate-900">
                {r.carrier} — ${r.balance.toFixed(2)}
              </div>
              <div className="text-xs text-slate-600">
                {r.ref} · {r.customer} · La gaarsiiyay {fmtTime(r.track.deliveredAt)}
              </div>
              <div
                className={`text-xs font-bold ${r.cashOverdue ? "text-red-700" : "text-amber-700"}`}
              >
                {r.cashOverdue
                  ? `WAQTIGII WAA DHAAFAY — ${fmtMin(r.cashPendingMs - HOUR)} ka badan`
                  : `Waqti haray: ${fmtMin(left)}`}
              </div>
            </div>
            {r.carrierPhone && (
              <a
                href={`tel:${r.carrierPhone}`}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold"
              >
                <Phone className="w-4 h-4" />
                Wac Driver-ka
              </a>
            )}
            <button
              onClick={() =>
                updateTrack(r.id, {
                  cashCollectedAt: new Date().toISOString(),
                  cashCollectedAmount: r.balance,
                })
              }
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
            >
              <CheckCircle2 className="w-4 h-4" />
              Lacagta Waa La Soo Collect Gareeyay
            </button>
          </div>
        );
      })}
    </div>
  );
}

function DebtTable({ rows }: { rows: TrackItem[] }) {
  if (!rows.length) return <Empty text="Ma jiro macmiil deyn ku leh." />;
  const order = { overdue: 0, soon: 1, none: 2, ok: 3 } as const;
  const sorted = [...rows].sort((a, b) => order[a.debtState] - order[b.debtState]);
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Geli taariikhda macmiilku ballanqaaday inuu bixinayo. Maalin ka hor iyo maalin kasta kadib,
        system-ku wuu ku xasuusinayaa.
      </p>
      {sorted.map((r) => (
        <div
          key={r.id}
          className={`flex flex-wrap items-center gap-4 p-4 rounded-2xl border-2 ${r.debtState === "overdue" ? "border-red-500 bg-red-50 animate-pulse" : r.debtState === "soon" ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}`}
        >
          <div className="flex-1 min-w-[200px]">
            <div className="font-black text-slate-900">
              {r.customer} — ${r.balance.toFixed(2)}
            </div>
            <div className="text-xs text-slate-600">
              {r.ref} · {r.date}
              {r.phone ? ` · ${r.phone}` : ""}
            </div>
            {r.debtState === "overdue" && (
              <div className="text-xs font-bold text-red-700">
                WAQTIGII BIXINTA WAA DHAAFAY — wac macmiilka
              </div>
            )}
            {r.debtState === "soon" && (
              <div className="text-xs font-bold text-amber-700">Bixintu waa berri ama maanta</div>
            )}
            {r.debtState === "none" && (
              <div className="text-xs text-slate-400">Taariikh bixin lama gelin</div>
            )}
          </div>
          <label className="text-xs font-bold text-slate-600">
            Taariikhda Bixinta
            <input
              type="date"
              value={r.track.debtDueDate ?? ""}
              onChange={(e) => updateTrack(r.id, { debtDueDate: e.target.value || undefined })}
              className="block mt-1 border border-slate-200 rounded-lg px-2 py-1 text-sm"
            />
          </label>
          {r.phone && (
            <a
              href={`tel:${r.phone}`}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold"
            >
              <Phone className="w-4 h-4" />
              Wac Macmiilka
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
