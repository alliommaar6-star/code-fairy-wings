import React, { useState } from "react";
import { Plus, Smartphone, Store, Landmark, X } from "lucide-react";

export type PayGroup = "wallet" | "merchant" | "bank";
export type PaySelection = { group: PayGroup; name: string } | null;

const KEY = "benadir_payment_accounts_v1";
const DEFAULTS: Record<PayGroup, string[]> = {
  wallet: ["EVC Plus", "E-Dahab", "Somnet Jeeb", "Premier Wallet", "Ebessa"],
  merchant: ["Hormuud", "Somtel", "PremierWallet", "MyCash"],
  bank: [
    "Salaam Somali Bank",
    "Premier Bank",
    "MyBank",
    "IBS Bank",
    "SOMBANK",
    "AmalBank",
    "Amaana Bank",
    "Dahabshiil",
  ],
};

function load(): Record<PayGroup, string[]> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

const GROUPS: { id: PayGroup; label: string; addLabel: string; Icon: React.ElementType }[] = [
  { id: "wallet", label: "Mobile Wallets", addLabel: "Add New", Icon: Smartphone },
  { id: "merchant", label: "Merchants", addLabel: "Add New", Icon: Store },
  { id: "bank", label: "Banks", addLabel: "Add Bank", Icon: Landmark },
];

export const PaymentAccountsPicker: React.FC<{
  value: PaySelection;
  onChange: (v: PaySelection) => void;
}> = ({ value, onChange }) => {
  const [lists, setLists] = useState(load);
  const [adding, setAdding] = useState<PayGroup | null>(null);
  const [draft, setDraft] = useState("");

  const save = (next: Record<PayGroup, string[]>) => {
    setLists(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };

  const add = (g: PayGroup) => {
    const name = draft.trim();
    if (!name) return;
    if (!lists[g].some((n) => n.toLowerCase() === name.toLowerCase()))
      save({ ...lists, [g]: [...lists[g], name] });
    onChange({ group: g, name });
    setDraft("");
    setAdding(null);
  };

  const remove = (g: PayGroup, name: string) => {
    if (!confirm(`Ma hubtaa inaad tirtirto "${name}"?`)) return;
    save({ ...lists, [g]: lists[g].filter((n) => n !== name) });
    if (value?.group === g && value.name === name) onChange(null);
  };

  return (
    <div className="space-y-3">
      {GROUPS.map(({ id, label, addLabel, Icon }) => (
        <div key={id}>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 mb-1.5">
            <Icon className="w-3.5 h-3.5" /> {label}
          </div>
          <div className="flex flex-wrap gap-2">
            {lists[id].map((name) => {
              const active = value?.group === id && value.name === name;
              return (
                <span
                  key={name}
                  className={`group inline-flex items-center rounded-lg border text-xs font-semibold transition ${active ? "bg-slate-900 text-lime-400 border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"}`}
                >
                  <button
                    type="button"
                    onClick={() => onChange(active ? null : { group: id, name })}
                    className="px-3 py-1.5"
                  >
                    {name}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(id, name)}
                    title="Tirtir"
                    className="pr-2 opacity-40 hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {adding === id ? (
              <span className="inline-flex items-center gap-1">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      add(id);
                    }
                    if (e.key === "Escape") setAdding(null);
                  }}
                  placeholder="Magaca..."
                  className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white w-36"
                />
                <button
                  type="button"
                  onClick={() => add(id)}
                  className="px-2 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg"
                >
                  Ku dar
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAdding(id);
                  setDraft("");
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-dashed border-slate-400 text-slate-600 rounded-lg hover:bg-white"
              >
                <Plus className="w-3 h-3" /> {addLabel}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
