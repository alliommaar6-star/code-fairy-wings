import React, { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Power, Search, X } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import {
  useDelivery,
  deliveryActions,
  type DeliveryCompany,
  type DeliveryLocation,
  type DeliveryDriver,
  type LocationRate,
} from "../../lib/delivery-store";

type Tab = "dashboard" | "companies" | "locations" | "drivers" | "orders";
const inp = "w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white";
const btn = "px-3 py-2 text-xs font-bold rounded-lg";

const statusOf = (s?: string) => {
  const v = (s || "").toUpperCase();
  if (v.includes("CANCEL")) return "Cancelled";
  if (v.includes("FAIL")) return "Failed";
  if (v.includes("DELIVERED") || v.includes("COMPLETED")) return "Delivered";
  if (v.includes("WAY") || v.includes("TRANSIT") || v.includes("OUT_FOR")) return "On The Way";
  if (v.includes("PICKED")) return "Picked Up";
  if (v.includes("ASSIGNED") && !v.includes("UN")) return "Assigned";
  return "Pending";
};

export const DeliveryManagementView: React.FC = () => {
  const d = useDelivery();
  const { orders } = useStore();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [q, setQ] = useState("");
  const [editCompany, setEditCompany] = useState<Partial<DeliveryCompany> | null>(null);
  const [editLoc, setEditLoc] = useState<Partial<DeliveryLocation> | null>(null);
  const [editDriver, setEditDriver] = useState<Partial<DeliveryDriver> | null>(null);

  const cname = (id: string) => d.companies.find((c) => c.id === id)?.name ?? "—";
  const deliveryOrders = useMemo(
    () => orders.filter((o) => o.fulfillmentType === "Delivery"),
    [orders],
  );
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    deliveryOrders.forEach((o) => {
      const s = statusOf(String(o.fulfillmentStatus || o.status));
      m[s] = (m[s] || 0) + 1;
    });
    return m;
  }, [deliveryOrders]);
  const custPaid = deliveryOrders
    .filter((o) => o.deliveryFeePayer !== "Business")
    .reduce((s, o) => s + (o.deliveryFee || 0), 0);
  const bizPaid = deliveryOrders
    .filter((o) => o.deliveryFeePayer === "Business")
    .reduce((s, o) => s + (o.deliveryRate || 0), 0);
  const match = (t: string) => t.toLowerCase().includes(q.toLowerCase());

  const Card = ({ t, v }: { t: string; v: string | number }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="text-[10px] uppercase font-bold text-slate-400">{t}</div>
      <div className="text-lg font-black text-slate-900">{v}</div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900">Delivery Management</h2>
        <p className="text-xs text-slate-500">
          Goobaha, shirkadaha, qiimaha iyo darawallada gaarsiinta.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["dashboard", "companies", "locations", "drivers", "orders"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setQ("");
            }}
            className={`${btn} capitalize ${tab === t ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}
          >
            {t === "dashboard"
              ? "Dashboard"
              : t === "companies"
                ? "Companies"
                : t === "locations"
                  ? "Locations & Rates"
                  : t === "drivers"
                    ? "Drivers"
                    : "Delivery Orders"}
          </button>
        ))}
      </div>

      {tab !== "dashboard" && (
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Raadi..."
              className={`${inp} pl-9`}
            />
          </div>
          {tab === "companies" && (
            <button
              className={`${btn} bg-slate-900 text-white flex items-center gap-1`}
              onClick={() => setEditCompany({ name: "", active: true })}
            >
              <Plus className="w-4 h-4" />
              Add Company
            </button>
          )}
          {tab === "locations" && (
            <button
              className={`${btn} bg-slate-900 text-white flex items-center gap-1`}
              onClick={() => setEditLoc({ name: "", district: "", rates: [], active: true })}
            >
              <Plus className="w-4 h-4" />
              Add Location
            </button>
          )}
          {tab === "drivers" && (
            <button
              className={`${btn} bg-slate-900 text-white flex items-center gap-1`}
              onClick={() =>
                setEditDriver({
                  name: "",
                  phone: "",
                  companyId: d.companies[0]?.id ?? "",
                  active: true,
                })
              }
            >
              <Plus className="w-4 h-4" />
              Add Driver
            </button>
          )}
        </div>
      )}

      {tab === "dashboard" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card t="Delivery Companies" v={d.companies.length} />
          <Card t="Total Drivers" v={d.drivers.length} />
          <Card t="Active Drivers" v={d.drivers.filter((x) => x.active).length} />
          <Card t="Total Deliveries" v={deliveryOrders.length} />
          {[
            "Pending",
            "Assigned",
            "Picked Up",
            "On The Way",
            "Delivered",
            "Failed",
            "Cancelled",
          ].map((s) => (
            <Card key={s} t={s} v={counts[s] || 0} />
          ))}
          <Card t="Total Delivery Charges" v={`$${(custPaid + bizPaid).toFixed(2)}`} />
          <Card t="Customer-paid" v={`$${custPaid.toFixed(2)}`} />
          <Card t="Business-paid" v={`$${bizPaid.toFixed(2)}`} />
        </div>
      )}

      {tab === "companies" && (
        <Table head={["Company", "Phone", "Contact", "Drivers", "Status", ""]}>
          {d.companies
            .filter((c) => match(c.name))
            .map((c) => (
              <tr key={c.id}>
                <td className="p-3 font-bold">{c.name}</td>
                <td className="p-3">{c.phone || "—"}</td>
                <td className="p-3">{c.contactPerson || "—"}</td>
                <td className="p-3">{d.drivers.filter((x) => x.companyId === c.id).length}</td>
                <td className="p-3">
                  <Status on={c.active} />
                </td>
                <td className="p-3">
                  <Actions
                    onEdit={() => setEditCompany(c)}
                    onToggle={() => deliveryActions.saveCompany({ ...c, active: !c.active })}
                    onDelete={() =>
                      confirm(
                        `Tirtir ${c.name}? Darawalladeeda iyo qiimaheeda sidoo kale waa la tirtirayaa.`,
                      ) && deliveryActions.deleteCompany(c.id)
                    }
                  />
                </td>
              </tr>
            ))}
        </Table>
      )}

      {tab === "locations" && (
        <Table head={["Location", "District", "Company rates", "Status", ""]}>
          {d.locations
            .filter((l) => match(l.name + l.district))
            .map((l) => (
              <tr key={l.id}>
                <td className="p-3 font-bold">{l.name}</td>
                <td className="p-3">{l.district}</td>
                <td className="p-3">
                  {l.rates.map((r) => (
                    <span
                      key={r.companyId}
                      className={`inline-block mr-2 ${r.active ? "" : "line-through text-slate-400"}`}
                    >
                      {cname(r.companyId)} ${r.rate}
                    </span>
                  ))}
                </td>
                <td className="p-3">
                  <Status on={l.active} />
                </td>
                <td className="p-3">
                  <Actions
                    onEdit={() => setEditLoc(l)}
                    onToggle={() => deliveryActions.saveLocation({ ...l, active: !l.active })}
                    onDelete={() =>
                      confirm(`Tirtir ${l.name}?`) && deliveryActions.deleteLocation(l.id)
                    }
                  />
                </td>
              </tr>
            ))}
        </Table>
      )}

      {tab === "drivers" && (
        <Table head={["Driver", "Phone", "Company", "Deliveries", "Status", ""]}>
          {d.drivers
            .filter((x) => match(x.name + x.phone + cname(x.companyId)))
            .map((x) => (
              <tr key={x.id}>
                <td className="p-3 font-bold">{x.name}</td>
                <td className="p-3">{x.phone}</td>
                <td className="p-3">{cname(x.companyId)}</td>
                <td className="p-3">{deliveryOrders.filter((o) => o.driverId === x.id).length}</td>
                <td className="p-3">
                  <Status on={x.active} />
                </td>
                <td className="p-3">
                  <Actions
                    onEdit={() => setEditDriver(x)}
                    onToggle={() => deliveryActions.saveDriver({ ...x, active: !x.active })}
                    onDelete={() =>
                      confirm(`Tirtir ${x.name}?`) && deliveryActions.deleteDriver(x.id)
                    }
                  />
                </td>
              </tr>
            ))}
        </Table>
      )}

      {tab === "orders" && (
        <Table
          head={[
            "Order",
            "Customer",
            "Location",
            "District",
            "Company",
            "Driver",
            "Rate",
            "Charged",
            "Paid by",
            "Status",
            "Date",
          ]}
        >
          {deliveryOrders
            .filter((o) => match(o.orderNo + o.customerName + (o.deliveryCompany || "")))
            .map((o) => (
              <tr key={o.id}>
                <td className="p-3 font-mono font-bold">{o.orderNo}</td>
                <td className="p-3">{o.customerName}</td>
                <td className="p-3">{o.deliveryLocation || "—"}</td>
                <td className="p-3">{o.deliveryDistrict || "—"}</td>
                <td className="p-3">{o.deliveryCompany || "—"}</td>
                <td className="p-3">{o.driverName || "—"}</td>
                <td className="p-3">${(o.deliveryRate ?? o.deliveryFee ?? 0).toFixed(2)}</td>
                <td className="p-3">${(o.deliveryFee || 0).toFixed(2)}</td>
                <td className="p-3">{o.deliveryFeePayer || "Customer"}</td>
                <td className="p-3">{statusOf(String(o.fulfillmentStatus || o.status))}</td>
                <td className="p-3 whitespace-nowrap">
                  {o.date} {o.time}
                </td>
              </tr>
            ))}
        </Table>
      )}

      {editCompany && (
        <Dialog
          title={editCompany.id ? "Edit Company" : "Add Delivery Company"}
          onClose={() => setEditCompany(null)}
          onSave={() => {
            if (!editCompany.name?.trim()) return alert("Magaca shirkadda geli");
            deliveryActions.saveCompany(editCompany as DeliveryCompany);
            setEditCompany(null);
          }}
        >
          {(["name", "phone", "contactPerson", "address", "notes"] as const).map((k) => (
            <input
              key={k}
              className={inp}
              placeholder={
                {
                  name: "Company Name *",
                  phone: "Phone",
                  contactPerson: "Contact Person",
                  address: "Address",
                  notes: "Notes",
                }[k]
              }
              value={(editCompany[k] as string) || ""}
              onChange={(e) => setEditCompany({ ...editCompany, [k]: e.target.value })}
            />
          ))}
        </Dialog>
      )}

      {editLoc && (
        <Dialog
          title={editLoc.id ? "Edit Location" : "Add Delivery Location"}
          onClose={() => setEditLoc(null)}
          onSave={() => {
            if (!editLoc.name?.trim() || !editLoc.district?.trim())
              return alert("Magaca goobta iyo degmada geli");
            const ids = (editLoc.rates || []).map((r) => r.companyId);
            if (ids.some((id) => !id) || new Set(ids).size !== ids.length)
              return alert("Shirkad kasta hal qiime oo keliya ha lahaato");
            deliveryActions.saveLocation(editLoc as DeliveryLocation);
            setEditLoc(null);
          }}
        >
          <input
            className={inp}
            placeholder="Location Name *"
            value={editLoc.name || ""}
            onChange={(e) => setEditLoc({ ...editLoc, name: e.target.value })}
          />
          <input
            className={inp}
            placeholder="District *"
            value={editLoc.district || ""}
            onChange={(e) => setEditLoc({ ...editLoc, district: e.target.value })}
          />
          <div className="text-[11px] font-bold text-slate-600">Company Rates</div>
          {(editLoc.rates || []).map((r, i) => {
            const upd = (p: Partial<LocationRate>) =>
              setEditLoc({
                ...editLoc,
                rates: editLoc.rates!.map((x, j) => (j === i ? { ...x, ...p } : x)),
              });
            return (
              <div key={i} className="flex gap-2 items-center">
                <select
                  className={inp}
                  value={r.companyId}
                  onChange={(e) => upd({ companyId: e.target.value })}
                >
                  <option value="">Dooro shirkad</option>
                  {d.companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className={`${inp} w-24`}
                  value={r.rate}
                  onChange={(e) => upd({ rate: parseFloat(e.target.value) || 0 })}
                />
                <button
                  type="button"
                  title="Activate/Deactivate"
                  onClick={() => upd({ active: !r.active })}
                  className={`p-2 rounded ${r.active ? "text-emerald-600" : "text-slate-400"}`}
                >
                  <Power className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditLoc({ ...editLoc, rates: editLoc.rates!.filter((_, j) => j !== i) })
                  }
                  className="p-2 text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className={`${btn} bg-slate-100`}
            onClick={() =>
              setEditLoc({
                ...editLoc,
                rates: [...(editLoc.rates || []), { companyId: "", rate: 0, active: true }],
              })
            }
          >
            + Add Company Rate
          </button>
          <input
            className={inp}
            placeholder="Notes"
            value={editLoc.notes || ""}
            onChange={(e) => setEditLoc({ ...editLoc, notes: e.target.value })}
          />
        </Dialog>
      )}

      {editDriver && (
        <Dialog
          title={editDriver.id ? "Edit Driver" : "Add Driver"}
          onClose={() => setEditDriver(null)}
          onSave={() => {
            if (!editDriver.name?.trim() || !editDriver.phone?.trim())
              return alert("Magaca iyo telefoonka geli");
            if (!editDriver.companyId) return alert("Darawalku waa inuu leeyahay shirkad");
            deliveryActions.saveDriver(editDriver as DeliveryDriver);
            setEditDriver(null);
          }}
        >
          <input
            className={inp}
            placeholder="Driver Name *"
            value={editDriver.name || ""}
            onChange={(e) => setEditDriver({ ...editDriver, name: e.target.value })}
          />
          <input
            className={inp}
            placeholder="Phone *"
            value={editDriver.phone || ""}
            onChange={(e) => setEditDriver({ ...editDriver, phone: e.target.value })}
          />
          <select
            className={inp}
            value={editDriver.companyId || ""}
            onChange={(e) => setEditDriver({ ...editDriver, companyId: e.target.value })}
          >
            <option value="">Delivery Company *</option>
            {d.companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className={inp}
            placeholder="Notes"
            value={editDriver.notes || ""}
            onChange={(e) => setEditDriver({ ...editDriver, notes: e.target.value })}
          />
        </Dialog>
      )}
    </div>
  );
};

const Table: React.FC<{ head: string[]; children: React.ReactNode }> = ({ head, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="bg-slate-50 text-[10px] uppercase text-slate-400">
          {head.map((h, i) => (
            <th key={i} className="p-3">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);
const Status = ({ on }: { on: boolean }) => (
  <span
    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${on ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}
  >
    {on ? "Active" : "Inactive"}
  </span>
);
const Actions = ({
  onEdit,
  onToggle,
  onDelete,
}: {
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) => (
  <div className="flex gap-1 justify-end">
    <button onClick={onEdit} className="p-1.5 rounded hover:bg-slate-100" title="Edit">
      <Pencil className="w-3.5 h-3.5" />
    </button>
    <button
      onClick={onToggle}
      className="p-1.5 rounded hover:bg-slate-100"
      title="Activate/Deactivate"
    >
      <Power className="w-3.5 h-3.5" />
    </button>
    <button
      onClick={onDelete}
      className="p-1.5 rounded hover:bg-rose-50 text-rose-600"
      title="Delete"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
);
const Dialog: React.FC<{
  title: string;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, onSave, children }) => (
  <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center">
        <h3 className="font-black">{title}</h3>
        <button onClick={onClose}>
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onClose} className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-100">
          Ka noqo
        </button>
        <button
          onClick={onSave}
          className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white"
        >
          Kaydi
        </button>
      </div>
    </div>
  </div>
);
