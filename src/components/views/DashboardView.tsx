import React, { useState } from 'react';
import { ShoppingCart, TrendingUp, TrendingDown, DollarSign, Target, Wallet, Users, Package, Plus, ArrowUpRight, Truck, ChevronRight, Building2, Sparkles, Receipt, CalendarDays, Download, FileText } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { differenceInCalendarDays, eachDayOfInterval, format, parseISO, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useStore } from '../../context/StoreContext';
import { useBranches } from '@/lib/branch-store';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { NavSection } from '../layout/Sidebar';
import { computeEngine, useFinEngine } from '@/lib/financial-engine';
import { buildDailyNetMap, businessDeliveryCost } from '@/lib/daily-net';
import { canAccess, useStaffRole } from '@/lib/roles';

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
  const { currentUser, getTodayStats, getPeriodStats, sales, orders, incomes, expenses, products, purchases, returns, inventoryMovements, supplierPayments, transfers, auditLogs, deliveries, cargoShipments } = useStore();
  const { todayNetProfit, todayTarget, targetProgressPct } = getTodayStats();
  const { totalRemainingDebt, totalCashInHand, totalStockValueSelling } = getPeriodStats();
  const branches = useBranches();
  const role = useStaffRole();
  const [range, setRange] = useState<DateRange>(() => ({ from: new Date(), to: new Date() }));
  const [comparisonDays, setComparisonDays] = useState(16);
  const [activityQuery, setActivityQuery] = useState('');
  const [activityType, setActivityType] = useState('all');
  const [activityLimit, setActivityLimit] = useState(25);
  const [profitMonth, setProfitMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(range);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const start = format(range.from ?? new Date(), 'yyyy-MM-dd');
  const end = format(range.to ?? range.from ?? new Date(), 'yyyy-MM-dd');
  const lengthDays = differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
  const comparisonEnd = format(new Date(), 'yyyy-MM-dd');
  const comparisonStart = format(subDays(parseISO(comparisonEnd), comparisonDays - 1), 'yyyy-MM-dd');
  const prevEnd = format(subDays(parseISO(comparisonStart), 1), 'yyyy-MM-dd');
  const prevStart = format(subDays(parseISO(comparisonStart), comparisonDays), 'yyyy-MM-dd');
  type Day = { sales: number; gross: number; income: number; expenses: number };
  const compute = (from: string, to: string) => {
    const map = new Map<string, Day>();
    const add = (date: string, field: keyof Day, value: number) => {
      const key = (date || '').slice(0, 10);
      if (key < from || key > to) return;
      const day = map.get(key) ?? { sales: 0, gross: 0, income: 0, expenses: 0 };
      day[field] += value || 0;
      map.set(key, day);
    };
    const showMain = branchFilter === 'all' || branchFilter === 'main';
    if (showMain) {
      sales.filter(s => s.status === 'Completed').forEach(s => { add(s.date, 'sales', s.grandTotal); add(s.date, 'gross', s.grossProfit - businessDeliveryCost(s)); });
      orders.filter(o => o.status === 'delivered' && !o.convertedSaleId).forEach(o => {
        add(o.date, 'sales', o.total);
        add(o.date, 'gross', o.total - o.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0) - businessDeliveryCost(o));
      });
    }
    branches.sales.filter(s => branchFilter === 'all' || s.branchId === branchFilter).forEach(s => { add(s.date, 'sales', s.total); add(s.date, 'gross', s.total - s.cost - s.commission); });
    if (branchFilter === 'all') {
      incomes.forEach(i => add(i.date, 'income', i.amount));
      expenses.forEach(e => add(e.date, 'expenses', e.amount));
    }
    const total = [...map.values()].reduce((sum, d) => ({ sales: sum.sales + d.sales, gross: sum.gross + d.gross, income: sum.income + d.income, expenses: sum.expenses + d.expenses }), { sales: 0, gross: 0, income: 0, expenses: 0 });
    return { map, total, net: total.gross + total.income - total.expenses };
  };
  const current = compute(start, end);
  const compared = compute(comparisonStart, comparisonEnd);
  const previous = compute(prevStart, prevEnd);
  const byDay = current.map;
  const performanceData = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) }).map(d => {
    const key = format(d, 'yyyy-MM-dd');
    const day = byDay.get(key) ?? { sales: 0, gross: 0, income: 0, expenses: 0 };
    return { date: format(d, 'MMM d'), fullDate: key, sales: day.sales, gross: day.gross, income: day.income, expenses: day.expenses, profit: day.gross + day.income - day.expenses };
  });
  const period = current.total;
  const periodNetProfit = current.net;
  const fmtLabel = (a: string, b: string) => a === b ? format(parseISO(a), 'MMM d, yyyy') : `${format(parseISO(a), 'MMM d, yyyy')} – ${format(parseISO(b), 'MMM d, yyyy')}`;
  const periodLabel = fmtLabel(start, end);
  const comparedLabel = fmtLabel(comparisonStart, comparisonEnd);
  const prevLabel = fmtLabel(prevStart, prevEnd);
  const branchName = branchFilter === 'all' ? 'All (store + branches)' : branchFilter === 'main' ? 'Main store' : branches.branches.find(b => b.id === branchFilter)?.name ?? 'Branch';
  const comparison = [
    { label: 'Sales', now: compared.total.sales, before: previous.total.sales },
    { label: 'Gross profit', now: compared.total.gross, before: previous.total.gross },
    { label: 'Expenses', now: compared.total.expenses, before: previous.total.expenses, inverse: true },
    { label: 'Net profit', now: compared.net, before: previous.net },
  ];
  const pct = (now: number, before: number) => before === 0 ? (now === 0 ? 0 : null) : ((now - before) / Math.abs(before)) * 100;
  const branchRows = [
    ...(() => { const m = new Map<string, { name: string; sales: number; commission: number; profit: number; count: number }>();
      branches.branches.forEach(b => m.set(b.id, { name: b.name, sales: 0, commission: 0, profit: 0, count: 0 }));
      branches.sales.filter(s => s.date >= start && s.date <= end).forEach(s => { const r = m.get(s.branchId) ?? { name: s.branchName, sales: 0, commission: 0, profit: 0, count: 0 }; r.sales += s.total; r.commission += s.commission; r.profit += s.total - s.cost - s.commission; r.count += 1; m.set(s.branchId, r); });
      return [...m.entries()].map(([id, r]) => ({ id, ...r })); })(),
  ];
  const fileBase = `benadir-report-${start}_${end}`;
  const exportCSV = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      ['Benadir Store - Sales & Profit Report'], ['Period', periodLabel], ['Comparison', `${comparedLabel} vs ${prevLabel}`], ['Filter', branchName], [],
      ['Date', 'Sales', 'Gross profit', 'Other income', 'Expenses', 'Net profit'],
      ...performanceData.map(d => [d.fullDate, d.sales.toFixed(2), d.gross.toFixed(2), d.income.toFixed(2), d.expenses.toFixed(2), d.profit.toFixed(2)]),
      ['TOTAL', period.sales.toFixed(2), period.gross.toFixed(2), period.income.toFixed(2), period.expenses.toFixed(2), periodNetProfit.toFixed(2)],
      [], ['Comparison', 'This period', 'Previous period', 'Change %'], ['Previous period', prevLabel],
      ...comparison.map(c => { const p = pct(c.now, c.before); return [c.label, c.now.toFixed(2), c.before.toFixed(2), p === null ? 'new' : p.toFixed(1)]; }),
      [], ['Branch', 'Sales count', 'Sales', 'Commission', 'Profit'],
      ...branchRows.map(r => [r.name, r.count, r.sales.toFixed(2), r.commission.toFixed(2), r.profit.toFixed(2)]),
    ];
    const blob = new Blob(['\ufeff' + lines.map(l => l.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${fileBase}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  const exportPDF = () => {
    const w = window.open('', '_blank'); if (!w) { alert('Fadlan oggolow pop-ups si PDF loo soo dejiyo.'); return; }
    const row = (cells: (string | number)[], tag = 'td') => `<tr>${cells.map(c => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
    w.document.write(`<!doctype html><html><head><title>${fileBase}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin:0}h2{font-size:14px;margin:20px 0 6px}p{margin:2px 0;font-size:12px;color:#555}table{width:100%;border-collapse:collapse;font-size:11px}td,th{border:1px solid #ccc;padding:4px 6px;text-align:right}td:first-child,th:first-child{text-align:left}th{background:#eee}tfoot td{font-weight:bold}</style></head><body>
      <h1>Benadir Store — Sales & Profit Report</h1><p>Period: ${periodLabel}</p><p>Filter: ${branchName}</p><p>Comparison: ${comparedLabel} vs ${prevLabel}</p>
      <h2>Summary vs previous period</h2><table>${row(['Metric', 'This period', 'Previous', 'Change'], 'th')}${comparison.map(c => { const p = pct(c.now, c.before); return row([c.label, money(c.now), money(c.before), p === null ? 'new' : `${p.toFixed(1)}%`]); }).join('')}</table>
      <h2>Daily breakdown</h2><table>${row(['Date', 'Sales', 'Gross profit', 'Other income', 'Expenses', 'Net profit'], 'th')}${performanceData.map(d => row([d.fullDate, money(d.sales), money(d.gross), money(d.income), money(d.expenses), money(d.profit)])).join('')}<tfoot>${row(['TOTAL', money(period.sales), money(period.gross), money(period.income), money(period.expenses), money(periodNetProfit)])}</tfoot></table>
      <h2>Branches</h2><table>${row(['Branch', 'Sales count', 'Sales', 'Commission', 'Profit'], 'th')}${branchRows.length ? branchRows.map(r => row([r.name, r.count, money(r.sales), money(r.commission), money(r.profit)])).join('') : row(['No branches', '', '', '', ''])}</table>
      <script>window.onload=()=>{window.print();}</script></body></html>`);
    w.document.close();
  };
  const setPreset = (days: number) => {
    const next = { from: subDays(new Date(), days - 1), to: new Date() };
    setRange(next);
    setDraftRange(next);
    setRangeOpen(false);
  };
  const fin = useFinEngine();
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const monthStart = todayKey.slice(0, 8) + '01';
  const yearStart = todayKey.slice(0, 4) + '-01-01';
  const weekStartDate = (() => { const d = new Date(); const dow = (d.getDay() + 6) % 7; return format(subDays(d, dow), 'yyyy-MM-dd'); })();
  const pTodayC = compute(todayKey, todayKey), pMonthC = compute(monthStart, todayKey), pYearC = compute(yearStart, todayKey);
  const monthEnd = profitMonth === todayKey.slice(0, 7) ? todayKey : format(new Date(Number(profitMonth.slice(0, 4)), Number(profitMonth.slice(5, 7)), 0), 'yyyy-MM-dd');
  const monthProfit = compute(`${profitMonth}-01`, monthEnd).net;
  const allTimeProfit = compute('0000-01-01', todayKey).net;
  const firstRecord = [todayKey, ...sales.map(x => x.date), ...orders.map(x => x.date), ...branches.sales.map(x => x.date), ...incomes.map(x => x.date), ...expenses.map(x => x.date)].filter(Boolean).sort()[0];
  const monthOptions: string[] = [];
  for (let y = Number(firstRecord.slice(0, 4)); y <= Number(todayKey.slice(0, 4)); y++) {
    for (let m = 1; m <= 12; m++) { const key = `${y}-${String(m).padStart(2, '0')}`; if (key >= firstRecord.slice(0, 7) && key <= todayKey.slice(0, 7)) monthOptions.push(key); }
  }
  monthOptions.reverse();
  const tri = (k: 'sales' | 'gross' | 'income' | 'expenses' | 'net') => {
    const g = (c: ReturnType<typeof compute>) => k === 'net' ? c.net : c.total[k];
    return { today: g(pTodayC), month: g(pMonthC), year: g(pYearC) };
  };
  const engine = computeEngine(todayKey, fin.config, buildDailyNetMap(sales, orders, expenses, incomes));
  const cycleDays = engine.activeCycle?.days ?? [];
  const sumRange = (a: string, f: 'adjustedTarget' | 'achievement') => cycleDays.filter(d => d.date >= a && d.date <= todayKey).reduce((x, d) => x + d[f], 0);
  const tgtRows = [
    { label: 'Daily', target: engine.today?.adjustedTarget ?? 0, net: engine.today?.achievement ?? 0 },
    { label: 'Weekly', target: sumRange(weekStartDate, 'adjustedTarget'), net: sumRange(weekStartDate, 'achievement') },
    { label: 'Monthly', target: engine.activeCycle?.burden ?? 0, net: engine.activeCycle?.totalAchievement ?? 0 },
  ];
  type Activity = { id: string; date: string; type: string; title: string; detail: string; amount?: number; section: NavSection };
  const activity: Activity[] = [];
  const addActivity = (row: Activity) => { if (canAccess(role, row.section) && row.date.slice(0, 10) >= start && row.date.slice(0, 10) <= end) activity.push(row); };
  if (branchFilter === 'all' || branchFilter === 'main') {
    sales.forEach(s => addActivity({ id: `sale-${s.id}`, date: `${s.date} ${s.time || ''}`, type: 'Sale', title: s.invoiceNo, detail: `${s.customerName} · ${s.status} · ${s.items.map(i => `${i.productName} ×${i.quantity}`).join(', ')} · Paid ${money(s.amountPaid)} · Profit ${money(s.grossProfit - businessDeliveryCost(s))}`, amount: s.grandTotal, section: 'sales' }));
    orders.forEach(o => addActivity({ id: `order-${o.id}`, date: `${o.date} ${o.time || ''}`, type: 'Order', title: o.orderNo, detail: `${o.customerName} · ${o.status} · ${o.items.map(i => `${i.productName} ×${i.quantity}`).join(', ')} · Paid ${money(o.paidAmount)}`, amount: o.total, section: 'sales' }));
  }
  branches.sales.filter(s => branchFilter === 'all' || s.branchId === branchFilter).forEach(s => addActivity({ id: `branch-sale-${s.id}`, date: `${s.date} ${s.time || ''}`, type: 'Branch sale', title: s.branchName, detail: `${s.items.map(i => `${i.productName} ×${i.quantity}`).join(', ')} · Commission ${money(s.commission)} · Profit ${money(s.total - s.cost - s.commission)} · ${s.managerName || 'Branch Admin —'}`, amount: s.total, section: 'branches' }));
  branches.transfers.filter(t => branchFilter === 'all' || t.branchId === branchFilter).forEach(t => addActivity({ id: `branch-transfer-${t.id}`, date: t.date, type: 'Branch stock', title: t.productName, detail: `${branches.branches.find(b => b.id === t.branchId)?.name || 'Branch'} · ${t.quantity} units transferred`, section: 'branches' }));
  if (branchFilter === 'all' || branchFilter === 'main') {
    purchases.forEach(p => addActivity({ id: `purchase-${p.id}`, date: `${p.date} ${p.time || ''}`, type: 'Purchase', title: p.purchaseNo, detail: `${p.supplierName} · ${p.status} · ${p.items.map(i => `${i.productName} ×${i.quantity}`).join(', ')} · Paid ${money(p.paidAmount)}`, amount: p.totalAmount, section: 'purchases' }));
    returns.forEach(r => addActivity({ id: `return-${r.id}`, date: r.date, type: 'Return', title: r.returnNo, detail: `${r.customerName} · ${r.originalInvoiceNo} · ${r.reason}`, amount: -r.totalRefund, section: 'returns' }));
    inventoryMovements.forEach(m => addActivity({ id: `stock-${m.id}`, date: m.date, type: 'Stock movement', title: m.productName, detail: `${m.type} · ${m.quantityChange > 0 ? '+' : ''}${m.quantityChange} units · Balance ${m.stockAfter}${m.reason ? ` · ${m.reason}` : ''}`, section: 'inventory' }));
    supplierPayments.forEach(p => addActivity({ id: `supplier-payment-${p.id}`, date: `${p.date} ${p.time || ''}`, type: 'Supplier payment', title: p.paymentNo, detail: `${p.supplierName} · ${p.purchaseNo || ''} · ${p.accountName}`, amount: -p.amount, section: 'suppliers' }));
    deliveries.forEach(d => addActivity({ id: `delivery-${d.id}`, date: d.assignedAt, type: 'Delivery', title: d.invoiceNo, detail: `${d.customerName} · ${d.status} · ${d.driverName || 'Unassigned'} · ${d.deliveryAddress} · Collected ${money(d.cashCollected)}`, section: 'delivery' }));
    cargoShipments.forEach(c => addActivity({ id: `cargo-${c.id}`, date: c.date, type: 'Cargo', title: c.trackingNo, detail: `${c.customerName} · ${c.destinationCity} · ${c.status} · ${c.cargoCompany}`, amount: c.codAmount, section: 'cargo' }));
    transfers.forEach(t => addActivity({ id: `transfer-${t.id}`, date: t.date, type: 'Account transfer', title: `${t.fromAccountName} → ${t.toAccountName}`, detail: t.note || `Recorded by ${t.performedBy}`, amount: t.amount, section: 'accounts' }));
  }
  if (branchFilter === 'all') {
    incomes.forEach(i => addActivity({ id: `income-${i.id}`, date: i.date, type: 'Other income', title: i.title, detail: `${i.category} · ${i.depositedToAccountName}${i.notes ? ` · ${i.notes}` : ''}`, amount: i.amount, section: 'income' }));
    expenses.forEach(e => addActivity({ id: `expense-${e.id}`, date: e.date, type: 'Expense', title: e.title, detail: `${e.category}${e.adProductName ? ` · ${e.adProductName}` : ''} · ${e.paidFromAccountName}${e.notes ? ` · ${e.notes}` : ''}`, amount: -e.amount, section: 'expenses' }));
    fin.fundTransfers.forEach(t => addActivity({ id: `fund-${t.id}`, date: t.createdAt || t.date, type: 'Petty cash', title: t.fromAccountName, detail: `Fund transfer · ${t.notes || 'No note'} · ${t.createdBy}`, amount: t.amount, section: 'pettycash' }));
    fin.reconciliations.forEach(r => addActivity({ id: `reconciliation-${r.id}`, date: r.createdAt || r.date, type: 'EVC reconciliation', title: r.accountName, detail: `System ${money(r.ledgerBalance)} · Actual ${money(r.liveBalance)} · Difference ${money(r.difference)} · ${r.reason}`, section: 'evcrecon' }));
    auditLogs.forEach(a => addActivity({ id: `audit-${a.id}`, date: a.timestamp, type: 'System event', title: a.action, detail: `${a.target} · ${a.actor}${a.details ? ` · ${a.details}` : ''}`, section: 'settings' }));
  }
  activity.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const activityTypes = [...new Set(activity.map(a => a.type))].sort();
  const visibleActivity = activity.filter(a => (activityType === 'all' || a.type === activityType) && `${a.title} ${a.detail} ${a.type} ${a.date}`.toLowerCase().includes(activityQuery.toLowerCase().trim()));
  const metrics = [
    { id: 'kpi-today-sales', label: 'Sales', value: period.sales, note: 'Completed sales & orders', icon: ShoppingCart, to: 'sales' as NavSection, tone: 'mint' },
    { id: 'kpi-total-income', label: 'Other Income', value: period.income, note: 'Services & other income', icon: TrendingUp, to: 'income' as NavSection, tone: 'teal' },
    { id: 'kpi-total-expenses', label: 'Expenses', value: period.expenses, note: 'Operating costs', icon: TrendingDown, to: 'expenses' as NavSection, tone: 'clay' },
    { id: 'kpi-net-profit', label: 'Gross Profit', value: period.gross, note: 'After cost & commissions', icon: DollarSign, to: 'reports' as NavSection, tone: 'mint' },
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
            <div className="dashboard-kicker mb-2 flex items-center gap-2"><span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--dash-mint)]" /> STORE OVERVIEW <span className="text-muted-foreground">/ {periodLabel}</span></div>
            <h1 className="dashboard-heading text-2xl font-bold text-foreground sm:text-3xl">Good day, {currentUser.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sales and profit · {periodLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1" aria-label="Date presets">
              <Button size="sm" variant={lengthDays === 1 && start === format(new Date(), 'yyyy-MM-dd') ? 'default' : 'outline'} onClick={() => setPreset(1)}>Today</Button>
              <Button size="sm" variant={lengthDays === 7 ? 'default' : 'outline'} onClick={() => setPreset(7)}>7 days</Button>
              <Button size="sm" variant={lengthDays === 30 ? 'default' : 'outline'} onClick={() => setPreset(30)}>30 days</Button>
            </div>
            <Popover open={rangeOpen} onOpenChange={open => { setRangeOpen(open); if (open) setDraftRange(range); }}>
              <PopoverTrigger asChild><Button variant="outline" size="sm" aria-label="Choose date range" className="dashboard-date gap-2 border-border bg-card text-xs font-semibold"><CalendarDays className="h-4 w-4 text-primary" />{periodLabel}</Button></PopoverTrigger>
              <PopoverContent align="end" className="w-auto max-w-[calc(100vw-2rem)] p-3 pointer-events-auto">
                <Calendar mode="range" selected={draftRange} onSelect={setDraftRange} numberOfMonths={1} disabled={{ after: new Date() }} className="pointer-events-auto" />
                <div className="flex items-center justify-between gap-3 border-t border-border pt-3"><span className="text-xs text-muted-foreground">{draftRange?.from ? format(draftRange.from, 'MMM d, yyyy') : 'Start'} – {draftRange?.to ? format(draftRange.to, 'MMM d, yyyy') : 'End'}</span><Button size="sm" disabled={!draftRange?.from || !draftRange?.to} onClick={() => { if (draftRange?.from && draftRange.to) { setRange(draftRange); setRangeOpen(false); } }}>Apply</Button></div>
              </PopoverContent>
            </Popover>
          </div>
        </section>

        <section aria-label="Filters and export" className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">Branch
            <select aria-label="Branch filter" value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground">
              <option value="all">All (store + branches)</option>
              <option value="main">Main store</option>
              {branches.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5"><Download className="h-4 w-4" />CSV</Button>
            <Button size="sm" variant="outline" onClick={exportPDF} className="gap-1.5"><FileText className="h-4 w-4" />PDF</Button>
          </div>
        </section>
        {branchFilter !== 'all' && <p className="-mt-3 text-[11px] text-muted-foreground">Other income & expenses are counted only under “All”.</p>}

        <section aria-label="Period comparison" className="dashboard-panel border border-border bg-card p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="dashboard-heading text-base font-semibold text-foreground">Compared with previous period</h2><p className="text-xs text-muted-foreground">{comparedLabel} vs {prevLabel} · {branchName}</p></div><label className="text-xs text-muted-foreground">Comparison <select aria-label="Comparison days" value={comparisonDays} onChange={e => setComparisonDays(Number(e.target.value))} className="ml-2 h-9 rounded border border-border bg-card px-2 text-foreground"><option value={16}>16 days</option><option value={7}>7 days</option><option value={30}>30 days</option><option value={lengthDays}>Selected range ({lengthDays} days)</option></select></label></div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{comparison.map(c => { const p = pct(c.now, c.before); const good = p === null ? true : c.inverse ? p <= 0 : p >= 0; return (
            <div key={c.label} className="border border-border p-3"><div className="dashboard-kicker text-muted-foreground">{c.label}</div><div className="dashboard-heading mt-1 text-lg font-semibold text-foreground">{money(c.now)}</div><div className="mt-1 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Before {money(c.before)}</span><strong className={good ? 'text-primary' : 'text-destructive'}>{p === null ? 'new' : `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`}</strong></div></div>
          ); })}</div>
        </section>

        <section aria-label="Daily performance" className="grid gap-3 lg:grid-cols-[1.35fr_1fr_1fr]">
          <div id="kpi-today-net-profit" className="dashboard-feature dashboard-feature-profit flex min-h-[228px] flex-col justify-between p-5 sm:p-6">
            <div className="flex items-center justify-between"><span className="dashboard-kicker text-primary-foreground/70">NET PROFIT / TODAY</span><ArrowUpRight className="h-5 w-5 text-primary-foreground/70" /></div>
            <div><div className="dashboard-heading break-all text-4xl font-bold text-primary-foreground sm:text-5xl">{money(pTodayC.net)}</div><p className="mt-1 text-xs text-primary-foreground/75">Gross profit + other income − expenses</p></div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-primary-foreground/20 pt-3 text-xs sm:grid-cols-3">
              <div><span className="block text-primary-foreground/70">This month · 1–today</span><strong className="text-sm text-primary-foreground">{money(pMonthC.net)}</strong></div>
              <div><span className="block text-primary-foreground/70">This year</span><strong className="text-sm text-primary-foreground">{money(pYearC.net)}</strong></div>
              <div><span className="block text-primary-foreground/70">All time</span><strong className="text-sm text-primary-foreground">{money(allTimeProfit)}</strong></div>
            </div>
            <label className="mt-3 flex flex-wrap items-center gap-2 text-xs text-primary-foreground/75">Monthly history
              <select aria-label="Profit month" value={profitMonth} onChange={e => setProfitMonth(e.target.value)} className="max-w-full rounded border border-primary-foreground/30 bg-primary px-2 py-1 text-primary-foreground">{monthOptions.map(m => <option key={m} value={m}>{format(parseISO(`${m}-01`), 'MMMM yyyy')}</option>)}</select>
              <strong className="text-primary-foreground">{money(monthProfit)}</strong>
            </label>
          </div>
          <Button id="kpi-today-target" variant="ghost" onClick={() => onNavigate('targets')} className="dashboard-feature dashboard-feature-target group flex h-auto min-h-[228px] flex-col items-start justify-between whitespace-normal border border-border p-5 text-left hover:bg-accent sm:p-6">
            <div className="flex w-full items-center justify-between"><span className="dashboard-kicker text-muted-foreground">TODAY'S TARGET · {todayNetProfit >= todayTarget ? 'DHEERI' : 'DHIMAN'}</span><Target className="h-5 w-5 text-[var(--dash-clay)]" /></div>
            <div className="w-full"><div className={`dashboard-heading break-all text-3xl font-bold sm:text-4xl ${todayNetProfit >= todayTarget ? 'text-positive' : 'text-destructive'}`}>{todayNetProfit >= todayTarget ? '+' : '-'}{money(Math.abs(todayNetProfit - todayTarget))}</div><p className="mt-2 text-xs font-medium text-muted-foreground">Target {money(todayTarget)} − Net profit {money(todayNetProfit)}</p><div className="mt-3 h-1 w-full bg-muted"><div className="h-full bg-[var(--dash-forest)] transition-[width] duration-500" style={{ width: `${targetProgressPct}%` }} /></div></div>
          </Button>
          <div className="dashboard-feature dashboard-feature-summary flex min-h-[172px] flex-col justify-between border border-border p-5 sm:p-6"><span className="dashboard-kicker text-muted-foreground">SELECTED PERIOD</span><div className="space-y-2 text-sm"><div className="flex items-center justify-between border-b border-border pb-2"><span className="text-muted-foreground">Sales</span><strong className="font-semibold text-foreground">{money(period.sales)}</strong></div><div className="flex items-center justify-between border-b border-border pb-2"><span className="text-muted-foreground">Gross profit</span><strong className="font-semibold text-foreground">{money(period.gross)}</strong></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Expenses</span><strong className="font-semibold text-[var(--dash-clay)]">{money(period.expenses)}</strong></div></div></div>
        </section>

        <section aria-label="Today month year" className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {([['Sales', 'sales'], ['Net Profit', 'net'], ['Gross Profit', 'gross'], ['Other Income', 'income'], ['Expenses', 'expenses']] as const).map(([label, k]) => { const v = tri(k); return (
            <div key={k} id={`kpi-tri-${k}`} className="border border-border bg-card p-3.5">
              <div className="dashboard-kicker text-muted-foreground">{label}</div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Maanta</span><strong className="text-foreground">{money(v.today)}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bishan (1 – maanta)</span><strong className="text-foreground">{money(v.month)}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sannadka (1/1 – maanta)</span><strong className="text-foreground">{money(v.year)}</strong></div>
              </div>
            </div>
          ); })}
        </section>

        <section aria-label="Targets" className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {tgtRows.map(r => { const remaining = Math.max(0, r.target - r.net); const extra = Math.max(0, r.net - r.target); return (
            <div key={r.label} id={`kpi-target-${r.label.toLowerCase()}`} className="border border-border bg-card p-3.5">
              <div className="flex items-center justify-between"><span className="dashboard-kicker text-muted-foreground">{r.label} target</span><Target className="h-4 w-4 text-[var(--dash-clay)]" /></div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Target</span><strong className="text-foreground">{money(r.target)}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Net profit</span><strong className="text-foreground">{money(r.net)}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Remaining</span><strong className="text-destructive">{money(remaining)}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dheeri (extra)</span><strong className="text-primary">{money(extra)}</strong></div>
              </div>
            </div>
          ); })}
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
          <div className="dashboard-panel min-w-0 border border-border bg-card p-4 sm:p-5"><div className="mb-5 flex flex-wrap items-start justify-between gap-2"><div><h2 className="dashboard-heading text-base font-semibold text-foreground">Daily sales & net profit</h2><p className="text-xs text-muted-foreground">{periodLabel} · Completed sales, orders & branches</p></div><div className="flex gap-3 text-[11px] font-medium text-muted-foreground"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[var(--dash-forest)]" />Sales</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[var(--dash-clay)]" />Net profit</span></div></div><div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={performanceData} margin={{ top: 8, right: 8, left: -23, bottom: 0 }}><CartesianGrid stroke="var(--dash-line)" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--dash-subtle)' }} axisLine={false} tickLine={false} minTickGap={15} /><YAxis tick={{ fontSize: 10, fill: 'var(--dash-subtle)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} /><Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ''} contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: 4, fontSize: 12 }} formatter={(value: number) => money(value)} /><Area name="Sales" type="monotone" dataKey="sales" stroke="var(--dash-forest)" strokeWidth={2} fill="var(--dash-forest)" fillOpacity={0.08} /><Area name="Net profit" type="monotone" dataKey="profit" stroke="var(--dash-clay)" strokeWidth={2} fill="var(--dash-clay)" fillOpacity={0.04} /></AreaChart></ResponsiveContainer></div></div>
          <div className="dashboard-panel border border-border bg-card p-4 sm:p-5"><h2 className="dashboard-heading text-base font-semibold text-foreground">Financial position</h2><p className="text-xs text-muted-foreground">Cash, credit & stock at retail value</p><div className="relative mx-auto mt-3 h-36 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={hasAssets ? assets : [{ name: 'No assets', value: 1, color: 'var(--muted)' }]} dataKey="value" innerRadius={49} outerRadius={65} stroke="var(--card)" strokeWidth={3}>{(hasAssets ? assets : [{ name: 'No assets', value: 1, color: 'var(--muted)' }]).map(x => <Cell key={x.name} fill={x.color} />)}</Pie><Tooltip formatter={(value: number) => money(hasAssets ? value : 0)} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="dashboard-kicker text-muted-foreground">TOTAL ASSETS</span><strong className="dashboard-heading text-lg text-foreground">{money(pool)}</strong></div></div><div className="mt-2 divide-y divide-border">{assets.map(x => <div key={x.name} className="flex items-center justify-between py-2 text-xs"><span className="text-muted-foreground">{x.name}</span><strong className="text-foreground">{money(x.value)}</strong></div>)}</div></div>
        </section>

        {branchRows.length > 0 && <section aria-label="Branch performance" className="dashboard-panel border border-border bg-card p-4 sm:p-5"><h2 className="dashboard-heading text-base font-semibold text-foreground">Sales & profit by branch</h2><p className="mb-3 text-xs text-muted-foreground">{periodLabel}</p><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-2">Branch</th><th className="py-2 text-right">Sales #</th><th className="py-2 text-right">Sales</th><th className="py-2 text-right">Commission</th><th className="py-2 text-right">Profit</th></tr></thead><tbody className="divide-y divide-border">{branchRows.map(r => <tr key={r.id} onClick={() => setBranchFilter(r.id)} className={`cursor-pointer hover:bg-accent ${branchFilter === r.id ? 'bg-accent' : ''}`}><td className="py-2 font-semibold text-foreground">{r.name}</td><td className="py-2 text-right">{r.count}</td><td className="py-2 text-right">{money(r.sales)}</td><td className="py-2 text-right">{money(r.commission)}</td><td className="py-2 text-right font-semibold text-foreground">{money(r.profit)}</td></tr>)}</tbody></table></div></section>}

        <section aria-label="Business activity" className="dashboard-panel border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="dashboard-heading text-base font-semibold text-foreground">Business activity</h2><p className="text-xs text-muted-foreground">{periodLabel} · {branchName} · {visibleActivity.length} events</p></div><div className="flex flex-wrap gap-2"><input aria-label="Search business activity" placeholder="Search activity…" value={activityQuery} onChange={e => { setActivityQuery(e.target.value); setActivityLimit(25); }} className="h-9 min-w-0 max-w-full rounded border border-border bg-background px-3 text-xs text-foreground" /><select aria-label="Activity type" value={activityType} onChange={e => { setActivityType(e.target.value); setActivityLimit(25); }} className="h-9 rounded border border-border bg-background px-2 text-xs text-foreground"><option value="all">All events</option>{activityTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></div></div>
          {visibleActivity.length === 0 ? <p className="border-t border-border py-8 text-center text-sm text-muted-foreground">No matching activity in this period.</p> : <div className="divide-y divide-border border-t border-border">{visibleActivity.slice(0, activityLimit).map(a => <div key={a.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-xs sm:flex-nowrap"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="dashboard-kicker text-primary">{a.type}</span><span className="text-muted-foreground">{a.date}</span></div><div className="mt-1 font-semibold text-foreground">{a.title}</div><p className="mt-0.5 break-words text-muted-foreground">{a.detail}</p></div><div className="flex shrink-0 items-center gap-2">{a.amount !== undefined && <strong className={a.amount < 0 ? 'text-destructive' : 'text-foreground'}>{money(a.amount)}</strong>}<Button variant="ghost" size="icon" aria-label={`Open ${a.type} ${a.title}`} title={`Open ${a.type}`} className="h-7 w-7" onClick={() => onNavigate(a.section)}><ChevronRight className="h-4 w-4" /></Button></div></div>)}</div>}
          {visibleActivity.length > activityLimit && <div className="pt-4 text-center"><Button variant="outline" size="sm" onClick={() => setActivityLimit(n => n + 25)}>Show more ({visibleActivity.length - activityLimit} remaining)</Button></div>}
        </section>
      </div>
    </div>
  );
};
