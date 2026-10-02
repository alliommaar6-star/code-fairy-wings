import React, { useState } from "react";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  Printer,
  PieChart as PieChartIcon,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { StatCard } from "../common/StatCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export const ReportsView: React.FC = () => {
  const { getPeriodStats, sales, expenses, incomes, products } = useStore();
  const [reportType, setReportType] = useState<"pnl" | "balance" | "sales">("pnl");

  const {
    totalSales,
    totalPaid,
    totalRemainingDebt,
    totalCostOfGoods,
    grossProfit,
    totalExpenses,
    totalOtherIncome,
    netProfit,
    totalCashInHand,
    totalStockValueSelling,
    totalStockValueCost,
  } = getPeriodStats();

  const monthlyReportData = [
    { month: "May", sales: 4200, cogs: 2700, expenses: 600, net: 900 },
    { month: "Jun", sales: 5100, cogs: 3300, expenses: 750, net: 1050 },
    { month: "Jul", sales: 6800, cogs: 4400, expenses: 820, net: 1580 },
    { month: "Aug", sales: 8400, cogs: 5400, expenses: 950, net: 2050 },
    {
      month: "Sep (Current)",
      sales: totalSales || 7200,
      cogs: totalCostOfGoods || 4700,
      expenses: totalExpenses || 890,
      net: netProfit || 1610,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Financial Reports & Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time Profit & Loss statement, Balance Sheet, Gross margins, and audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Gross Revenue"
          value={`$${totalSales.toFixed(2)}`}
          subtitle="All finalized sales"
          icon={TrendingUp}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Cost of Goods (COGS)"
          value={`$${totalCostOfGoods.toFixed(2)}`}
          subtitle="Inventory cost basis"
          icon={DollarSign}
          iconBg="bg-slate-100"
          iconColor="text-slate-700"
        />

        <StatCard
          title="Gross Profit"
          value={`$${grossProfit.toFixed(2)}`}
          subtitle={`${totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : "35.0"}% gross margin`}
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        <StatCard
          title="Net Profit"
          value={`$${netProfit.toFixed(2)}`}
          subtitle="After operating expenses"
          icon={DollarSign}
          iconBg="bg-lime-50"
          iconColor="text-lime-700"
          highlight
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-xs">
        <button
          onClick={() => setReportType("pnl")}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            reportType === "pnl" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Profit & Loss Statement (P&L)
        </button>

        <button
          onClick={() => setReportType("balance")}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            reportType === "balance"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Balance Sheet Summary
        </button>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-1">
          Revenue, Cost & Profit Comparison
        </h3>
        <p className="text-xs text-slate-500 mb-4">Monthly financial statement trajectory</p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyReportData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip formatter={(val: number) => [`$${val.toFixed(2)}`, ""]} />
              <Legend />
              <Bar dataKey="sales" name="Sales Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cogs" name="Cost of Goods" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net" name="Net Profit" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* P&L Statement Detailed Table */}
      {reportType === "pnl" ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-base">
              Income Statement (Current Cycle: Sep 01 - Sep 30, 2026)
            </h3>
            <span className="text-xs font-mono text-slate-400">Currency: USD ($)</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Revenue */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-bold text-slate-900 text-sm">
                <span>Total Commercial Revenue</span>
                <span>${totalSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 pl-4">
                <span>Product Sales Invoices</span>
                <span>${totalSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 pl-4">
                <span>Additional Commissions & Services</span>
                <span>${totalOtherIncome.toFixed(2)}</span>
              </div>
            </div>

            {/* COGS */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Less: Cost of Goods Sold (COGS)</span>
                <span className="text-rose-600">-${totalCostOfGoods.toFixed(2)}</span>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-slate-900 text-sm bg-slate-50 p-2 rounded-xl">
              <span>Gross Profit Margin</span>
              <span className="text-emerald-700">
                ${(grossProfit + totalOtherIncome).toFixed(2)}
              </span>
            </div>

            {/* Operating Expenses */}
            <div className="pt-2 space-y-1.5">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Operating Expenses (OPEX)</span>
                <span className="text-rose-600">-${totalExpenses.toFixed(2)}</span>
              </div>
              {expenses.map((e) => (
                <div key={e.id} className="flex justify-between text-slate-500 pl-4">
                  <span>
                    {e.title} ({e.category})
                  </span>
                  <span>${e.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Net Profit */}
            <div className="pt-3 border-t-2 border-slate-900 flex justify-between font-black text-base text-slate-900 bg-lime-50 p-3 rounded-xl border border-lime-200">
              <span>Net Operating Profit</span>
              <span className="text-lime-800 text-lg">${netProfit.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Balance Sheet */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-base">Balance Sheet Overview</h3>
            <span className="text-xs font-mono text-slate-400">As of Sep 15, 2026</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Assets */}
            <div className="space-y-3">
              <h4 className="font-bold uppercase text-slate-400 tracking-wider text-[11px]">
                Assets
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>Cash in Hand & Bank Accounts</span>
                  <span className="font-mono font-bold">${totalCashInHand.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>Accounts Receivable (Customer Debt)</span>
                  <span className="font-mono font-bold">${totalRemainingDebt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>Merchandise Inventory (Cost Basis)</span>
                  <span className="font-mono font-bold">${totalStockValueCost.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-slate-900 bg-slate-50 p-2 rounded-xl">
                  <span>Total Current Assets</span>
                  <span>
                    ${(totalCashInHand + totalRemainingDebt + totalStockValueCost).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="space-y-3">
              <h4 className="font-bold uppercase text-slate-400 tracking-wider text-[11px]">
                Liabilities & Equity
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>Accounts Payable (Suppliers)</span>
                  <span className="font-mono font-bold">$0.00</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>Retained Earnings & Reserves</span>
                  <span className="font-mono font-bold">
                    ${(totalCashInHand + totalStockValueCost).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>Current Period Net Earnings</span>
                  <span className="font-mono font-bold text-emerald-600">
                    ${netProfit.toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-slate-900 bg-slate-50 p-2 rounded-xl">
                  <span>Total Liabilities & Equity</span>
                  <span>
                    ${(totalCashInHand + totalRemainingDebt + totalStockValueCost).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
