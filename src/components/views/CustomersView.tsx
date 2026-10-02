import React, { useState, useMemo } from 'react';
import {
  Users,
  DollarSign,
  Phone,
  MapPin,
  Search,
  Plus,
  ArrowDownLeft,
  CreditCard,
  FileText,
  UserCheck,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Customer } from '../../types';
import { StatCard } from '../common/StatCard';

interface CustomersViewProps {
  onOpenNewCustomer: () => void;
  onReceivePayment: (customer: Customer) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  onOpenNewCustomer,
  onReceivePayment,
}) => {
  const { customers, sales } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'debt' | 'active'>('all');
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchFilter =
        filterType === 'all'
          ? true
          : filterType === 'debt'
          ? c.balance > 0
          : c.status === 'active';

      return matchSearch && matchFilter;
    });
  }, [customers, searchQuery, filterType]);

  const totalDebt = customers.reduce((sum, c) => sum + c.balance, 0);
  const customersWithDebt = customers.filter((c) => c.balance > 0).length;

  const customerPurchases = useMemo(() => {
    if (!selectedCustomerForHistory) return [];
    return sales.filter((s) => s.customerId === selectedCustomerForHistory.id);
  }, [sales, selectedCustomerForHistory]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Customers
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Balance and credit headroom come from the customer balance read model.
          </p>
        </div>

        <button
          onClick={onOpenNewCustomer}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4 text-lime-400 stroke-[3]" />
          Add Customer
        </button>
      </div>

      {/* KPI Cards (Screenshot 15) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Customers"
          value={customers.length}
          subtitle="Registered accounts"
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Active"
          value={customers.filter((c) => c.status === 'active').length}
          subtitle="Ready for commercial sales"
          icon={UserCheck}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        <StatCard
          title="With Debt"
          value={customersWithDebt}
          subtitle="Accounts owing balance"
          icon={CreditCard}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />

        <StatCard
          title="Total Outstanding Debt"
          value={`$${totalDebt.toFixed(2)}`}
          subtitle="Uncollected customer ledger"
          icon={DollarSign}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          highlight={totalDebt > 0}
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, district..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          {(['all', 'debt', 'active'] as const).map((ft) => (
            <button
              key={ft}
              onClick={() => setFilterType(ft)}
              className={`px-3 py-2 rounded-xl font-semibold capitalize transition-all ${
                filterType === ft
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {ft === 'debt' ? 'With Debt' : ft === 'active' ? 'Active only' : 'All Customers'}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table (Screenshot 15) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-4">District / Address</th>
                <th className="py-3 px-3 text-right">Credit Limit</th>
                <th className="py-3 px-3 text-right">Outstanding Debt</th>
                <th className="py-3 px-3 text-right">Total Purchases</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No customers match these filters.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center uppercase shrink-0">
                          {c.name.slice(0, 2)}
                        </div>
                        <div>
                          <div>{c.name}</div>
                          {c.email && (
                            <div className="text-[10px] text-slate-400 font-normal">{c.email}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-600 font-mono">
                      {c.phone}
                    </td>

                    <td className="py-3 px-4 text-slate-500 truncate max-w-xs">
                      {c.address || 'Mogadishu'}
                    </td>

                    <td className="py-3 px-3 text-right text-slate-600">
                      ${c.creditLimit.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-black">
                      <span
                        className={
                          c.balance > 0
                            ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full'
                            : 'text-slate-400'
                        }
                      >
                        ${c.balance.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-semibold text-slate-900">
                      ${c.totalPurchases.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {c.balance > 0 && (
                          <button
                            onClick={() => onReceivePayment(c)}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
                          >
                            Receive Payment
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedCustomerForHistory(c)}
                          className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          title="View Invoices History"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Purchase Statement Drawer / Modal */}
      {selectedCustomerForHistory && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {selectedCustomerForHistory.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedCustomerForHistory.phone} • Debt: ${selectedCustomerForHistory.balance.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomerForHistory(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <div>
              <div className="text-xs font-bold uppercase text-slate-400 mb-2">
                Order Invoices History
              </div>
              {customerPurchases.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No invoices recorded for this customer yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {customerPurchases.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 font-mono">{s.invoiceNo}</div>
                        <div className="text-[11px] text-slate-500">{s.date} • {s.time}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">${s.grandTotal.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-400">
                          {s.remainingBalance > 0
                            ? `Owes: $${s.remainingBalance.toFixed(2)}`
                            : 'Fully Paid'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedCustomerForHistory(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
