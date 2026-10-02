import React from 'react';
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Wallet,
  Users,
  Package,
  Plus,
  ArrowUpRight,
  Truck,
  CheckCircle2,
  Clock,
  ChevronRight,
  Building2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { StatCard } from '../common/StatCard';
import { NavSection } from '../layout/Sidebar';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardViewProps {
  onNavigate: (tab: NavSection) => void;
  onOpenNewSale: () => void;
  onOpenNewExpense: () => void;
  onOpenNewIncome: () => void;
  onOpenReceivePayment: () => void;
  onOpenNewDelivery: () => void;
  onOpenNewAccount: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenNewSale,
  onOpenNewExpense,
  onOpenNewIncome,
  onOpenReceivePayment,
  onOpenNewDelivery,
  onOpenNewAccount,
}) => {
  const {
    currentUser,
    getTodayStats,
    getPeriodStats,
    sales,
    drivers,
    accounts,
    customers,
    products,
    settings,
  } = useStore();

  const {
    todaySales,
    todayIncome,
    todayExpenses,
    todayProfit,
    todayNetProfit,
    todayRemainingTarget,
    todayTarget,
    targetProgressPct,
  } = getTodayStats();

  const {
    totalSales,
    totalPaid,
    totalRemainingDebt,
    grossProfit,
    totalExpenses,
    netProfit,
    totalCashInHand,
    totalStockValueSelling,
  } = getPeriodStats();

  // Real chart data: last 14 days from actual sales (no sample numbers).
  const performanceData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    const day = sales.filter((x) => (x.date || '').slice(0, 10) === key);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
      sales: Math.round(day.reduce((a, x) => a + (x.grandTotal || 0), 0) * 100) / 100,
      expenses: 0,
      profit: Math.round(day.reduce((a, x) => a + (x.grossProfit || 0), 0) * 100) / 100,
    };
  });

  // Financial summary donut data
  const donutData = [
    { name: 'Cash', value: Math.max(10, totalCashInHand), color: '#10b981' }, // emerald
    { name: 'Receivables', value: Math.max(5, totalRemainingDebt), color: '#f59e0b' }, // amber
    { name: 'Capital (Stock)', value: Math.max(20, totalStockValueSelling), color: '#6366f1' }, // indigo
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Commercial Engine Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Good day, {currentUser.name}! 👋
            </h2>
            <span className="bg-lime-100 text-lime-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
              Cycle 1 Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-2">
            <span>Commercial engine: Sep 15, 2026</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Auto-balancing & Stock Ready
            </span>
          </p>
        </div>

        {/* Financial Period Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 bg-slate-100 rounded-xl font-semibold text-slate-700">
            Sep 01, 2026 — Sep 30, 2026
          </div>
          <div className="px-3 py-1.5 bg-slate-900 text-white rounded-xl font-bold">
            DAY 15 OF 30
          </div>
        </div>
      </div>

      {/* 8 Master KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          id="kpi-today-sales"
          title="Today's Sales"
          value={`$${todaySales.toFixed(2)}`}
          subtitle="Completed sales & orders"
          icon={ShoppingCart}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => onNavigate('sales')}
        />

        <StatCard
          id="kpi-total-income"
          title="Total Income"
          value={`$${todayIncome.toFixed(2)}`}
          subtitle="Service & other income (today)"
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          onClick={() => onNavigate('income')}
        />

        <StatCard
          id="kpi-total-expenses"
          title="Today's Expenses"
          value={`$${todayExpenses.toFixed(2)}`}
          subtitle="Utilities, fuel & ops"
          icon={TrendingDown}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          onClick={() => onNavigate('expenses')}
        />

        <StatCard
          id="kpi-net-profit"
          title="Gross Profit"
          value={`$${todayProfit.toFixed(2)}`}
          subtitle="Today, after COGS & branch commission"
          icon={DollarSign}
          iconBg="bg-lime-50"
          iconColor="text-lime-700"
          highlight
          trend={totalSales > 0 ? { value: `${((grossProfit / totalSales) * 100).toFixed(1)}% margin`, isPositive: grossProfit >= 0 } : undefined}
          onClick={() => onNavigate('reports')}
        />

        <StatCard
          id="kpi-today-net-profit"
          title="Net Profit (Today)"
          value={`$${todayNetProfit.toFixed(2)}`}
          subtitle="Gross profit + income − expenses"
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-700"
          highlight
          onClick={() => onNavigate('reports')}
        />

        <StatCard
          id="kpi-today-target"
          title="Remaining Target"
          value={`$${todayRemainingTarget.toFixed(2)}`}
          subtitle={`Target $${todayTarget.toFixed(2)} − Net profit $${todayNetProfit.toFixed(2)}`}
          icon={Target}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          onClick={() => onNavigate('targets')}
        />

        <StatCard
          id="kpi-cash-in-hand"
          title="Cash In Hand"
          value={`$${totalCashInHand.toFixed(2)}`}
          subtitle="Drawer + Bank accounts"
          icon={Wallet}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          onClick={() => onNavigate('accounts')}
        />

        <StatCard
          id="kpi-receivables-debt"
          title="Customer Receivables"
          value={`$${totalRemainingDebt.toFixed(2)}`}
          subtitle="Uncollected customer credit"
          icon={Users}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          onClick={() => onNavigate('customers')}
        />

        <StatCard
          id="kpi-stock-valuation"
          title="Stock Value (Retail)"
          value={`$${totalStockValueSelling.toFixed(2)}`}
          subtitle={`${products.length} active inventory SKUs`}
          icon={Package}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          onClick={() => onNavigate('inventory')}
        />
      </div>

      {/* Quick Action Buttons Row */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
          Quick Actions
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <button
            id="btn-quick-new-sale"
            onClick={onOpenNewSale}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-[#bef264]/20 border border-slate-200/80 hover:border-lime-500/50 transition-all text-slate-700 hover:text-black group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-[#bef264] group-hover:text-black flex items-center justify-center mb-1.5 transition-colors">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold whitespace-nowrap">New Sale</span>
          </button>

          <button
            onClick={() => onNavigate('pos')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all text-slate-700 group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center mb-1.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold whitespace-nowrap">Quick POS</span>
          </button>

          <button
            onClick={onOpenNewExpense}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all text-slate-700 group"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center mb-1.5">
              <TrendingDown className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold whitespace-nowrap">New Expense</span>
          </button>

          <button
            onClick={() => onNavigate('purchases')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all text-slate-700 group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-1.5">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold whitespace-nowrap">New Purchase</span>
          </button>

          <button
            onClick={onOpenNewIncome}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all text-slate-700 group"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center mb-1.5">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold whitespace-nowrap">Add Income</span>
          </button>

          <button
            onClick={onOpenReceivePayment}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all text-slate-700 group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center mb-1.5">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold whitespace-nowrap">Collection</span>
          </button>

          <button
            onClick={onOpenNewDelivery}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all text-slate-700 group"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 flex items-center justify-center mb-1.5">
              <Truck className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold whitespace-nowrap">New Delivery</span>
          </button>

          <button
            onClick={onOpenNewAccount}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all text-slate-700 group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-1.5">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold whitespace-nowrap">Transfer</span>
          </button>
        </div>
      </div>

      {/* Charts & Financial Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Performance Overview Chart */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Performance Overview
              </h3>
              <p className="text-xs text-slate-500">
                Sales, revenue, and gross profit trajectory across Cycle 1
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Sales
              </span>
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Profit
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: number) => [`$${val.toFixed(2)}`, '']}
                />
                <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="profit" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Summary Donut Chart */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-1">
              Financial Summary
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Asset split: Cash, Debt & Stock
            </p>

            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => `$${val.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Pool</div>
                <div className="text-sm font-black text-slate-900">
                  ${(totalCashInHand + totalRemainingDebt + totalStockValueSelling).toFixed(0)}
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Cash in Hand
                </span>
                <span className="font-bold text-slate-900">${totalCashInHand.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Customer Receivables
                </span>
                <span className="font-bold text-slate-900">${totalRemainingDebt.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Inventory Stock
                </span>
                <span className="font-bold text-slate-900">${totalStockValueSelling.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Target Command Center & Recent Invoices Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Target Command Center */}
        <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-lime-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  Target Command Center
                </h3>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-lime-400/20 text-lime-400">
                Cycle Goal
              </span>
            </div>

            <div className="flex items-center gap-6 my-4">
              {/* Circular gauge */}
              <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#bef264]"
                    strokeDasharray={`${targetProgressPct}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-lg font-black text-white">{targetProgressPct}%</div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-400">Done</div>
                </div>
              </div>

              <div className="space-y-2 text-xs flex-1">
                <div>
                  <div className="text-slate-400 text-[11px]">Today's Benchmark</div>
                  <div className="text-base font-black text-white">
                    ${todayNetProfit.toFixed(2)} / ${todayTarget.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Monthly Goal (Cycle 1)</div>
                  <div className="text-sm font-bold text-slate-300">
                    ${totalSales.toFixed(2)} / ${settings.monthlyTarget.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('targets')}
            className="w-full py-2.5 mt-2 bg-slate-800 hover:bg-slate-700 text-lime-400 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            Adjust Target Parameters
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Recent Invoices Table Snippet */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Recent Sales Invoices
            </h3>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              View All Invoices
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {sales.slice(0, 4).map((s) => (
              <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{s.invoiceNo}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.paymentStatus === 'full_paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.paymentStatus === 'partial_payment'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {s.paymentStatus === 'full_paid' ? 'Paid' : s.paymentStatus === 'partial_payment' ? 'Partial' : 'Debt'}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    {s.customerName} • {s.date}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-900">${s.grandTotal.toFixed(2)}</div>
                  <div className="text-[11px] text-slate-500">{s.paymentMethod}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
