import { supabase } from "@/integrations/supabase/client";

export type PortalItem = {
  name: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
};

export type PortalPayment = {
  id: string;
  amount: number;
  method: "EVC" | "EDAHAB" | "JEEB";
  status: "customer_confirmed" | "verified" | "rejected" | "cancelled";
  createdAt: string;
};

export type PortalOrder = {
  orderNo: string;
  createdAt: string;
  status: string;
  fulfillmentStatus: string;
  fulfillmentType?: "Delivery" | "Cargo" | "Pickup";
  cargo?: { company: string; region: string } | null;
  customer: { name: string; phone: string; district: string };
  deliveryAddress: string;
  items: PortalItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  deliveryFeePayer: "Customer" | "Business";
  total: number;
  advanceAmount: number;
  paidAmount: number;
  remaining: number;
  advanceDue: number;
  fullDue: number;
  driver: { name: string; phone: string } | null;
  payments: PortalPayment[];
  history: { status: string; at: string }[];
  customerOrders: {
    orderNo: string;
    createdAt: string;
    total: number;
    paid: number;
    remaining: number;
    status: string;
  }[];
};

export type PortalError = { error: string };

function isError(value: unknown): value is PortalError {
  return !!value && typeof value === "object" && "error" in (value as Record<string, unknown>);
}

export async function fetchPortalOrder(token: string): Promise<PortalOrder | PortalError> {
  const { data, error } = await supabase.rpc("portal_get_order", { p_token: token });
  if (error) return { error: "network" };
  if (isError(data)) return data;
  return data as unknown as PortalOrder;
}

export async function startPayment(args: {
  token: string;
  mode: "advance" | "full";
  method: "EVC" | "EDAHAB" | "JEEB";
  clientKey: string;
}): Promise<{ attemptId: string; amount: number } | PortalError> {
  const { data, error } = await supabase.rpc("portal_start_payment", {
    p_token: args.token,
    p_mode: args.mode,
    p_method: args.method,
    p_client_key: args.clientKey,
  });
  if (error) return { error: "network" };
  if (isError(data)) return data;
  const row = data as unknown as { attemptId: string; amount: number };
  return { attemptId: row.attemptId, amount: Number(row.amount) };
}

export async function confirmPayment(args: {
  token: string;
  attemptId: string;
  reference?: string;
}): Promise<{ status: string } | PortalError> {
  const { data, error } = await supabase.rpc("portal_confirm_payment", {
    p_token: args.token,
    p_attempt_id: args.attemptId,
    p_reference: args.reference ?? "",
  });
  if (error) return { error: "network" };
  if (isError(data)) return data;
  return data as unknown as { status: string };
}

export const PAYMENT_METHODS = [
  { id: "EVC" as const, label: "EVC PLUS", ussd: (amt: string) => `*712*613888125*${amt}#` },
  { id: "EDAHAB" as const, label: "E-DAHAB", ussd: (amt: string) => `*110*622888125*${amt}#` },
  { id: "JEEB" as const, label: "JEEB", ussd: (amt: string) => `*812*613888125*${amt}#` },
];

export function buildUssd(method: "EVC" | "EDAHAB" | "JEEB", amount: number): string {
  const amt = amount % 1 === 0 ? String(amount) : amount.toFixed(2);
  const entry = PAYMENT_METHODS.find((m) => m.id === method)!;
  return entry.ussd(amt);
}

export function money(value: number): string {
  return `$${Number(value || 0).toFixed(2)}`;
}

export const STATUS_STEPS: { key: string; label: string }[] = [
  { key: "CREATED", label: "Dalab La Sameeyay" },
  { key: "PAYMENT", label: "Lacag Bixin" },
  { key: "PREPARING", label: "Diyaarin" },
  { key: "READY", label: "Diyaar" },
  { key: "ASSIGNED", label: "Darawal Loo Qoondeeyay" },
  { key: "PICKED_UP", label: "La Qaatay" },
  { key: "ON_THE_WAY", label: "Wuu Soo Socdaa" },
  { key: "DELIVERED", label: "La Gaarsiiyay" },
  { key: "COMPLETED", label: "La Dhameystiray" },
];

/** Local Mogadishu delivery — driver brings the goods. */
export const DELIVERY_STEPS = STATUS_STEPS.filter((s) => s.key !== "COMPLETED");

/** Regional cargo — goods travel to another region with a cargo company. */
export const CARGO_STEPS: { key: string; label: string }[] = [
  { key: "CREATED", label: "Dalab La Sameeyay" },
  { key: "PAYMENT", label: "Lacag Bixin" },
  { key: "PREPARING", label: "Diyaarin" },
  { key: "READY", label: "Diyaar" },
  { key: "ASSIGNED", label: "Cargo-da Loo Dhiibay" },
  { key: "ON_THE_WAY", label: "Jidka Gobolka Ku Jira" },
  { key: "PICKED_UP", label: "Gobolka Waa Gaaray" },
  { key: "DELIVERED", label: "Macmiilku Helay" },
];

export function stepsFor(type?: string) {
  return type === "Cargo" ? CARGO_STEPS : DELIVERY_STEPS;
}
