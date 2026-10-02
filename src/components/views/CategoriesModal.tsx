import React, { useState } from "react";
import { Plus, Edit2, Trash2, Check, X, Layers } from "lucide-react";
import { Modal } from "../common/Modal";
import { useStore } from "../../context/StoreContext";
import { ProductCategory } from "../../types";

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoriesModal: React.FC<CategoriesModalProps> = ({ isOpen, onClose }) => {
  const { categories, products, addCategory, updateCategory, deleteCategory, updateProduct } =
    useStore();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ProductCategory | null>(null);

  const productCount = (name: string) => products.filter((p) => p.category === name).length;

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addCategory(trimmed);
    setNewName("");
  };

  const startEdit = (cat: ProductCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleRename = (cat: ProductCategory) => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === cat.name) {
      setEditingId(null);
      return;
    }
    updateCategory(cat.id, { name: trimmed });
    // Propagate the new name to every product using the old category name
    products
      .filter((p) => p.category === cat.name)
      .forEach((p) => updateProduct(p.id, { category: trimmed }));
    setEditingId(null);
  };

  const handleDelete = (cat: ProductCategory) => {
    deleteCategory(cat.id);
    setConfirmDelete(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Categories">
      <div className="space-y-4">
        {/* Add new */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Magaca category-ga cusub..."
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
          {categories.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Category ma jiro — mid cusub ku dar.
            </div>
          )}
          {categories.map((cat) => {
            const count = productCount(cat.name);
            const isEditing = editingId === cat.id;
            return (
              <div key={cat.id} className="flex items-center gap-2 px-3.5 py-2.5 bg-white">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(cat);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleRename(cat)}
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
                      <div className="text-sm font-bold text-slate-800 truncate">{cat.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {count} alaab{count === 1 ? "" : "ood"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                      title="Beddel magaca"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(cat)}
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
                Digniin: {productCount(confirmDelete.name)} alaabood ayaa category-gan isticmaalaya
                — alaabtu ma tirtirmayso, laakiin category-gu wuu ka baxayaa liiska.
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
