import React, { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { useDelivery, rateFor, type DeliverySelection } from "../../lib/delivery-store";

type Props = {
  value: DeliverySelection;
  onChange: (v: DeliverySelection) => void;
};

/** Shared Delivery section used by both New Order and New Sale. */
export const DeliveryFields: React.FC<Props> = ({ value, onChange }) => {
  const s = useDelivery();
  const locations = s.locations.filter((l) => l.active);
  const loc = locations.find((l) => l.id === value.locationId);
  const companies = s.companies.filter(
    (c) => c.active && (!loc || loc.rates.some((r) => r.active && r.companyId === c.id)),
  );
  const drivers = s.drivers.filter((d) => d.active && d.companyId === value.companyId);
  const rate = rateFor(s, value.locationId, value.companyId);

  // Clear company/driver when they no longer fit the selection.
  useEffect(() => {
    if (value.companyId && !companies.some((c) => c.id === value.companyId))
      onChange({ ...value, companyId: "", driverId: "" });
    else if (value.driverId && !drivers.some((d) => d.id === value.driverId))
      onChange({ ...value, driverId: "" });
  }, [value.locationId, value.companyId, s]); // eslint-disable-line react-hooks/exhaustive-deps

  const sel =
    "w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 font-medium bg-white";
  const lab = "block text-[11px] font-semibold text-slate-600 mb-1";

  return (
    <div className="space-y-3 bg-white p-3.5 rounded-lg border border-slate-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={lab}>1. Goobta (Delivery Location) *</label>
          <select
            value={value.locationId}
            onChange={(e) => onChange({ ...value, locationId: e.target.value })}
            className={sel}
          >
            <option value="">Dooro goob</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} — {l.district}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={lab}>2. Shirkadda Gaarsiinta (Delivery Company) *</label>
          <select
            value={value.companyId}
            disabled={!value.locationId}
            onChange={(e) => onChange({ ...value, companyId: e.target.value, driverId: "" })}
            className={sel}
          >
            <option value="">{value.locationId ? "Dooro shirkad" : "Marka hore dooro goob"}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={lab}>3. Qiimaha Gaarsiinta (automatic)</label>
          <div className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 font-mono font-bold text-slate-900">
            {rate === null ? "—" : `$${rate.toFixed(2)}`}
          </div>
        </div>
        <div>
          <label className={lab}>4. Darawalka (Driver)</label>
          <select
            value={value.driverId}
            disabled={!value.companyId}
            onChange={(e) => onChange({ ...value, driverId: e.target.value })}
            className={sel}
          >
            <option value="">
              {drivers.length ? "Dooro darawal (ama dambe)" : "Darawal lama diiwaan gelin"}
            </option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.phone}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={lab}>Yaa bixinaya gaarsiinta?</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...value, payer: "Customer" })}
            className={`py-1.5 rounded-lg text-xs font-bold border ${value.payer === "Customer" ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600 border-slate-200"}`}
          >
            Macmiilka
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, payer: "Business" })}
            className={`py-1.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 ${value.payer === "Business" ? "bg-emerald-600 text-white border-emerald-600" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}
          >
            <CheckCircle2 className="w-3 h-3" /> Ganacsiga (FREE DELIVERY)
          </button>
        </div>
      </div>
    </div>
  );
};

/** Derives everything an Order/Sale needs to store from a selection. */
export function resolveDelivery(s: ReturnType<typeof useDelivery>, v: DeliverySelection) {
  const loc = s.locations.find((l) => l.id === v.locationId);
  const company = s.companies.find((c) => c.id === v.companyId);
  const driver = s.drivers.find((d) => d.id === v.driverId);
  const amount = rateFor(s, v.locationId, v.companyId);
  return {
    valid: !!loc && !!company && amount !== null,
    amount: amount ?? 0,
    customerFee: v.payer === "Customer" ? (amount ?? 0) : 0,
    businessFee: v.payer === "Business" ? (amount ?? 0) : 0,
    loc,
    company,
    driver,
  };
}
