import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { useStore } from "../../context/StoreContext";
import { Driver } from "../../types";

interface NewDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewDriverModal: React.FC<NewDriverModalProps> = ({ isOpen, onClose }) => {
  const { addDriver } = useStore();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState<Driver["vehicleType"]>("motorcycle");
  const [licensePlate, setLicensePlate] = useState("");
  const [active, setActive] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addDriver({
      name: name.trim(),
      phone: phone.trim() || "+252 61",
      vehicleType,
      licensePlate: licensePlate.trim() || "MOG-NEW",
      active,
    });

    onClose();
    setName("");
    setPhone("");
    setLicensePlate("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New driver"
      subtitle="Drivers carry COD and / or transport cargo"
      maxWidth="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="form-new-driver"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            Save driver
          </button>
        </>
      }
    >
      <form id="form-new-driver" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Driver full name..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+252 61 XXX XXXX"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Vehicle
            </label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as Driver["vehicleType"])}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 capitalize"
            >
              <option value="motorcycle">Motorcycle (Bajaaj / Bike)</option>
              <option value="van">Delivery Van</option>
              <option value="car">Small Car</option>
              <option value="truck">Cargo Truck</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            License Plate / ID
          </label>
          <input
            type="text"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value)}
            placeholder="e.g. MOG-2841-B"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 font-mono"
          />
        </div>

        <div className="pt-2 flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <span className="text-xs font-bold text-slate-800">Active Duty</span>
            <p className="text-[10px] text-slate-500">
              Available to take new deliveries and COD runs
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActive(!active)}
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
              active ? "bg-emerald-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                active ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </form>
    </Modal>
  );
};
