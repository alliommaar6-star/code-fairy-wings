import React, { useState } from "react";
import {
  Target,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Zap,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { StatCard } from "../common/StatCard";

export const TargetsView: React.FC = () => {
  const { settings, updateSettings, getTodayStats, getPeriodStats, sales } = useStore();

  const { todaySales, todayTarget, targetProgressPct } = getTodayStats();
  const { totalSales } = getPeriodStats();

  const [monthlyTargetInput, setMonthlyTargetInput] = useState(settings.monthlyTarget.toString());
  const [dailyTargetInput, setDailyTargetInput] = useState(settings.dailyTarget.toString());

  const monthlyProgressPct = Math.min(
    100,
    Math.round((totalSales / (settings.monthlyTarget || 1)) * 100),
  );

  const remainingDaily = Math.max(0, settings.dailyTarget - todaySales);
  const remainingMonthly = Math.max(0, settings.monthlyTarget - totalSales);

  const handleSaveTargets = (e: React.FormEvent) => {
    e.preventDefault();
    const newMonthly = parseFloat(monthlyTargetInput) || 10000;
    const newDaily = parseFloat(dailyTargetInput) || 350;
    updateSettings({ monthlyTarget: newMonthly, dailyTarget: newDaily });
    alert("Target parameters updated successfully!");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-red-600" />
            Target Command Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time daily quota pacing and 30-day monthly sales targets.
          </p>
        </div>
      </div>

      {/* KPI Cards (Screenshot 14) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Today's Target"
          value={`$${settings.dailyTarget.toFixed(2)}`}
          subtitle={`Day 15 quota`}
          icon={Target}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />

        <StatCard
          title="Today's Sales"
          value={`$${todaySales.toFixed(2)}`}
          subtitle={`${targetProgressPct}% completed`}
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          highlight={todaySales >= settings.dailyTarget}
        />

        <StatCard
          title="Monthly Target"
          value={`$${settings.monthlyTarget.toFixed(2)}`}
          subtitle="Cycle 1 total goal"
          icon={Clock}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Monthly Completed"
          value={`$${totalSales.toFixed(2)}`}
          subtitle={`${monthlyProgressPct}% of monthly quota`}
          icon={CheckCircle2}
          iconBg="bg-lime-50"
          iconColor="text-lime-700"
        />
      </div>

      {/* Progress visualizer cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Target Progress */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Daily Sales Pace (Day 15 of 30)</h3>
              <p className="text-xs text-slate-500">
                Current day sales velocity versus required run-rate
              </p>
            </div>
            <span className="text-lg font-black text-slate-900">{targetProgressPct}%</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, targetProgressPct)}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-slate-600 pt-1">
            <span>Achieved: ${todaySales.toFixed(2)}</span>
            <span>Target: ${settings.dailyTarget.toFixed(2)}</span>
          </div>

          {remainingDaily > 0 ? (
            <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Need <strong>${remainingDaily.toFixed(2)}</strong> more today to hit target.
              </span>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Congratulations! Today's sales target has been exceeded!</span>
            </div>
          )}
        </div>

        {/* Monthly Target Progress */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Monthly Target Pace (Cycle 1)</h3>
              <p className="text-xs text-slate-500">Cycle benchmark: Sep 01 - Sep 30, 2026</p>
            </div>
            <span className="text-lg font-black text-slate-900">{monthlyProgressPct}%</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-slate-900 h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, monthlyProgressPct)}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-slate-600 pt-1">
            <span>Current Total: ${totalSales.toFixed(2)}</span>
            <span>Monthly Goal: ${settings.monthlyTarget.toFixed(2)}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              15 days remaining in cycle. Required daily pace:{" "}
              <strong>${(remainingMonthly / 15).toFixed(2)}/day</strong>.
            </span>
          </div>
        </div>
      </div>

      {/* Target Configuration Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs max-w-xl">
        <h3 className="font-bold text-slate-900 text-base mb-1">Adjust Target Parameters</h3>
        <p className="text-xs text-slate-500 mb-4">
          Set commercial milestones for the current financial cycle.
        </p>

        <form onSubmit={handleSaveTargets} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Daily Target Quota ($)
            </label>
            <input
              type="number"
              step="10"
              required
              value={dailyTargetInput}
              onChange={(e) => setDailyTargetInput(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Monthly Cycle Benchmark ($)
            </label>
            <input
              type="number"
              step="100"
              required
              value={monthlyTargetInput}
              onChange={(e) => setMonthlyTargetInput(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
          >
            Save Target Benchmarks
          </button>
        </form>
      </div>
    </div>
  );
};
