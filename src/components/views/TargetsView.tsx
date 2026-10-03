import React, { useMemo, useState } from "react";
import { Target, TrendingUp, CheckCircle2, Clock, Zap, AlertCircle, Wallet } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { StatCard } from "../common/StatCard";
import {
  computeEngine,
  monthlyPlanFor,
  updateFinConfig,
  useFinEngine,
} from "../../lib/financial-engine";
import { buildDailyNetMap } from "../../lib/daily-net";
import { useBranches } from "../../lib/branch-store";

const money = (n: number) => `$${(n || 0).toFixed(2)}`;

export const TargetsView: React.FC = () => {
  const { sales, orders, expenses, incomes, currentUser } = useStore();
  const fin = useFinEngine();
  const branchState = useBranches();
  const today = new Date().toISOString().slice(0, 10);

  const engine = useMemo(
    () => computeEngine(today, fin.config, buildDailyNetMap(sales, orders, expenses, incomes)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today, fin.config, sales, orders, expenses, incomes, branchState],
  );

  const t = engine.today;
  const cycle = engine.activeCycle;
  const pct =
    t && t.adjustedTarget > 0
      ? Math.min(100, Math.max(0, Math.round((t.achievement / t.adjustedTarget) * 100)))
      : t && t.achievement > 0
        ? 100
        : 0;
  const monthPct =
    cycle && cycle.burden > 0
      ? Math.min(100, Math.max(0, Math.round((cycle.totalAchievement / cycle.burden) * 100)))
      : 0;
  const remainingToday = t ? Math.max(0, t.adjustedTarget - t.achievement) : 0;
  const extraToday = t ? Math.max(0, t.achievement - t.adjustedTarget) : 0;

  const [base, setBase] = useState(String(fin.config.monthlyBaseTarget));
  const [rent, setRent] = useState(String(fin.config.rentAmount));
  const [rentStart, setRentStart] = useState(fin.config.rentStartDate);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateFinConfig(
      {
        monthlyBaseTarget: Math.max(0, parseFloat(base) || 0),
        rentAmount: Math.max(0, parseFloat(rent) || 0),
        rentStartDate: rentStart,
      },
      currentUser?.name || "staff",
    );
    alert("Qorshaha bishii waa la keydiyay.");
  };

  const pastCycles = engine.cycles.filter((c) => c.closed).reverse();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          Financial Engine — Targets
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Target maalinle ah oo ka yimaada qorshaha bisha. Deficit-ku maalinta xigta iyo bisha xigta
          ayuu u gudbaa; surplus-ku isla bishaas kaliya ayuu ku ekaadaa. Bilaabay {fin.config.systemStartDate}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Target className="h-5 w-5" /> Today's Target</div>
        <strong className={`text-4xl font-bold sm:text-5xl ${extraToday > 0 || (t && remainingToday === 0) ? 'text-positive' : 'text-destructive'}`}>{extraToday > 0 || (t && remainingToday === 0) ? '+' : '-'}{money(extraToday > 0 ? extraToday : remainingToday)}</strong>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-foreground"><span>Target: {money(t?.adjustedTarget ?? 0)}</span><span>Net profit: {money(t?.achievement ?? 0)}</span><span>Remaining: {money(remainingToday)}</span><span>Dheeri: {money(extraToday)}</span></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="Today's Net Profit"
          value={money(t?.achievement ?? 0)}
          subtitle={`${pct}% completed`}
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          highlight={!!t && t.achievement >= t.adjustedTarget}
        />
        <StatCard
          title="Weekly Target"
          value={money(cycle?.days.filter(d => { const date = new Date(`${d.date}T12:00:00`); const start = new Date(`${today}T12:00:00`); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); return date >= start && d.date <= today; }).reduce((sum, d) => sum + d.adjustedTarget, 0) ?? 0)}
          subtitle={`Net profit ${money(cycle?.days.filter(d => { const date = new Date(`${d.date}T12:00:00`); const start = new Date(`${today}T12:00:00`); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); return date >= start && d.date <= today; }).reduce((sum, d) => sum + d.achievement, 0) ?? 0)}`}
          icon={Clock}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Monthly Remaining"
          value={money(engine.remainingMonthlyTarget)}
          subtitle={`${monthPct}% of ${money(cycle?.burden ?? 0)}`}
          icon={CheckCircle2}
          iconBg="bg-lime-50"
          iconColor="text-lime-700"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">Maanta</h3>
            <span className="text-lg font-black">{pct}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div className="bg-primary h-3 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Base target: <b>{money(t?.baseTarget ?? 0)}</b></div>
            <div>Adjusted: <b>{money(t?.adjustedTarget ?? 0)}</b></div>
            <div>Deficit hadda: <b className="text-destructive">{money(engine.outstandingDeficit)}</b></div>
            <div>Surplus bishan: <b className="text-primary">{money(engine.currentMonthSurplus)}</b></div>
          </div>
          {remainingToday > 0 ? (
            <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 flex gap-2">
              <Zap className="w-4 h-4 shrink-0" /> Waxaa maanta kuu dhiman <b>{money(remainingToday)}</b>.
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-800 flex gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Target-ka maanta waa la gaaray.
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">Bisha {cycle?.monthKey}</h3>
            <span className="text-lg font-black">{monthPct}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div className="bg-foreground h-3 rounded-full" style={{ width: `${monthPct}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Qorshaha bisha: <b>{money(cycle?.plan ?? 0)}</b></div>
            <div>Deficit hore: <b>{money(cycle?.openingDeficit ?? 0)}</b></div>
            <div>Wadarta (burden): <b>{money(cycle?.burden ?? 0)}</b></div>
            <div>La gaaray: <b>{money(cycle?.totalAchievement ?? 0)}</b></div>
          </div>
          <div className="p-3 bg-muted rounded-xl text-xs flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Surplus-ka bishan kuma gudbo bisha cusub; deficit-ku wuu gudbaa.
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 overflow-x-auto">
        <h3 className="font-bold text-sm mb-3">Diiwaanka maalmaha bishan</h3>
        <table className="w-full text-xs">
          <thead className="text-muted-foreground text-left">
            <tr>
              <th className="py-1.5">Taariikh</th><th>Base</th><th>Adjusted</th><th>Net Profit</th><th>Deficit</th><th>Surplus</th>
            </tr>
          </thead>
          <tbody>
            {[...(cycle?.days ?? [])].reverse().map((d) => (
              <tr key={d.date} className="border-t border-border">
                <td className="py-1.5">{d.date}</td>
                <td>{money(d.baseTarget)}</td>
                <td>{money(d.adjustedTarget)}</td>
                <td>{money(d.achievement)}</td>
                <td className="text-destructive">{d.deficit ? money(d.deficit) : "—"}</td>
                <td className="text-primary">{d.surplus ? money(d.surplus) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pastCycles.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 overflow-x-auto">
          <h3 className="font-bold text-sm mb-3">Bilihii xirmay</h3>
          <table className="w-full text-xs">
            <thead className="text-muted-foreground text-left">
              <tr><th className="py-1.5">Bil</th><th>Qorshe</th><th>Deficit hore</th><th>La gaaray</th><th>Deficit xiritaan</th><th>Surplus (lama gudbin)</th></tr>
            </thead>
            <tbody>
              {pastCycles.map((c) => (
                <tr key={c.monthKey} className="border-t border-border">
                  <td className="py-1.5">{c.monthKey}</td>
                  <td>{money(c.plan)}</td>
                  <td>{money(c.openingDeficit)}</td>
                  <td>{money(c.totalAchievement)}</td>
                  <td className="text-destructive">{money(c.closingDeficit)}</td>
                  <td>{money(c.closingSurplus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border p-5 max-w-xl">
        <h3 className="font-bold text-base mb-1 flex items-center gap-2"><Wallet className="w-4 h-4" /> Qorshaha Bisha (Business)</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Bishan: {money(monthlyPlanFor(today.slice(0, 7), fin.config))}. Kirada waxay ku biirtaa laga bilaabo taariikhda kirada.
        </p>
        <form onSubmit={save} className="space-y-3">
          <label className="block text-xs font-bold">Target bisha aasaasiga ($)
            <input type="number" step="0.01" value={base} onChange={(e) => setBase(e.target.value)} className="mt-1 w-full px-3 py-2 bg-muted border border-border rounded-xl" />
          </label>
          <label className="block text-xs font-bold">Kirada dukaanka bishii ($)
            <input type="number" step="0.01" value={rent} onChange={(e) => setRent(e.target.value)} className="mt-1 w-full px-3 py-2 bg-muted border border-border rounded-xl" />
          </label>
          <label className="block text-xs font-bold">Kirada waxay bilaabaneysaa
            <input type="date" value={rentStart} onChange={(e) => setRentStart(e.target.value)} className="mt-1 w-full px-3 py-2 bg-muted border border-border rounded-xl" />
          </label>
          <button type="submit" className="px-5 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl">Keydi</button>
        </form>
      </div>
    </div>
  );
};
