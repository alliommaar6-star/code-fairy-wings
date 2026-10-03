import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { useStore } from "../../context/StoreContext";
import { Expense, PaymentAccount } from "../../types";
import { Coins, Building2, Smartphone, Wallet, Plus, ArrowRight, Info, CheckCircle2 } from "lucide-react";

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({ isOpen, onClose }) => {
  const { accounts, addAccount, addExpense, currentUser, products } = useStore();
  const [adProductId, setAdProductId] = useState<string>("");
  const isAds = category === "Facebook Ads";

  const [isPettyCash, setIsPettyCash] = useState<boolean>(true);
  const [category, setCategory] = useState<string>("Transportation");
  const [customExpenseName, setCustomExpenseName] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || "");
  const [notes, setNotes] = useState<string>("");

  // Quick inline add payment account
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState<PaymentAccount["type"]>("Mobile Money");

  // Keep accountId valid if accounts load or change
  React.useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const selectedAccount = accounts.find((a) => a.id === accountId) || accounts[0];

  const handleQuickAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;
    const newAcc: PaymentAccount = {
      id: `acc-${Date.now()}`,
      name: newAccName.trim(),
      type: newAccType,
      balance: 0,
      currency: "USD",
      isActive: true,
    };
    addAccount(newAcc);
    setAccountId(newAcc.id);
    setNewAccName("");
    setIsAddingAccount(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Fadlan geli qiimo sax ah oo kharashka ah ($)");
      return;
    }

    if (category === "Other" && !customExpenseName.trim()) {
      alert("Fadlan geli magaca kharashka (tusaale: Parking, Shaah, iwm).");
      return;
    }

    const adProduct = isAds ? products.find((p) => p.id === adProductId) : undefined;
    if (isAds && !adProduct) {
      alert("Fadlan dooro product-ka xayeysiinta Facebook loo sameeyay.");
      return;
    }

    const acc = selectedAccount;
    if (!acc) {
      alert("Fadlan dooro account-ka lacagta laga bixiyay (tusaale: EVC Plus, Cash).");
      return;
    }

    // Build definitive title
    let definitiveTitle = title.trim();
    if (!definitiveTitle && adProduct) {
      definitiveTitle = `Facebook Ads — ${adProduct.name}`;
    }
    if (!definitiveTitle) {
      if (category === "Other" && customExpenseName.trim()) {
        definitiveTitle = customExpenseName.trim();
      } else {
        definitiveTitle = `${category}${isPettyCash ? " (Petty Cash)" : ""}`;
      }
    }

    addExpense({
      title: definitiveTitle,
      category: category as Expense["category"],
      isPettyCash,
      pettyCashCategory: isPettyCash ? category : undefined,
      customExpenseName: category === "Other" ? customExpenseName.trim() : undefined,
      adProductId: adProduct?.id,
      adProductName: adProduct?.name,
      amount: parsedAmount,
      date,
      paidFromAccountId: acc.id,
      paidFromAccountName: acc.name,
      notes: notes.trim() || undefined,
      recordedBy: currentUser.name,
    });

    onClose();
    setTitle("");
    setCustomExpenseName("");
    setAmount("");
    setNotes("");
    setAdProductId("");
  };

  const parsedAmountNum = parseFloat(amount) || 0;
  const expenseDisplayName =
    category === "Other" && customExpenseName.trim()
      ? `Other Expense / ${customExpenseName.trim()}`
      : `${category} Expense`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Diiwaangeli Kharash (Record Expense)"
      subtitle="Lacagta dhabta ah ee account-ka laga bixiyey ayaa toos loo dhimayaa, iyadoo la raacayo shuruucda xisaabaadka (Double-Entry)."
      maxWidth="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
          >
            Ka noqo (Cancel)
          </button>
          <button
            type="submit"
            form="form-new-expense"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-lime-400 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-lime-400" />
            Diiwaangeli Kharashka (${parsedAmountNum > 0 ? parsedAmountNum.toFixed(2) : "0.00"})
          </button>
        </>
      }
    >
      <form id="form-new-expense" onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Petty Cash Selector Header */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                <Coins className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide block">
                  Petty Cash (Kharash Yar)?
                </span>
                <span className="text-[11px] text-slate-500">
                  Ma aha fund gooni ah — waa kharash toos looga jarayo account-ka lacagta laga bixiyay.
                </span>
              </div>
            </div>

            <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setIsPettyCash(true);
                  if (category === "Rent" || category === "Salaries") {
                    setCategory("Transportation");
                  }
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  isPettyCash
                    ? "bg-slate-900 text-lime-400 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Haa (Yes)
              </button>
              <button
                type="button"
                onClick={() => setIsPettyCash(false)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  !isPettyCash
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Maya (Standard)
              </button>
            </div>
          </div>
        </div>

        {/* Source Account (Where the real money was paid from) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              Account-ka Lacagta Laga Bixiyay (Source Account) *
            </label>
            <button
              type="button"
              onClick={() => setIsAddingAccount(!isAddingAccount)}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 text-lime-600" />
              {isAddingAccount ? "Xir" : "Ku dar Account Cusub"}
            </button>
          </div>

          {isAddingAccount ? (
            <div className="p-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
              <div className="text-[11px] font-bold text-slate-700">Ku dar Account Cusub:</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Magaca (tusaale: Somtel, Salaam Bank)"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <select
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value as PaymentAccount["type"])}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="Mobile Money">Mobile Money (EVC / Sahal)</option>
                  <option value="Cash">Cash (Khasnada)</option>
                  <option value="Bank">Bank (Account Bangi)</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleQuickAddAccount}
                className="px-3 py-1 bg-slate-900 text-lime-400 font-bold text-xs rounded-lg"
              >
                Keydi Account-ka
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {accounts.map((acc) => {
                const isSelected = acc.id === selectedAccount?.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setAccountId(acc.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10"
                        : "border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {acc.type.toLowerCase().includes("bank") ? (
                        <Building2 className={`w-4 h-4 ${isSelected ? "text-blue-300" : "text-blue-600"}`} />
                      ) : acc.type.toLowerCase().includes("mobile") ? (
                        <Smartphone className={`w-4 h-4 ${isSelected ? "text-emerald-300" : "text-emerald-600"}`} />
                      ) : (
                        <Wallet className={`w-4 h-4 ${isSelected ? "text-amber-300" : "text-amber-600"}`} />
                      )}
                      <div>
                        <div className="font-bold text-xs">{acc.name}</div>
                        <div className={`text-[10px] ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                          {acc.type}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-black ${isSelected ? "text-lime-400" : "text-slate-900"}`}>
                        ${acc.balance.toFixed(2)}
                      </div>
                      <div className={`text-[9px] ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                        Balance
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Category & Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Qeybta Kharashka (Category) *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900"
            >
              {isPettyCash ? (
                <>
                  <option value="Transportation">Transportation (Gaadiid / Bajaj / Taxi)</option>
                  <option value="Food & Refreshments">Food & Refreshments (Cunto / Shaah / Biyo)</option>
                  <option value="Supplies">Supplies & Packaging (Bacaha / Qalab)</option>
                  <option value="Utilities">Utilities & Airtime (Kaar / Koronto / Shidaal)</option>
                  <option value="Maintenance">Maintenance & Repairs (Dayactir yar)</option>
                  <option value="Other">Other Expenses (Kharashyo kale...)</option>
                </>
              ) : (
                <>
                  <option value="Rent">Rent (Kiro)</option>
                  <option value="Salaries">Salaries & Labor (Mushaaraad)</option>
                  <option value="Utilities">Utilities & Power (Koronto & Biyo)</option>
                  <option value="Logistics">Logistics & Fuel (Gaadiid & Shidaal)</option>
                  <option value="Marketing">Marketing (Xayeysiin)</option>
                  <option value="Facebook Ads">Facebook Ads (by Product)</option>
                  <option value="Maintenance">Maintenance (Dayactir guud)</option>
                  <option value="Supplies">Supplies (Qalabka Dukaanka)</option>
                  <option value="Other">Other Expenses (Kharashyo kale...)</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Lacagta Laga Bixiyay (Amount $) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5.00"
                className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>
        </div>

        {isAds && (
          <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3">
            <label className="block text-xs font-black uppercase tracking-wider text-sky-900 mb-1">
              Product-ka Xayeysiinta (Facebook Ads Product) *
            </label>
            <select
              required
              value={adProductId}
              onChange={(e) => setAdProductId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-sky-300 rounded-xl text-xs font-bold text-slate-900"
            >
              <option value="">— Dooro product —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="text-[11px] text-sky-800 mt-1">
              Kharashka ads-ka waxaa si gooni ah loogu xisaabin doonaa product-kan.
            </p>
          </div>
        )}

        {/* If category is Other: Add Name Field */}
        {category === "Other" && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 animate-in fade-in duration-200">
            <label className="block text-xs font-black uppercase tracking-wider text-amber-900 mb-1">
              Magaca Kharashka (Expense Name) *
            </label>
            <input
              type="text"
              required
              value={customExpenseName}
              onChange={(e) => setCustomExpenseName(e.target.value)}
              placeholder="Tusaale: Parking, Shaah & Biyo, Photocopy, Delivery Tip..."
              className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[11px] text-amber-800 mt-1">
              Kharashkan waxaa xisaabta loogu qori doonaa magacaan gaarka ah (tusaale: Dr. Other Expense / {customExpenseName.trim() || "[Magaca]"}).
            </p>
          </div>
        )}

        {/* Description & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Faahfaahin / Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Tusaale: ${category === "Other" && customExpenseName ? customExpenseName : "Bajaj keenista alaabta..."}`}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Taariikhda (Date)
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Qoraal Dheeraad ah (Notes / Reference)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Tusaale: Lambarka rasiidka, qofka lacagta qaatay, iwm..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900"
          />
        </div>

        {/* Real-time Double-Entry Accounting Preview Box */}
        <div className="bg-slate-900 text-white rounded-2xl p-3.5 space-y-2 border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between text-[11px] font-bold text-lime-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Diiwaanka Xisaabaadka (Double-Entry Journal Impact)
            </span>
            <span>Atomic Balance</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <div>
              <div className="text-slate-400 text-[10px] uppercase">Debit (Kharash Kordhay)</div>
              <div className="text-emerald-400 font-bold">
                Dr. {expenseDisplayName}
              </div>
              <div className="text-white text-xs">${parsedAmountNum.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase">Credit (Lacag Baxday)</div>
              <div className="text-rose-400 font-bold">
                Cr. {selectedAccount?.name || "Account"}
              </div>
              <div className="text-white text-xs">${parsedAmountNum.toFixed(2)}</div>
            </div>
          </div>

          <div className="text-[11px] text-slate-300 space-y-0.5 pt-1">
            <div className="flex items-center gap-1.5">
              <ArrowRight className="w-3 h-3 text-lime-400 shrink-0" />
              <span>
                <strong>{selectedAccount?.name || "Account"}</strong> balance-kiisa wuxuu toos u yaraanayaa{" "}
                <strong className="text-rose-400">-${parsedAmountNum.toFixed(2)}</strong>.
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowRight className="w-3 h-3 text-lime-400 shrink-0" />
              <span>
                Kharashka ganacsiga wuxuu kordhayaa{" "}
                <strong className="text-amber-300">+${parsedAmountNum.toFixed(2)}</strong>, faa'iidada guudna waxay u dhimanaysaa isla qaddarkaas.
              </span>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
