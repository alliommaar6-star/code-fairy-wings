import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildUssd,
  confirmPayment,
  fetchPortalOrder,
  money,
  PAYMENT_METHODS,
  startPayment,
  stepsFor,
  type PortalOrder,
} from "@/lib/portal-api";

type Method = "EVC" | "EDAHAB" | "JEEB";
type Mode = "advance" | "full";
type Stage = "methods" | "confirm" | "ussd" | "paid-question" | "submitted";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${className}`}>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  strong = false,
  accent = "",
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span
        className={`${strong ? "text-base font-extrabold" : "font-semibold"} ${accent || "text-slate-900"}`}
      >
        {value}
      </span>
    </div>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Xir"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function newClientKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cacheKey(token: string) {
  return `portal-cache:${token}`;
}

function readCache(token: string): PortalOrder | null {
  try {
    const raw = localStorage.getItem(cacheKey(token));
    return raw ? (JSON.parse(raw) as PortalOrder) : null;
  } catch {
    return null;
  }
}

export default function PortalApp({ token }: { token: string }) {
  const [order, setOrder] = useState<PortalOrder | null>(() => readCache(token));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [mode, setMode] = useState<Mode>("full");
  const [method, setMethod] = useState<Method | null>(null);
  const [amount, setAmount] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const clientKey = useRef(newClientKey());

  const load = useCallback(async () => {
    const result = await fetchPortalOrder(token);
    if ("error" in result) {
      setLoadError(result.error);
      return;
    }
    setLoadError(null);
    setOrder(result);
    try {
      localStorage.setItem(cacheKey(token), JSON.stringify(result));
    } catch {
      /* storage full or blocked — cache is optional */
    }
  }, [token]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 15000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const ussd = useMemo(() => (method ? buildUssd(method, amount) : ""), [method, amount]);
  const fullyPaid = !!order && order.remaining <= 0;
  const pending = order?.payments.find((p) => p.status === "customer_confirmed");

  const closeFlow = () => {
    if (stage === "ussd" || stage === "paid-question") {
      setExitOpen(true);
      return;
    }
    setStage(null);
  };

  const beginPayment = (nextMode: Mode) => {
    if (!order) return;
    const due = nextMode === "advance" ? order.advanceDue : order.fullDue;
    if (due <= 0) return;
    clientKey.current = newClientKey();
    setMode(nextMode);
    setMethod(null);
    setActionError(null);
    setStage("methods");
  };

  const chooseMethod = (m: Method) => {
    setMethod(m);
    setStage("confirm");
  };

  const confirmAndOpenUssd = async () => {
    if (!method || busy) return;
    setBusy(true);
    setActionError(null);
    const result = await startPayment({ token, mode, method, clientKey: clientKey.current });
    setBusy(false);
    if ("error" in result) {
      setActionError(
        result.error === "already_paid"
          ? "Lacagta oo dhan waa la bixiyay."
          : result.error === "rate_limited"
            ? "Fadlan sug daqiiqad kadibna isku day mar kale."
            : "Internet-ka ayaa cilad galay. Fadlan isku day mar kale.",
      );
      return;
    }
    setAmount(result.amount);
    setAttemptId(result.attemptId);
    setStage("ussd");
    const code = buildUssd(method, result.amount);
    try {
      window.location.href = `tel:${encodeURIComponent(code)}`;
    } catch {
      /* dialer not supported — the code is shown on screen */
    }
  };

  const submitConfirmation = async () => {
    if (!attemptId || busy) return;
    setBusy(true);
    setActionError(null);
    const result = await confirmPayment({ token, attemptId });
    setBusy(false);
    if ("error" in result) {
      setActionError("Lacag bixinta lama dhamaystirin. Fadlan isku day mar kale.");
      return;
    }
    setStage("submitted");
    void load();
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(ussd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (loadError === "link_closed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl">
            ✅
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">Alaabtaada waa lagu gaarsiiyay</h2>
          <p className="mt-2 text-sm text-slate-500">
            Link-gan wuu xirmay. Waad ku mahadsan tahay iibsashada Banadir Store.
          </p>
        </Card>
      </div>
    );
  }

  if (loadError && !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
            ⚠️
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            {loadError === "invalid_token"
              ? "Link-ga lacag bixinta ma shaqaynayo ama wuu dhacay"
              : loadError === "rate_limited"
                ? "Fadlan sug daqiiqad"
                : "Internet-ka ayaa cilad galay"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {loadError === "invalid_token"
              ? "Fadlan la xiriir Banadir Store si aad u hesho link cusub."
              : "Fadlan hubi internet-kaaga."}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-5 w-full rounded-xl bg-slate-900 py-3 font-bold text-white"
          >
            ISKU DAY MAR KALE
          </button>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 pb-28">
        <header className="bg-slate-900 px-4 pb-8 pt-6 text-white">
          <div className="mx-auto flex max-w-md items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-yellow-400">
              Banadir Store
            </p>
          </div>
        </header>
        <main className="mx-auto -mt-5 max-w-md space-y-4 px-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
            />
          ))}
        </main>
      </div>
    );
  }

  const currentStepIndex = Math.max(
    0,
    stepsFor(order.fulfillmentType).findIndex((s) => s.key === order.fulfillmentStatus),
  );
  const isCargo = order.fulfillmentType === "Cargo";

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <header className="bg-slate-900 px-4 pb-8 pt-6 text-white">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-yellow-400">
              Banadir Store
            </p>
            <h1 className="mt-1 text-xl font-extrabold">Lacag Bixin</h1>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-300">Dalabka</p>
            <p className="text-sm font-bold">{order.orderNo}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-5 max-w-md space-y-4 px-4">
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Haraaga Lacagta
          </p>
          <p
            className={`mt-1 text-4xl font-black ${fullyPaid ? "text-emerald-600" : "text-slate-900"}`}
          >
            {money(Math.max(order.remaining, 0))}
          </p>
          {fullyPaid ? (
            <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
              ✅ LACAGTA OO DHAN WAA LA BIXIYAY
            </p>
          ) : pending ? (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
              ⏳ Lacag bixinta waa la sugayaa ({money(pending.amount)})
            </p>
          ) : null}
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-extrabold text-slate-900">Faahfaahinta Dalabka</h2>
          <Row label="Lambarka Macmiilka" value={order.customer.phone} />
          <Row label="Magaca" value={order.customer.name} />
          <Row label="Degmada" value={order.customer.district || order.deliveryAddress || "-"} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-extrabold text-slate-900">Alaabta</h2>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl">
                      📦
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-extrabold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      Tirada: {item.quantity} · Qiimaha: {money(item.unitPrice)}
                    </p>
                  </div>
                  <p className="text-base font-extrabold text-slate-900">{money(item.total)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-dashed border-slate-200 pt-3">
            <Row label="Wadarta Alaabta" value={money(order.subtotal)} />
            <Row label="Dhimista" value={`- ${money(order.discount)}`} />
            <Row
              label="Gaarsiinta"
              value={
                order.deliveryFeePayer === "Business" ? "FREE DELIVERY" : money(order.deliveryFee)
              }
              accent={order.deliveryFeePayer === "Business" ? "text-emerald-600" : ""}
            />
            <div className="mt-2 border-t border-slate-200 pt-2">
              <Row label="Wadarta" value={money(order.total)} strong />
              <Row
                label="Lacagta Hore / La Bixiyay"
                value={money(order.paidAmount)}
                accent="text-emerald-600"
              />
              <Row
                label="Haraaga"
                value={money(Math.max(order.remaining, 0))}
                strong
                accent={fullyPaid ? "text-emerald-600" : "text-red-600"}
              />
            </div>
          </div>
        </Card>

        {!fullyPaid && (
          <Card>
            <h2 className="mb-3 text-sm font-extrabold text-slate-900">
              Dooro Habka Lacag Bixinta
            </h2>
            <div className="grid gap-3">
              {order.advanceDue > 0 && order.advanceDue < order.fullDue && (
                <button
                  type="button"
                  onClick={() => beginPayment("advance")}
                  className="rounded-2xl border-2 border-slate-900 px-4 py-4 text-left"
                >
                  <p className="text-sm font-extrabold text-slate-900">LACAGTA HORE</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {money(order.advanceDue)}
                  </p>
                </button>
              )}
              <button
                type="button"
                onClick={() => beginPayment("full")}
                className="rounded-2xl bg-slate-900 px-4 py-4 text-left text-white"
              >
                <p className="text-sm font-extrabold">BIXI LACAGTA OO DHAN</p>
                <p className="mt-1 text-2xl font-black text-yellow-400">{money(order.fullDue)}</p>
              </button>
            </div>
          </Card>
        )}

        <Card>
          <h2 className="mb-1 text-sm font-extrabold text-slate-900">Socodka Dalabka</h2>
          <p className="mb-3 text-xs font-bold text-slate-500">
            {isCargo ? "📦 Cargo — Gobolada" : "🛵 Delivery — Muqdisho (Darawal)"}
          </p>
          {isCargo && order.cargo && (
            <div className="mb-3 rounded-xl bg-slate-50 p-3 text-sm">
              {order.cargo.company && <Row label="Shirkadda Cargo" value={order.cargo.company} />}
              {order.cargo.region && <Row label="Gobolka" value={order.cargo.region} />}
            </div>
          )}
          <ol className="space-y-2">
            {stepsFor(order.fulfillmentType).map((step, index) => {
              const done = index <= currentStepIndex;
              return (
                <li key={step.key} className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                      done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {done ? "✓" : index + 1}
                  </span>
                  <span
                    className={`text-sm ${done ? "font-bold text-slate-900" : "text-slate-500"}`}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>

        {order.driver && (
          <Card>
            <h2 className="mb-2 text-sm font-extrabold text-slate-900">Darawalka</h2>
            <Row label="Magaca" value={order.driver.name} />
            <div className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-slate-500">Telefon</span>
              <a href={`tel:${order.driver.phone}`} className="font-bold text-slate-900 underline">
                {order.driver.phone}
              </a>
            </div>
          </Card>
        )}

        {order.payments.length > 0 && (
          <Card>
            <h2 className="mb-2 text-sm font-extrabold text-slate-900">Taariikhda Lacag Bixinta</h2>
            <div className="space-y-2">
              {order.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-bold text-slate-900">{money(payment.amount)}</p>
                    <p className="text-xs text-slate-500">
                      {payment.method} · {new Date(payment.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      payment.status === "verified"
                        ? "bg-emerald-50 text-emerald-700"
                        : payment.status === "rejected"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {payment.status === "verified"
                      ? "La xaqiijiyay"
                      : payment.status === "rejected"
                        ? "La diiday"
                        : "Waa la sugayaa"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {order.customerOrders.length > 1 && (
          <Card>
            <h2 className="mb-2 text-sm font-extrabold text-slate-900">DALABYADII HORE</h2>
            <div className="space-y-2">
              {order.customerOrders.map((entry) => (
                <div key={entry.orderNo} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-bold text-slate-900">{entry.orderNo}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{money(entry.total)}</p>
                    <p className="text-xs text-slate-500">Haraaga {money(entry.remaining)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>

      {!fullyPaid && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
          <button
            type="button"
            onClick={() =>
              beginPayment(
                order.advanceDue > 0 && order.advanceDue < order.fullDue ? "advance" : "full",
              )
            }
            className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-lg font-black text-white shadow-lg active:scale-[0.99]"
          >
            🔴 HADDA BIXI
          </button>
        </div>
      )}

      <Modal open={stage === "methods"} onClose={closeFlow} title="Dooro Habka Lacag Bixinta">
        <div className="space-y-3">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => chooseMethod(m.id)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-4 text-left font-extrabold text-slate-900 active:bg-slate-50"
            >
              {m.label}
              <span className="text-slate-400">›</span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={stage === "confirm"}
        onClose={() => setStage("methods")}
        title="Xaqiiji Lacag Bixinta"
      >
        <p className="text-center text-sm text-slate-500">MA RABTAA INAAD U DIRTO BANADIR STORE?</p>
        <p className="mt-2 text-center text-4xl font-black text-slate-900">
          {money(mode === "advance" ? order.advanceDue : order.fullDue)}
        </p>
        <p className="mt-1 text-center text-sm font-bold text-slate-500">
          {PAYMENT_METHODS.find((m) => m.id === method)?.label}
        </p>
        {actionError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-700">
            {actionError}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setStage("methods")}
            className="rounded-xl border border-slate-300 py-3 font-extrabold text-slate-700"
          >
            MAYA
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void confirmAndOpenUssd()}
            className="rounded-xl bg-emerald-600 py-3 font-extrabold text-white disabled:opacity-60"
          >
            {busy ? "..." : "HAA"}
          </button>
        </div>
      </Modal>

      <Modal open={stage === "ussd"} onClose={closeFlow} title="Koodhka Lacag Bixinta">
        <p className="text-sm text-slate-500">
          Haddii aan si toos ah loo furin, fadlan koodhka ku wac telefoonkaaga.
        </p>
        <div className="mt-3 rounded-2xl bg-slate-900 px-4 py-5 text-center">
          <p className="text-xl font-black tracking-wider text-yellow-400">{ussd}</p>
        </div>
        <p className="mt-2 text-center text-sm font-bold text-slate-900">
          Qiimaha: {money(amount)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void copyCode()}
            className="rounded-xl border border-slate-300 py-3 font-extrabold text-slate-700"
          >
            {copied ? "LA KOOBIYEEYAY" : "COPY"}
          </button>
          <a
            href={`tel:${encodeURIComponent(ussd)}`}
            className="flex items-center justify-center rounded-xl bg-slate-900 py-3 font-extrabold text-white"
          >
            WAC
          </a>
        </div>
        <button
          type="button"
          onClick={() => setStage("paid-question")}
          className="mt-3 w-full rounded-xl bg-emerald-600 py-3 font-extrabold text-white"
        >
          WAAN BIXIYAY
        </button>
      </Modal>

      <Modal open={stage === "paid-question"} onClose={closeFlow} title="MA BIXISAY LACAGTA?">
        <p className="text-sm text-slate-500">
          Haddii aad bixisay, Banadir Store ayaa xaqiijin doonta lacagta.
        </p>
        {actionError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {actionError}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setStage("ussd")}
            className="rounded-xl border border-slate-300 py-3 font-extrabold text-slate-700"
          >
            MAYA
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submitConfirmation()}
            className="rounded-xl bg-emerald-600 py-3 font-extrabold text-white disabled:opacity-60"
          >
            {busy ? "..." : "HAA"}
          </button>
        </div>
      </Modal>

      <Modal open={stage === "submitted"} onClose={() => setStage(null)} title="Mahadsanid!">
        <p className="text-sm text-slate-600">
          Lacag bixinta waa la sugayaa. Banadir Store ayaa xaqiijin doonta, kadibna haraagaaga ayaa
          la cusboonaysiin doonaa halkan.
        </p>
        <button
          type="button"
          onClick={() => setStage(null)}
          className="mt-5 w-full rounded-xl bg-slate-900 py-3 font-extrabold text-white"
        >
          WAAN FAHMAY
        </button>
      </Modal>

      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Ma hubtaa inaad ka baxdo lacag bixinta?"
      >
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setExitOpen(false)}
            className="rounded-xl border border-slate-300 py-3 font-extrabold text-slate-700"
          >
            KA NOQO
          </button>
          <button
            type="button"
            onClick={() => {
              setExitOpen(false);
              setStage(null);
            }}
            className="rounded-xl bg-red-600 py-3 font-extrabold text-white"
          >
            HAA, KA BAX
          </button>
        </div>
      </Modal>
    </div>
  );
}
