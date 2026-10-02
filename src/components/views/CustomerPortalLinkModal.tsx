import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Share2,
  X,
  Sparkles,
  MapPin,
  Phone,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { Order } from '../../types';
import { useStore } from '../../context/StoreContext';
import { buildWhatsAppCustomerMessage } from '../../utils/portalUrl';

interface CustomerPortalLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onOpenPortalModal?: (order: Order) => void;
}

export const CustomerPortalLinkModal: React.FC<CustomerPortalLinkModalProps> = ({
  isOpen,
  onClose,
  order,
  onOpenPortalModal,
}) => {
  const { generateCustomerPortalUrl } = useStore();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const portalUrl = generateCustomerPortalUrl(order);
  const remaining = Math.max(0, order.total - order.paidAmount);
  const whatsappUrl = buildWhatsAppCustomerMessage(order, portalUrl);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenDirect = () => {
    if (onOpenPortalModal) {
      onOpenPortalModal(order);
      onClose();
    } else {
      window.open(portalUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        id="portal-link-dialog"
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col my-6"
      >
        {/* Banner Header */}
        <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-lime-400/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-lime-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-lime-400/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-lime-400">
                    Dalabka Waa La Diyaariyay
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                    <ShieldCheck className="w-3 h-3 text-lime-400" />
                    Link Toos ah oo Shaqaynaya
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white mt-0.5">
                  Xiriirka Bogga Macmiilka
                </h2>
              </div>
            </div>

            <button
              id="close-link-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Xir"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-3 relative z-10 leading-relaxed">
            Link-gan tooska ah waxa uu macmiilka u furayaa shaashadda bixinta degdegga ah (EVC Plus, E-Dahab, Jeeb), socoshada gaarsiinta ee tooska ah, iyo suuqa dib looga dalban karo alaabta.
          </p>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {/* Order Quick Summary Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Lambarka Dalabka
                </span>
                <p className="text-base font-black text-slate-900 font-mono">
                  {order.orderNo}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Wadarta Guud
                </span>
                <p className="text-base font-black text-slate-900">
                  ${order.total.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{order.customerName} ({order.customerPhone || 'Lama hayo'})</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 justify-end">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{order.deliveryDistrict || order.deliveryAddress || 'Muqdisho'}</span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Hormaris: <strong className="text-slate-700">${order.paidAmount.toFixed(2)}</strong>
              </span>
              <span className="font-semibold text-rose-600">
                Hadhaa: ${remaining.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Secure Portal Link Display */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Customer Portal Link (Toos & Shaqaynaya)
            </label>
            <div className="flex items-center gap-2 p-2 rounded-2xl bg-slate-100 border border-slate-200 group">
              <input
                type="text"
                readOnly
                value={portalUrl}
                className="bg-transparent text-xs font-mono text-slate-800 flex-1 px-2.5 py-1.5 outline-none select-all font-medium"
              />
              <button
                id="btn-copy-portal-link"
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Waa La Koobiyeeyay!' : 'Koobiyee (Copy)'}</span>
              </button>
            </div>
          </div>

          {/* Primary Action Buttons: Copy / Share / Open Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <a
              id="btn-share-whatsapp-portal"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition shadow-md shadow-emerald-500/15"
            >
              <Share2 className="w-4 h-4" />
              <span>La Wadaag WhatsApp</span>
            </a>

            <button
              id="btn-open-portal-direct"
              onClick={handleOpenDirect}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-md shadow-slate-900/15"
            >
              <Eye className="w-4 h-4 text-lime-400" />
              <span>Fur Bogga Macmiilka</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Secondary Dismiss */}
          <button
            id="btn-finish-portal-link"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold transition text-center"
          >
            Waad Mahadsan tahay (Done)
          </button>
        </div>
      </div>
    </div>
  );
};
