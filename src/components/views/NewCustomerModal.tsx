import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { useStore } from "../../context/StoreContext";
import { nextCode } from "../../utils/codes";

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewCustomerModal: React.FC<NewCustomerModalProps> = ({ isOpen, onClose }) => {
  const { addCustomer, customers } = useStore();
  const suggested = nextCode(
    "CU",
    customers.map((c) => c.code),
  );
  const [code, setCode] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [creditLimit, setCreditLimit] = useState("500");
  const [openingBalance, setOpeningBalance] = useState("0");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCode("");
    addCustomer({
      code: code.trim() || suggested,
      name: name.trim(),
      phone: phone.trim() || "+252 61",
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      creditLimit: parseFloat(creditLimit) || 0,
      balance: parseFloat(openingBalance) || 0,
      status: "active",
    });

    onClose();
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Customer"
      subtitle="Register client profile, debt headroom, and delivery address."
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
            form="form-new-customer"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            Save Customer
          </button>
        </>
      }
    >
      <form id="form-new-customer" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Customer ID (auto — waa la beddeli karaa)
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={suggested}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Customer Full Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hassan Mohamed Warsame"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Mobile Phone
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
              Email (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@email.com"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Credit Limit ($)
            </label>
            <input
              type="number"
              step="10"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="500.00"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Initial Debt ($)
            </label>
            <input
              type="number"
              step="0.5"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Delivery Address & District
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Hodan District, Maka Al Mukarama St, Near KM4"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </form>
    </Modal>
  );
};
