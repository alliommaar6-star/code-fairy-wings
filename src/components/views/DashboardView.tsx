import React from 'react';
import { ShoppingCart, TrendingUp, TrendingDown, DollarSign, Target, Wallet, Users, Package, Plus, ArrowUpRight, Truck, ChevronRight, Building2, Sparkles, Receipt, CalendarDays } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useStore } from '../../context/StoreContext';
import { Button } from '@/components/ui/button';
import type { NavSection } from '../layout/Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: NavSection) => void;
  onOpenNewSale: () => void;
  onOpenNewExpense: () => void;
  onOpenNewIncome: () => void;
  onOpenReceivePayment: () => void;
  onOpenNewDelivery: () => void;
  onOpenNewAccount: () => void;
}

const money = (n: number) => `$${n.toFixed(2)}`;

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenNewSale, onOpenNewExpense, onOpenNewIncome, onOpenReceivePayment, onOpenNewDelivery, onOpenNewAccount }) => {
  const { currentUser, getTodayStats, getPeriodStats, sales, products, settings } = useStore();
  const { todaySales, todayIncome, todayExpenses, todayProfit, todayNetProfit, todayRemainingTarget, todayTarget, targetProgressPct } = getTodayStats();
  const { totalSales, totalRemainingDebt, totalCashInHand, totalStockValueSelling } = getPeriodStats();
  const performanceData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    const day = sales.filter(x => (x.date || '').slice(0, 10) === key && x.status === 'Completed');
    return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), sales: day.reduce((a, x) => a + (x.grandTotal || 0), 0), profit: day.reduce((a, x) => a + (x.grossProfit || 0), 0) };
  });
  const metrics = [
    { id: 'kpi-today-sales', label: "Today's Sales", value: todaySales, note: 'Completed sales & orders', icon: ShoppingCart, to: 'sales' as NavSection, tone: 'mint' },
    { id: 'kpi-total-income', label: 'Other Income', value: todayIncome, note: 'Services & other income', icon: TrendingUp, to: 'income' as NavSection, tone: 'teal' },
    { id: 'kpi-total-expenses', label: "Today's Expenses", value: todayExpenses, note: 'Operating costs', icon: TrendingDown, to: 'expenses' as NavSection, tone: 'clay' },
    { id: 'kpi-net-profit', label: 'Gross Profit', value: todayProfit, note: 'After cost & commissions', icon: DollarSign, to: 'reports' as NavSection, tone: 'mint' },
    { id: 'kpi-cash-in-hand', label: 'Cash in Hand', value: totalCashInHand, note: 'Drawer & accounts', icon: Wallet, to: 'accounts' as NavSection, tone: 'teal' },
    { id: 'kpi-receivables-debt', label: 'Receivables', value: totalRemainingDebt, note: 'Customer credit', icon: Users, to: 'customers' as NavSection, tone: 'clay' },
    { id: 'kpi-stock-valuation', label: 'Stock Value', value: totalStockValueSelling, note: `${products.length} active products`, icon: Package, to: 'inventory' as NavSection, tone: 'mint' },
  ];
  const actions = [
    { label: 'New Sale', icon: ShoppingCart, action: onOpenNewSale },
    { label: 'Quick POS', icon: Sparkles, action: () => onNavigate('pos') },
    { label: 'New Expense', icon: TrendingDown, action: onOpenNewExpense },
    { label: 'New Purchase', icon: Building2, action: () => onNavigate('purchases') },
    { label: 'Add Income', icon: TrendingUp, action: onOpenNewIncome },
    { label: 'Collection', icon: Receipt, action: onOpenReceivePayment },
    { label: 'New Delivery', icon: Truck, action: onOpenNewDelivery },
    { label: 'Transfer', icon: Wallet, action: onOpenNewAccount },
  ];
  const assets = [
    { name: 'Cash in Hand', value: totalCashInHand, color: 'var(--dash-mint)' },
    { name: 'Receivables', value: totalRemainingDebt, color: 'var(--dash-clay)' },
    { name: 'Stock Value', value: totalStockValueSelling, color: 'var(--dash-forest)' },
  ];
  const hasAssets = assets.some(x => x.value > 0);
  const pool = assets.reduce((sum, x) => sum + x.value, 0);
  return (
    <div className="dashboard-surface min-h-full px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="dashboard-kicker mb-2 flex items-center gap-2"><span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--dash-mint)]" /> STORE OVERVIEW <span className="text-muted-foreground">/ TODAY</span></div>
            <h1 className="dashboard-heading text-2xl font-bold text-foreground sm:text-3xl">Good day, {currentUser.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">A clear view of today's store activity.</p>
          </div>
          <div className="dashboard-date flex items-center gap-2 border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"><CalendarDays className="h-4 w-4 text-primary" />{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </section>

        <section aria-label="Daily performance" className="grid gap-3 lg:grid-cols-[1.35fr_1fr_1fr]">
          <Button id="kpi-today-net-profit" variant="ghost" onClick={() => onNavigate('reports')} className="dashboard-feature dashboard-feature-profit group flex h-auto min-h-[172px] flex-col items-start justify-between whitespace-normal p-5 text-left hover:bg-primary/95 sm:p-6">
            <div className="flex w-full items-center justify-between"><span className="dashboard-kicker text-primary-foreground/70">NET PROFIT / TODAY</span><ArrowUpRight className="h-5 w-5 text-primary-foreground/70 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
            <div><div className="dashboard-heading break-all text-4xl font-semibold text-primary-foreground sm:text-5xl">{money(todayNetProfit)}</div><p className="mt-2 text-xs font-medium text-primary-foreground/75">Gross profit + other income − expenses</p></div>
          </Button>
          <Button id="kpi-today-target" variant="ghost" onClick={() => onNavigate('targets')} className="dashboard-feature dashboard-feature-target group flex h-auto min-h-[172px] flex-col items-start justify-between whitespace-normal border border-border p-5 text-left hover:bg-accent sm:p-6">
            <div className="flex w-full items-center justify-between"><span className="dashboard-kicker text-muted-foreground">REMAINING TARGET</span><Target className="h-5 w-5 text-[var(--dash-clay)]" /></div>
            <div className="w-full"><div className="dashboard-heading break-all text-3xl font-semibold text-foreground sm:text-4xl">{money(todayRemainingTarget)}</div><p className="mt-2 text-xs font-medium text-muted-foreground">Target {money(todayTarget)} − Net profit {money(todayNetProfit)}</p><div className="mt-3 h-1 w-full bg-muted"><div className="h-full bg-[var(--dash-forest)] transition-[width] duration-500" style={{ width: `${targetProgressPct}%` }} /></div></div>
          </Button>
          <div className="dashboard-feature dashboard-feature-summary flex min-h-[172px] flex-col justify-between border border-border p-5 sm:p-6"><span className="dashboard-kicker text-muted-foreground">TODAY AT A GLANCE</span><div className="space-y-2 text-sm"><div className="flex items-center justify-between border-b border-border pb-2"><span className="text-muted-foreground">Sales</span><strong className="font-semibold text-foreground">{money(todaySales)}</strong></div><div className="flex items-center justify-between border-b border-border pb-2"><span className="text-muted-foreground">Gross profit</span><strong className="font-semibold text-foreground">{money(todayProfit)}</strong></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Expenses</span><strong className="font-semibold text-[var(--dash-clay)]">{money(todayExpenses)}</strong></div></div></div>
        </section>

        <section aria-label="Store metrics" className="dashboard-metric-grid grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
          {metrics.map(({ id, label, value, note, icon: Icon, to, tone }) => (
            <Button key={id} id={id} variant="ghost" onClick={() => onNavigate(to)} className="dashboard-metric group flex h-auto min-h-[107px] flex-col items-start justify-between whitespace-normal border border-border p-3.5 text-left hover:bg-accent sm:p-4">
              <div className="flex w-full items-start justify-between gap-2"><span className="dashboard-kicker text-muted-foreground">{label}</span><Icon className={`h-4 w-4 shrink-0 dashboard-icon-${tone}`} /></div>
              <div className="w-full"><div className="dashboard-heading break-all text-xl font-semibold text-foreground sm:text-2xl">{money(value)}</div><div className="mt-0.5 truncate text-[11px] font-normal text-muted-foreground">{note}</div></div>
            </Button>
          ))}
        </section>

        <section className="border-y border-border py-4"><div className="mb-3 flex items-center justify-between"><h2 className="dashboard-heading text-sm font-semibold text-foreground">Quick actions</h2><span className="dashboard-kicker text-muted-foreground">OPERATIONS</span></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">{actions.map(({ label, icon: Icon, action }) => <Button key={label} id={label === 'New Sale' ? 'btn-quick-new-sale' : undefined} variant="outline" onClick={action} className="dashboard-action h-11 justify-start gap-2 px-3 text-xs font-semibold shadow-none"><Icon className="h-4 w-4 text-primary" />{label}</Button>)}</div></section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(270px,1fr)]">
          <div className="dashboard-panel min-w-0 border border-border bg-card p-4 sm:p-5"><div className="mb-5 flex flex-wrap items-start justify-between gap-2"><div><h2 className="dashboard-heading text-base font-semibold text-foreground">Performance</h2><p className="text-xs text-muted-foreground">Completed sales and profit · Last 14 days</p></div><div className="flex gap-3 text-[11px] font-medium text-muted-foreground"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[var(--dash-forest)]" />Sales</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[var(--dash-clay)]" />Profit</span></div></div><div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={performanceData} margin={{ top: 8, right: 8, left: -23, bottom: 0 }}><CartesianGrid stroke="var(--dash-line)" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--dash-subtle)' }} axisLine={false} tickLine={false} minTickGap={15} /><YAxis tick={{ fontSize: 10, fill: 'var(--dash-subtle)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} /><Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: 4, fontSize: 12 }} formatter={(value: number) => money(value)} /><Area type="monotone" dataKey="sales" stroke="var(--dash-forest)" strokeWidth={2} fill="var(--dash-forest)" fillOpacity={0.08} /><Area type="monotone" dataKey="profit" stroke="var(--dash-clay)" strokeWidth={2} fill="var(--dash-clay)" fillOpacity={0.04} /></AreaChart></ResponsiveContainer></div></div>
          <div className="dashboard-panel border border-border bg-card p-4 sm:p-5"><h2 className="dashboard-heading text-base font-semibold text-foreground">Financial position</h2><p className="text-xs text-muted-foreground">Cash, credit & stock at retail value</p><div className="relative mx-auto mt-3 h-36 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={hasAssets ? assets : [{ name: 'No assets', value: 1, color: 'var(--muted)' }]} dataKey="value" innerRadius={49} outerRadius={65} stroke="var(--card)" strokeWidth={3}>{(hasAssets ? assets : [{ name: 'No assets', value: 1, color: 'var(--muted)' }]).map(x => <Cell key={x.name} fill={x.color} />)}</Pie><Tooltip formatter={(value: number) => money(hasAssets ? value : 0)} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="dashboard-kicker text-muted-foreground">TOTAL ASSETS</span><strong className="dashboard-heading text-lg text-foreground">{money(pool)}</strong></div></div><div className="mt-2 divide-y divide-border">{assets.map(x => <div key={x.name} className="flex items-center justify-between py-2 text-xs"><span className="text-muted-foreground">{x.name}</span><strong className="text-foreground">{money(x.value)}</strong></div>)}</div></div>
        </section>

        <section className="dashboard-panel border border-border bg-card p-4 sm:p-5"><div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="dashboard-heading text-base font-semibold text-foreground">Recent sales</h2><p className="text-xs text-muted-foreground">Latest invoices</p></div><Button variant="ghost" onClick={() => onNavigate('sales')} className="h-8 px-2 text-xs font-semibold text-primary">View all <ChevronRight className="h-3 w-3" /></Button></div>{sales.length === 0 ? <p className="border-t border-border py-8 text-center text-sm text-muted-foreground">No sales recorded yet.</p> : <div className="divide-y divide-border">{sales.slice(0, 4).map(s => <div key={s.id} className="flex items-center justify-between gap-4 py-3 text-xs"><div className="min-w-0"><div className="font-semibold text-foreground">{s.invoiceNo}</div><div className="truncate text-muted-foreground">{s.customerName} · {s.date}</div></div><strong className="shrink-0 text-foreground">{money(s.grandTotal)}</strong></div>)}</div>}</section>
      </div>
    </div>
  );
};
