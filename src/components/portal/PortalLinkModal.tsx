import { useEffect, useState } from "react";
import { CreditCard, Copy, Share2, ExternalLink, Check, X, Loader2 } from "lucide-react";
import type { Order } from "@/types";
import { autoPublishOrder, portalUrlFor, whatsappShareUrl } from "@/lib/portal-publish";

interface Props {
  order: Order;
  onClose: () => void;
}

/** Shown right after CREATE ORDER: generates the customer payment link and shares it. */
export default function PortalLinkModal({ order, onClose }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    void autoPublishOrder(order).then((res) => {
      if (!alive) return;
      if ("error" in res) setError(res.error);
      else setToken(res.token);
    });
    return () => {
      alive = false;
    };
  }, [order]);

  const url = token ? portalUrlFor(token) : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Banadir Store", text: `Dalabka ${order.orderNo}`, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    void handleCopy();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-lime-400 text-black flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">LACAG BIXIN</h3>
              <p className="text-xs text-slate-400">Linkiga lacag bixinta macmiilka</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Dalabka</span>
              <span className="font-semibold text-slate-900">{order.orderNo}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-slate-500">Macmiilka</span>
              <span className="font-semibold text-slate-900">{order.customerName}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-slate-500">Wadarta</span>
              <span className="font-semibold text-slate-900">${(order.total ?? 0).toFixed(2)}</span>
            </div>
          </div>

          {!token && !error && (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Linkiga waa la diyaarinayaa...
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">
              Linkiga lama sameyn karin. Fadlan hubi internet-ka oo ISKU DAY MAR KALE.
            </div>
          )}

          {token && (
            <>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-lime-300 bg-lime-50 py-3 text-sm font-bold text-lime-800"
              >
                <CreditCard className="w-4 h-4" /> Lacag Bixin
              </a>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "LA KOOBIYEEYAY" : "COPY"}
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-900 font-semibold text-sm"
                >
                  <Share2 className="w-4 h-4" /> SHARE
                </button>
                <a
                  href={whatsappShareUrl(order.customerPhone ?? "", order.orderNo, url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] text-white font-semibold text-sm"
                >
                  WHATSAPP
                </a>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-lime-400 text-black font-semibold text-sm"
                >
                  <ExternalLink className="w-4 h-4" /> OPEN
                </a>
              </div>
            </>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold"
          >
            XIR
          </button>
        </div>
      </div>
    </div>
  );
}
