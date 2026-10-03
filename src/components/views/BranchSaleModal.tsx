import React, { useMemo, useState } from "react";
import { Store, Plus, Trash2, X } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { useBranches, recordBranchSale, type BranchSaleItem } from "../../lib/branch-store";

/**
 * Branch Sale — same flow as a direct sale (Pickup, full payment) but the
 * stock comes from a selected branch and a fixed per-item commission is
 * charged to the branch manager.
 */
export const BranchSaleModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { products } = useStore();
  const { branches, stock } = useBranches();

  const [branchId, setBranchId] = useState("");
  const [items, setItems] = useState<BranchSaleItem[]>([]);
  const [pickProductId, setPickProductId] = useState("");
  const [notes, setNotes] = useState("");

  const branch = branches.find((b) => b.id === branchId);
  const branchStock = stock[branchId] || {};

  // Products available in the selected branch (qty > 0)
  const available = useMemo(
    () =>
      products
        .filter((p) => (branchStock[p.id] || 0) > 0)
        .map((p) => ({ ...p, branchQty: branchStock[p.id] || 0 })),
    [products, branchStock],
  );

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const commission = (branch?.commission ?? 2) * totalQty;

  const addItem = () => {
    const p = available.find((x) => x.id === pickProductId);
    if (!p) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === p.id
            ? { ...i, quantity: Math.min(i.quantity + 1, p.branchQty) }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          productName: p.name,
          quantity: 1,
          unitPrice: p.sellingPrice,
          costPrice: p.costPrice,
        },
      ];
    });
    setPickProductId("");
  };

  const setQty = (productId: string, qty: number) => {
    const max = branchStock[productId] || 0;
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.max(1, Math.min(qty, max)) }
          : i,
      ),
    );
  };

  const reset = () => {
    setItems([]);
    setNotes("");
    setPickProductId("");
  };

  const handleSubmit = () => {
    if (!branch) {
      alert("Fadlan dooro branch-ka.");
      return;
    }
    if (items.length === 0) {
      alert("Fadlan ku dar ugu yaraan hal alaab.");
      return;
    }
    const err = recordBranchSale(branchId, items, notes.trim() || undefined);
    if (err) {
      alert(err);
      return;
    }
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-6 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header — same style as direct sale */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-lime-400 text-black flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Iibka Laamaha (Branch Sale) — Pickup, Lacag Buuxda
              </h2>
              <p className="text-xs text-slate-400">
                {new Date().toLocaleDateString()} · Commission: $
                {(branch?.commission ?? 2).toFixed(2)} alaab kasta
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Branch selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Dooro Branch-ka (Gobolka)
            </label>
            <select
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setItems([]);
                setPickProductId("");
              }}
              className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 bg-white font-semibold"
            >
              <option value="">— Dooro branch (tusaale: Garoowe, Kismaayo) —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — commission ${b.commission.toFixed(2)}/alaab
                </option>
              ))}
            </select>
            {branches.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1">
                Weli branch lama samaysan — tag tab-ka "Branches" si aad u abuurto.
              </p>
            )}
          </div>

          {/* Item picker */}
          {branch && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex gap-2">
                <select
                  value={pickProductId}
                  onChange={(e) => setPickProductId(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Dooro alaabta (stock-ka {branch.name})</option>
                  {available.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${p.sellingPrice.toFixed(2)} ({p.branchQty} haray)
                    </option>
                  ))}
                </select>
                <button
                  onClick={addItem}
                  disabled={!pickProductId}
                  className="px-3 py-2 rounded-lg bg-slate-900 text-lime-400 text-xs font-bold flex items-center gap-1 disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" /> Ku dar
                </button>
              </div>

              {items.length > 0 && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-1.5 font-semibold">Alaabta</th>
                      <th className="py-1.5 font-semibold text-center">Tirada</th>
                      <th className="py-1.5 font-semibold text-right">Qiimaha</th>
                      <th className="py-1.5 font-semibold text-right">Wadarta</th>
                      <th className="py-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.productId} className="border-b border-slate-100">
                        <td className="py-2 font-semibold text-slate-800">{i.productName}</td>
                        <td className="py-2 text-center">
                          <input
                            type="number"
                            min={1}
                            max={branchStock[i.productId] || 1}
                            value={i.quantity}
                            onChange={(e) =>
                              setQty(i.productId, parseInt(e.target.value) || 1)
                            }
                            className="w-16 px-2 py-1 text-center border border-slate-300 rounded-lg"
                          />
                        </td>
                        <td className="py-2 text-right font-mono">${i.unitPrice.toFixed(2)}</td>
                        <td className="py-2 text-right font-mono font-bold">
                          ${(i.quantity * i.unitPrice).toFixed(2)}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() =>
                              setItems((prev) => prev.filter((x) => x.productId !== i.productId))
                            }
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Faallo (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              placeholder="Tusaale: macmiil magaciisa..."
            />
          </div>

          {/* Summary */}
          <div className="bg-slate-900 rounded-xl p-4 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>Wadarta Iibka ({totalQty} alaab):</span>
              <span className="font-mono font-bold text-white">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-amber-300">
              <span>
                Commission Branch Manager (${(branch?.commission ?? 2).toFixed(2)} × {totalQty}):
              </span>
              <span className="font-mono font-bold">-${commission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lime-400 font-black text-sm pt-1.5 border-t border-slate-700">
              <span>Lacagta Ganacsiga (kadib commission):</span>
              <span className="font-mono">${(total - commission).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            Jooji
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-900 text-xs font-black shadow-md transition"
          >
            Diiwaan Geli Iibka (Full Payment)
          </button>
        </div>
      </div>
    </div>
  );
};
