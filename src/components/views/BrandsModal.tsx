import React, { useState } from "react";
import { Plus, Edit2, Trash2, Check, X, Tag } from "lucide-react";
import { Modal } from "../common/Modal";
import { useStore } from "../../context/StoreContext";
import { ProductBrand } from "../../types";

interface BrandsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrandsModal: React.FC<BrandsModalProps> = ({ isOpen, onClose }) => {
  const { brands, products, addBrand, updateBrand, deleteBrand, updateProduct } = useStore();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ProductBrand | null>(null);

  const productCount = (name: string) =>
    products.filter((p) => (p.brand || "General") === name).length;

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addBrand(trimmed);
    setNewName("");
  };

  const startEdit = (brand: ProductBrand) => {
    setEditingId(brand.id);
    setEditName(brand.name);
  };

  const handleRename = (brand: ProductBrand) => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === brand.name) {
      setEditingId(null);
      return;
    }
    updateBrand(brand.id, { name: trimmed });
    // Propagate the new name to every product using the old brand name
    products
      .filter((p) => (p.brand || "General") === brand.name)
      .forEach((p) => updateProduct(p.id, { brand: trimmed }));
    setEditingId(null);
  };

  const handleDelete = (brand: ProductBrand) => {
    deleteBrand(brand.id);
    setConfirmDelete(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Brands">
      <div className="space-y-4">
        {/* Add new */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Magaca brand-ka cusub..."
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-slate-900"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-emerald-400 stroke-[3]" />
            Ku Dar
          </button>
        </div>

        {/* List */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
          {brands.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Brand ma jiro — mid cusub ku dar.
            </div>
          )}
          {brands.map((brand) => {
            const count = productCount(brand.name);
            const isEditing = editingId === brand.id;
            return (
              <div key={brand.id} className="flex items-center gap-2 px-3.5 py-2.5 bg-white">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(brand);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleRename(brand)}
                      className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      title="Keydi"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
                      title="Jooji"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate">{brand.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {count} alaab{count === 1 ? "" : "ood"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(brand)}
                      className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                      title="Beddel magaca"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(brand)}
                      className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                      title="Tirtir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
            <p className="text-sm font-bold text-rose-700">
              Ma hubtaa inaad tirtirto "{confirmDelete.name}"?
            </p>
            {productCount(confirmDelete.name) > 0 && (
              <p className="text-xs text-rose-600">
                Digniin: {productCount(confirmDelete.name)} alaabood ayaa brand-kan isticmaalaya —
                alaabtu ma tirtirmayso, laakiin brand-ku wuu ka baxayaa liiska.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
              >
                HAA, TIRTIR
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl"
              >
                MAYA
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
