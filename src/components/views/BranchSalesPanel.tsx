import React, { useMemo, useState } from "react";
import { Building, Plus, PackagePlus, ShoppingBag } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import {
  useBranches,
  addBranch,
  updateBranch,
  addBranchStock,
  recordBranchSale,
  BranchSaleItem,
} from "../../lib/branch-store";

const input = "w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white";

export const BranchSalesPanel: React.FC = () => {
  const { products, adjustStock } = useStore();
  const st = useBranches();
  const [branchId, setBranchId] = useState("");
  const branch = st.branches.find((b) => b.id === branchId) || st.branches[0];
  const bid = branch?.id || "";

  // New branch
  const [newName, setNewName] = useState("");
  const [newManager, setNewManager] = useState("");
  const [newComm, setNewComm] = useState(2);

  // Transfer stock
  const [tProd, setTProd] = useState("");
  const [tQty, setTQty] = useState(1);

  // Sale cart
  const [cart, setCart] = useState<BranchSaleItem[]>([]);
  const [sProd, setSProd] = useState("");
  const [sQty, setSQty] = useState(1);
  const [sPrice, setSPrice] = useState(0);

  const bStock = st.stock[bid] || {};
  const stockRows = useMemo(
    () =>
      Object.entries(bStock)
        .map(([pid, qty]) => ({ p: products.find((x) => x.id === pid), pid, qty }))
        .filter((r) => r.p),
    [bStock, products],
  );
  const branchSales = st.sales.filter((s) => s.branchId === bid);
  const totals = branchSales.reduce(
    (a, s) => ({ total: a.total + s.total, comm: a.comm + s.commission, profit: a.profit + s.total - s.cost - s.commission }),
    { total: 0, comm: 0, profit: 0 },
  );

  const doTransfer = () => {
    const p = products.find((x) => x.id === tProd);
    if (!p || !bid || tQty <= 0) return;
    if (p.stock < tQty) return alert("Stock-ga bakhaarka dhexe kuma filna.");
    adjustStock(p.id, -tQty, `U wareejin branch: ${branch?.name}`, "adjustment");
    addBranchStock(bid, p.id, p.name, tQty);
    setTQty(1);
  };

  const addToCart = () => {
    const p = products.find((x) => x.id === sProd);
    if (!p || sQty <= 0) return;
    setCart((c) => [
      ...c,
      { productId: p.id, productName: p.name, quantity: sQty, unitPrice: sPrice || p.sellingPrice, costPrice: p.costPrice },
    ]);
    setSQty(1);
    setSPrice(0);
  };

  const saveSale = () => {
    const err = recordBranchSale(bid, cart);
    if (err) return alert(err);
    setCart([]);
  };

  return (
    <div className="space-y-4">
      {/* Branch picker + create */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Branch</label>
          <select value={bid} onChange={(e) => setBranchId(e.target.value)} className={input}>
            {st.branches.length === 0 && <option value="">— Weli branch ma jiro —</option>}
            {st.branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        {branch && (
          <div className="w-44">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Branch Admin</label>
            <input value={branch.manager || ""} placeholder="Magaca Branch Admin-ka"
              onChange={(e) => updateBranch(branch.id, { manager: e.target.value })}
              className={input} />
          </div>
        )}
        {branch && (
          <div className="w-40">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Commission iib kasta ($)</label>
            <input type="number" min="0" value={branch.commission}
              onChange={(e) => updateBranch(branch.id, { commission: parseFloat(e.target.value) || 0 })}
              className={input} />
          </div>
        )}
        <div className="flex-1" />
        <input placeholder="Magaca branch-ka (tus. Garoowe)" value={newName} onChange={(e) => setNewName(e.target.value)} className={`${input} max-w-[180px]`} />
        <input placeholder="Branch Admin (magaciisa)" value={newManager} onChange={(e) => setNewManager(e.target.value)} className={`${input} max-w-[160px]`} />
        <input type="number" min="0" placeholder="Commission $" value={newComm || ""} onChange={(e) => setNewComm(parseFloat(e.target.value) || 0)} className={`${input} max-w-[110px]`} />
        <button
          onClick={() => { if (newName.trim()) { addBranch(newName, newManager, newComm); setNewName(""); setNewManager(""); setNewComm(2); } }}
          className="px-3 py-2 bg-slate-900 text-lime-400 rounded-lg text-xs font-bold flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Branch Cusub
        </button>
      </div>

      {st.branches.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <div className="px-4 pt-3 text-xs font-bold uppercase text-slate-700">Dhammaan Branches — Kooban</div>
          <table className="w-full text-xs mt-2">
            <thead className="bg-slate-100 text-slate-600 uppercase text-[11px]"><tr>
              <th className="py-2 px-3 text-left">Branch</th><th className="px-3 text-left">Branch Admin</th><th className="px-3 text-right">La diray</th>
              <th className="px-3 text-right">La iibiyay</th><th className="px-3 text-right">Taal</th>
              <th className="px-3 text-right">Iibka $</th><th className="px-3 text-right">Commission $</th><th className="px-3 text-right">Faa'iido $</th></tr></thead>
            <tbody>
              {st.branches.map((b) => {
                const sent = st.transfers.filter((t) => t.branchId === b.id).reduce((a, t) => a + t.quantity, 0);
                const bsales = st.sales.filter((x) => x.branchId === b.id);
                const sold = bsales.reduce((a, x) => a + x.items.reduce((q, i) => q + i.quantity, 0), 0);
                const left = Object.values(st.stock[b.id] || {}).reduce((a, q) => a + q, 0);
                const tot = bsales.reduce((a, x) => a + x.total, 0);
                const com = bsales.reduce((a, x) => a + x.commission, 0);
                const prof = bsales.reduce((a, x) => a + x.total - x.cost - x.commission, 0);
                return (
                  <tr key={b.id} onClick={() => setBranchId(b.id)} className={`border-t border-slate-100 cursor-pointer hover:bg-slate-50 ${b.id === bid ? "bg-lime-50" : ""}`}>
                    <td className="py-2 px-3 font-bold">{b.name}</td>
                    <td className="px-3 text-slate-600">{b.manager || "—"}</td>
                    <td className="px-3 text-right font-mono">{sent}</td>
                    <td className="px-3 text-right font-mono">{sold}</td>
                    <td className="px-3 text-right font-mono font-bold">{left}</td>
                    <td className="px-3 text-right font-mono">${tot.toFixed(2)}</td>
                    <td className="px-3 text-right font-mono text-amber-700">${com.toFixed(2)}</td>
                    <td className="px-3 text-right font-mono text-emerald-700">${prof.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {branch && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[["Iibka Branch-ka", totals.total], ["Commission", totals.comm], ["Faa'iido (kadib commission)", totals.profit]].map(([l, v]) => (
              <div key={l as string} className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-semibold text-slate-500">{l}</div>
                <div className="mt-1 text-xl font-extrabold font-mono text-slate-900">${(v as number).toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Stock */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold uppercase text-slate-700 flex items-center gap-2"><PackagePlus className="w-4 h-4" /> Stock-ga {branch.name}</div>
              <div className="flex gap-2">
                <select value={tProd} onChange={(e) => setTProd(e.target.value)} className={input}>
                  <option value="">Dooro alaab…</option>
                  {products.filter((p) => !p.isArchived).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (bakhaar: {p.stock})</option>
                  ))}
                </select>
                <input type="number" min="1" value={tQty} onChange={(e) => setTQty(parseInt(e.target.value) || 0)} className={`${input} w-20`} />
                <button onClick={doTransfer} className="px-3 bg-lime-400 text-slate-900 rounded-lg text-xs font-bold whitespace-nowrap">U dir</button>
              </div>
              <table className="w-full text-xs">
                <thead className="text-slate-500"><tr><th className="text-left py-1">Alaab</th><th className="text-right">Taal</th></tr></thead>
                <tbody>
                  {stockRows.length === 0 ? (
                    <tr><td colSpan={2} className="py-4 text-center text-slate-400">Alaab weli looma diiwaan gelin branch-kan.</td></tr>
                  ) : stockRows.map((r) => (
                    <tr key={r.pid} className="border-t border-slate-100"><td className="py-1.5">{r.p!.name}</td><td className={`text-right font-mono font-bold ${r.qty <= 0 ? "text-rose-600" : ""}`}>{r.qty}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Record sale */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold uppercase text-slate-700 flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Diiwaan geli iib branch</div>
              <div className="flex gap-2">
                <select value={sProd} onChange={(e) => setSProd(e.target.value)} className={input}>
                  <option value="">Dooro alaab…</option>
                  {stockRows.filter((r) => r.qty > 0).map((r) => (
                    <option key={r.pid} value={r.pid}>{r.p!.name} ({r.qty})</option>
                  ))}
                </select>
                <input type="number" min="1" value={sQty} onChange={(e) => setSQty(parseInt(e.target.value) || 0)} className={`${input} w-16`} />
                <input type="number" min="0" placeholder="Qiimo" value={sPrice || ""} onChange={(e) => setSPrice(parseFloat(e.target.value) || 0)} className={`${input} w-20`} />
                <button onClick={addToCart} className="px-3 bg-slate-900 text-lime-400 rounded-lg text-xs font-bold">+</button>
              </div>
              {cart.map((c, i) => (
                <div key={i} className="flex justify-between text-xs border-t border-slate-100 pt-1">
                  <span>{c.productName} × {c.quantity}</span>
                  <span className="font-mono">${(c.quantity * c.unitPrice).toFixed(2)}
                    <button onClick={() => setCart(cart.filter((_, j) => j !== i))} className="ml-2 text-rose-500">×</button></span>
                </div>
              ))}
              {cart.length > 0 && (
                <button onClick={saveSale} className="w-full py-2 bg-lime-400 text-slate-900 rounded-lg text-xs font-bold">
                  Kaydi iibka — ${cart.reduce((s, c) => s + c.quantity * c.unitPrice, 0).toFixed(2)} (commission ${branch.commission.toFixed(2)})
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <div className="px-4 pt-3 text-xs font-bold uppercase text-slate-700">Taariikhda u wareejinta — {branch.name}</div>
            <table className="w-full text-xs mt-2">
              <tbody>
                {st.transfers.filter((t) => t.branchId === bid).length === 0 ? (
                  <tr><td className="py-4 text-center text-slate-400">Weli alaab looma dirin.</td></tr>
                ) : st.transfers.filter((t) => t.branchId === bid).map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="py-1.5 px-3">{t.date}</td><td className="px-3">{t.productName}</td>
                    <td className="px-3 text-right font-mono font-bold text-emerald-700">+{t.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[11px]"><tr>
                <th className="py-2 px-3 text-left">Taariikh</th><th className="px-3 text-left">Branch Admin</th><th className="px-3 text-left">Alaab</th>
                <th className="px-3 text-right">Wadarta</th><th className="px-3 text-right">Commission</th><th className="px-3 text-right">Faa'iido</th></tr></thead>
              <tbody>
                {branchSales.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400"><Building className="w-6 h-6 mx-auto mb-1" />Iib branch weli lama diiwaan gelin.</td></tr>
                ) : branchSales.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="py-2 px-3">{s.date} <span className="text-slate-400">{s.time}</span></td>
                    <td className="px-3 text-slate-600">{s.managerName || branch.manager || "—"}</td>
                    <td className="px-3">{s.items.map((i) => `${i.productName} (${i.quantity})`).join(", ")}</td>
                    <td className="px-3 text-right font-mono font-bold">${s.total.toFixed(2)}</td>
                    <td className="px-3 text-right font-mono text-amber-700">${s.commission.toFixed(2)}</td>
                    <td className="px-3 text-right font-mono text-emerald-700">${(s.total - s.cost - s.commission).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
