import React, { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import {
  useCargoCompanies,
  cargoActions,
  type CargoCompany,
  type CargoRegionRate,
} from "../../lib/cargo-store";

type Draft = {
  id?: string;
  name: string;
  phone: string;
  address: string;
  rates: CargoRegionRate[];
};
const inp = "w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white";
const lbl = "block text-[11px] font-bold uppercase text-slate-500 mb-1";

export const CargoView: React.FC = () => {
  const list = useCargoCompanies();
  const [edit, setEdit] = useState<Draft | null>(null);

  const save = () => {
    if (!edit) return;
    if (!edit.name.trim()) return alert("Magaca Cargo-da geli");
    const rates = edit.rates.filter((r) => r.region.trim());
    cargoActions.save({ ...edit, name: edit.name.trim(), rates });
    setEdit(null);
  };
  const updRate = (i: number, p: Partial<CargoRegionRate>) =>
    edit && setEdit({ ...edit, rates: edit.rates.map((r, j) => (j === i ? { ...r, ...p } : r)) });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900">Cargo</h2>
        <button
          onClick={() =>
            setEdit({ name: "", phone: "", address: "", rates: [{ region: "", rate: 0 }] })
          }
          className="px-4 py-2 text-sm font-bold rounded-lg bg-slate-900 text-white flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Diiwaan geli Cargo
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-[11px] uppercase text-slate-400">
              <th className="p-3">Cargo Name</th>
              <th className="p-3">Taleefan</th>
              <th className="p-3">Address</th>
              <th className="p-3">Gobolada & Rates</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400">
                  Weli Cargo lama diiwaan gelin.
                </td>
              </tr>
            )}
            {list.map((c: CargoCompany) => (
              <tr key={c.id}>
                <td className="p-3 font-bold">{c.name}</td>
                <td className="p-3">{c.phone || "—"}</td>
                <td className="p-3">{c.address || "—"}</td>
                <td className="p-3">
                  {c.rates.map((r, i) => (
                    <span
                      key={i}
                      className="inline-block mr-2 mb-1 px-2 py-0.5 rounded bg-slate-100 text-xs"
                    >
                      {r.region} ${r.rate}
                    </span>
                  ))}
                </td>
                <td className="p-3">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => setEdit({ ...c, rates: c.rates.map((r) => ({ ...r })) })}
                      className="p-1.5 rounded hover:bg-slate-100"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => confirm(`Tirtir ${c.name}?`) && cargoActions.remove(c.id)}
                      className="p-1.5 rounded hover:bg-rose-50 text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black">
                {edit.id ? "Wax ka beddel Cargo" : "Diiwaan geli Cargo"}
              </h3>
              <button onClick={() => setEdit(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className={lbl}>Cargo Name *</label>
              <input
                className={inp}
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </div>
            <div>
              <label className={lbl}>Taleefan Number</label>
              <input
                className={inp}
                value={edit.phone}
                onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
              />
            </div>
            <div>
              <label className={lbl}>Address</label>
              <input
                className={inp}
                value={edit.address}
                onChange={(e) => setEdit({ ...edit, address: e.target.value })}
              />
            </div>
            <div>
              <label className={lbl}>Gobolada & Rates</label>
              <div className="space-y-2">
                {edit.rates.map((r, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className={inp}
                      placeholder="Gobolka (tusaale Hargeisa)"
                      value={r.region}
                      onChange={(e) => updRate(i, { region: e.target.value })}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      className={`${inp} w-28`}
                      placeholder="Rate $"
                      value={r.rate}
                      onChange={(e) => updRate(i, { rate: parseFloat(e.target.value) || 0 })}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setEdit({ ...edit, rates: edit.rates.filter((_, j) => j !== i) })
                      }
                      className="p-2 text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setEdit({ ...edit, rates: [...edit.rates, { region: "", rate: 0 }] })
                }
                className="mt-2 px-3 py-2 text-xs font-bold rounded-lg bg-slate-100"
              >
                + Add Region
              </button>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setEdit(null)}
                className="px-4 py-2 text-sm font-bold rounded-lg bg-slate-100"
              >
                Ka noqo
              </button>
              <button
                onClick={save}
                className="px-4 py-2 text-sm font-bold rounded-lg bg-slate-900 text-white"
              >
                Kaydi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
