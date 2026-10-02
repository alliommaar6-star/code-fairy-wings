import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { useStore } from "../../context/StoreContext";
import { Sale } from "../../types";
import { RotateCcw } from "lucide-react";

interface SalesReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale?: Sale | null;
}

export const SalesReturnModal: React.FC<SalesReturnModalProps> = ({ isOpen, onClose, sale }) => {
  const { sales, processReturn, currentUser } = useStore();

  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState<string>(
    sale?.invoiceNo || sales[0]?.invoiceNo || "",
  );
  const [returnReason, setReturnReason] = useState<string>("Customer changed mind");
  const [restock, setRestock] = useState<boolean>(true);

  const activeSale = sales.find((s) => s.invoiceNo === selectedInvoiceNo);

  const [selectedItemIds, setSelectedItemIds] = useState<{ [id: string]: number }>({});

  React.useEffect(() => {
    if (activeSale) {
      const initial: { [id: string]: number } = {};
      activeSale.items.forEach((it) => {
        initial[it.productId] = it.quantity;
      });
      setSelectedItemIds(initial);
    }
  }, [activeSale]);

  if (!activeSale) return null;

  const totalRefund = activeSale.items.reduce((sum, item) => {
    const qty = selectedItemIds[item.productId] || 0;
    return sum + item.sellingPrice * qty;
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalRefund <= 0) {
      alert("Please select items to return.");
      return;
    }

    const returnItems = activeSale.items
      .filter((it) => (selectedItemIds[it.productId] || 0) > 0)
      .map((it) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: selectedItemIds[it.productId] || 1,
        refundAmount: it.sellingPrice * (selectedItemIds[it.productId] || 1),
        restock,
      }));

    processReturn({
      originalInvoiceNo: activeSale.invoiceNo,
      date: new Date().toISOString().split("T")[0],
      customerName: activeSale.customerName,
      items: returnItems,
      totalRefund,
      reason: returnReason,
      processedBy: currentUser.name,
    });

    alert(`Return processed successfully! Total refunded: $${totalRefund.toFixed(2)}`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sales Return"
      subtitle={`Processing return for sale ${activeSale.invoiceNo}`}
      maxWidth="lg"
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
            form="form-sales-return"
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Process Return (${totalRefund.toFixed(2)})
          </button>
        </>
      }
    >
      <form id="form-sales-return" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Select Sale Invoice
            </label>
            <select
              value={selectedInvoiceNo}
              onChange={(e) => setSelectedInvoiceNo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-slate-900"
            >
              {sales.map((s) => (
                <option key={s.id} value={s.invoiceNo}>
                  {s.invoiceNo} — {s.customerName} (${s.grandTotal.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Return Reason
            </label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900"
            >
              <option value="Customer changed mind">Customer changed mind</option>
              <option value="Defective / Damaged product">Defective / Damaged product</option>
              <option value="Wrong item delivered">Wrong item delivered</option>
              <option value="Expired date">Expired date</option>
              <option value="Pricing error">Pricing error</option>
            </select>
          </div>
        </div>

        {/* Items to return */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Select Items to Return
          </label>
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
            {activeSale.items.map((item) => (
              <div
                key={item.productId}
                className="p-3 flex items-center justify-between text-xs hover:bg-slate-50"
              >
                <div>
                  <div className="font-semibold text-slate-900">{item.productName}</div>
                  <div className="text-slate-500 text-[11px]">
                    Original Qty: {item.quantity} • Unit Price: ${item.sellingPrice.toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Return Qty:</span>
                  <input
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={selectedItemIds[item.productId] ?? item.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setSelectedItemIds((prev) => ({
                        ...prev,
                        [item.productId]: Math.min(item.quantity, Math.max(0, val)),
                      }));
                    }}
                    className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center"
                  />
                  <span className="font-bold text-slate-900 w-16 text-right">
                    $
                    {(
                      item.sellingPrice * (selectedItemIds[item.productId] ?? item.quantity)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Restock options */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <span className="text-xs font-bold text-slate-800">Return to Inventory (Restock)</span>
            <p className="text-[10px] text-slate-500">
              Automatically increment product stock in database
            </p>
          </div>
          <input
            type="checkbox"
            checked={restock}
            onChange={(e) => setRestock(e.target.checked)}
            className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
          />
        </div>
      </form>
    </Modal>
  );
};
