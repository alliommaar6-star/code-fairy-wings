import React from "react";
import { Printer, CheckCircle2, Download, Copy, Check } from "lucide-react";
import { Sale } from "../../types";
import { useStore } from "../../context/StoreContext";
import { Modal } from "./Modal";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onNewSale?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, sale, onNewSale }) => {
  const { settings } = useStore();
  const [copied, setCopied] = React.useState(false);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyInvoiceNo = () => {
    navigator.clipboard.writeText(sale.invoiceNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sale Invoice & Receipt"
      subtitle={`Reference: ${sale.invoiceNo}`}
      maxWidth="md"
      footer={
        <div className="w-full flex items-center justify-between">
          {onNewSale && (
            <button
              onClick={() => {
                onClose();
                onNewSale();
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              + Create Another Sale
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
            >
              Close
            </button>
            <button
              id="btn-print-receipt"
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </button>
          </div>
        </div>
      }
    >
      {/* Printable Area */}
      <div
        id="printable-receipt"
        className="bg-white border border-dashed border-slate-300 rounded-xl p-5 font-mono text-xs text-slate-800 leading-relaxed shadow-xs"
      >
        {/* Receipt Header */}
        <div className="text-center pb-4 border-b border-dashed border-slate-300 space-y-1">
          <div className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
            {settings.storeName}
          </div>
          <div className="text-[11px] text-slate-500 whitespace-pre-line">
            {settings.storeAddress}
          </div>
          <div className="text-[11px] text-slate-500 font-sans">Tel: {settings.storePhone}</div>
          <div className="inline-block bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded mt-1 font-sans">
            COMMERCIAL POS INVOICE
          </div>
        </div>

        {/* Invoice Meta */}
        <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Invoice No:</span>
            <span className="font-bold text-slate-900 flex items-center gap-1">
              {sale.invoiceNo}
              <button
                onClick={handleCopyInvoiceNo}
                className="text-slate-400 hover:text-slate-700"
                title="Copy invoice #"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Date & Time:</span>
            <span className="text-slate-700 font-medium">
              {sale.date} • {sale.time}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Customer:</span>
            <span className="text-slate-900 font-semibold">{sale.customerName}</span>
          </div>
          {sale.customerPhone && (
            <div className="flex justify-between">
              <span className="text-slate-500">Phone:</span>
              <span className="text-slate-700">{sale.customerPhone}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Fulfillment:</span>
            <span className="text-slate-700 font-medium">
              {sale.fulfillmentType} {sale.driverName ? `(${sale.driverName})` : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Payment:</span>
            <span className="text-slate-900 font-bold uppercase">{sale.paymentMethod}</span>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-3 border-b border-dashed border-slate-300">
          <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-slate-400 pb-1.5 border-b border-slate-200">
            <div className="col-span-6">Item</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">Total</div>
          </div>

          <div className="divide-y divide-slate-100 py-1 space-y-1">
            {sale.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 text-[11px] pt-1.5 items-center">
                <div className="col-span-6 font-medium text-slate-900 truncate">
                  {item.productName}
                </div>
                <div className="col-span-2 text-center text-slate-600 font-mono">
                  {item.quantity}
                </div>
                <div className="col-span-2 text-right text-slate-600">
                  ${item.sellingPrice.toFixed(2)}
                </div>
                <div className="col-span-2 text-right font-bold text-slate-900">
                  ${item.total.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calculation Summary */}
        <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span>${sale.subtotal.toFixed(2)}</span>
          </div>

          {sale.discount > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>Discount:</span>
              <span>-${sale.discount.toFixed(2)}</span>
            </div>
          )}

          {sale.deliveryFee > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Delivery Fee:</span>
              <span>+${sale.deliveryFee.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-200">
            <span>Grand Total:</span>
            <span>${sale.grandTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-emerald-700 font-semibold pt-0.5">
            <span>Amount Paid:</span>
            <span>${sale.amountPaid.toFixed(2)}</span>
          </div>

          {sale.remainingBalance > 0 && (
            <div className="flex justify-between text-rose-700 font-bold bg-rose-50 px-2 py-1 rounded">
              <span>Balance Due (Debt):</span>
              <span>${sale.remainingBalance.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Barcode representation */}
        <div className="pt-4 text-center space-y-1 font-sans">
          <div className="tracking-[0.25em] font-mono text-slate-400 text-xs uppercase font-bold">
            ||| | ||||| || |||| ||| |||||
          </div>
          <div className="text-[10px] text-slate-400">{sale.invoiceNo}</div>
          <div className="text-[10px] text-slate-500 whitespace-pre-line mt-2 italic">
            {settings.receiptFooter}
          </div>
        </div>
      </div>
    </Modal>
  );
};
