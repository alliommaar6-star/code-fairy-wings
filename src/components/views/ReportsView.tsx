import React from "react";
import { FinancialStatementsPanel } from "./FinancialStatementsPanel";

export const ReportsView: React.FC = () => (
  <div className="p-4 sm:p-6 lg:p-8 space-y-4 max-w-7xl mx-auto">
    <div>
      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Reports & Financial Statements</h2>
      <p className="text-sm text-slate-500">Warbixin faahfaahsan: iibka, kharashka, dakhliga, lacagta iyo dhammaan dhaqdhaqaaqa ganacsiga — shaandheyn, raadin iyo soo dejin.</p>
    </div>
    <FinancialStatementsPanel defaultTab="sales" />
  </div>
);
