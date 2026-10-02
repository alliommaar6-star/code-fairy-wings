import React, { useState } from "react";
import {
  Truck,
  Phone,
  DollarSign,
  Plus,
  CheckCircle2,
  AlertCircle,
  Search,
  UserCheck,
  Bike,
  Car,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { Driver } from "../../types";
import { StatCard } from "../common/StatCard";

interface DriversViewProps {
  onOpenNewDriver: () => void;
}

export const DriversView: React.FC<DriversViewProps> = ({ onOpenNewDriver }) => {
  const { drivers, updateDriver, sales } = useStore();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone.includes(searchQuery) ||
      d.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalCodWithDrivers = drivers.reduce(
    (sum, d) => sum + (d.totalCodCollected ?? d.cashHeld ?? 0),
    0,
  );

  const getVehicleIcon = (type: Driver["vehicleType"]) => {
    switch (type) {
      case "motorcycle":
        return <Bike className="w-4 h-4 text-emerald-600" />;
      case "van":
        return <Truck className="w-4 h-4 text-blue-600" />;
      case "truck":
        return <Truck className="w-4 h-4 text-purple-600" />;
      case "car":
      default:
        return <Car className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Drivers</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Drivers carry COD cash on delivery runs and transport regional cargo handovers.
          </p>
        </div>

        <button
          onClick={onOpenNewDriver}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4 text-lime-400 stroke-[3]" />
          New driver
        </button>
      </div>

      {/* KPI Cards (Screenshot 22) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Drivers"
          value={drivers.length}
          subtitle="Registered courier personnel"
          icon={Truck}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="On Active Duty"
          value={drivers.filter((d) => d.active).length}
          subtitle="Available for runs today"
          icon={UserCheck}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        <StatCard
          title="COD Carried (Pending)"
          value={`$${totalCodWithDrivers.toFixed(2)}`}
          subtitle="Collected cash in transit"
          icon={DollarSign}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          highlight={totalCodWithDrivers > 0}
        />

        <StatCard
          title="Deliveries Completed"
          value={drivers.reduce(
            (sum, d) => sum + (d.totalDeliveriesCompleted ?? d.deliveriesCompleted ?? 0),
            0,
          )}
          subtitle="Fulfilled client orders"
          icon={CheckCircle2}
          iconBg="bg-lime-50"
          iconColor="text-lime-700"
        />
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search driver name, phone, license plate..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Drivers List (Screenshot 22) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDrivers.map((d) => (
          <div
            key={d.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-100 flex items-center justify-center">
                    {getVehicleIcon(d.vehicleType)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{d.name}</h3>
                    <div className="text-[10px] text-slate-400 font-mono">{d.licensePlate}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => updateDriver(d.id, { active: !d.active })}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase transition-colors ${
                    d.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {d.active ? "Active" : "Off Duty"}
                </button>
              </div>

              <div className="space-y-2 mt-4 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Phone:</span>
                  <span className="font-semibold text-slate-900 font-mono">{d.phone}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Vehicle Type:</span>
                  <span className="font-semibold capitalize text-slate-900">{d.vehicleType}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Deliveries Done:</span>
                  <span className="font-bold text-slate-900">
                    {d.totalDeliveriesCompleted ?? d.deliveriesCompleted ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Current COD In Hand:</span>
              <span className="font-black text-emerald-600 text-sm">
                ${(d.totalCodCollected ?? d.cashHeld ?? 0).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
