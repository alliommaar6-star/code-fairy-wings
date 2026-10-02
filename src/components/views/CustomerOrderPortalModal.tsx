import React from "react";
import { Order } from "../../types";
import { CustomerPortalView } from "./CustomerPortalView";

interface CustomerOrderPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onConvertSale?: (orderId: string) => void;
}

export const CustomerOrderPortalModal: React.FC<CustomerOrderPortalModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  if (!isOpen || !order) return null;

  return (
    <div
      id="customer-order-portal-modal-wrapper"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-xl max-h-[95vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-800">
        <CustomerPortalView order={order} isStandalone={false} onClose={onClose} />
      </div>
    </div>
  );
};
