import React, { useState, useEffect } from "react";
import { Building2, Phone, Mail, MapPin, FileText, AlertTriangle, User } from "lucide-react";
import { Modal } from "../common/Modal";
import { Supplier } from "../../types";
import { useStore } from "../../context/StoreContext";

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierToEdit?: Supplier | null;
  onSaved?: (supplier: Supplier) => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  supplierToEdit,
  onSaved,
}) => {
  const { addSupplier, updateSupplier, checkDuplicateSupplier } = useStore();

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (supplierToEdit) {
      setName(supplierToEdit.name || "");
      setCompany(supplierToEdit.company || "");
      setContactPerson(supplierToEdit.contactPerson || "");
      setPhone(supplierToEdit.phone || "");
      setEmail(supplierToEdit.email || "");
      setAddress(supplierToEdit.address || "");
      setNotes(supplierToEdit.notes || "");
    } else {
      setName("");
      setCompany("");
      setContactPerson("");
      setPhone("+252 61 ");
      setEmail("");
      setAddress("");
      setNotes("");
    }
    setErrorMsg("");
  }, [supplierToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Supplier name is required.");
      return;
    }

    if (!supplierToEdit) {
      // Check duplicate
      const duplicate = checkDuplicateSupplier(name.trim(), phone.trim(), company.trim());
      if (duplicate) {
        setErrorMsg(
          `A supplier named "${duplicate.name}" (${duplicate.phone}) is already registered.`,
        );
        return;
      }

      const created = addSupplier({
        name: name.trim(),
        company: company.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || "+252 61 000 0000",
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        status: "active",
      });

      if (onSaved) onSaved(created);
      onClose();
    } else {
      updateSupplier(supplierToEdit.id, {
        name: name.trim(),
        company: company.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (onSaved) {
        onSaved({
          ...supplierToEdit,
          name: name.trim(),
          company: company.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          notes: notes.trim(),
        });
      }
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplierToEdit ? "Edit Supplier Profile" : "Register New Supplier"}
      subtitle="Maintain vendor records, accounts payable tracking, and purchase order history."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Supplier / Vendor Display Name *
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Al-Khaleej Wholesale Ltd"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Company / Corporate Name
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Al-Khaleej Trading Group"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Contact Representative
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Sheikh Abdirahman"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Phone Number *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+252 61 222 9900"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sales@supplier.so"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Warehouse / Store Location Address
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Bakaara Market, Wholesale Block 4, Mogadishu"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Terms / Supply Categories Memo
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Dry foodstuff importer, 30-day net payment credit terms"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            {supplierToEdit ? "Save Changes" : "Register Supplier"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
