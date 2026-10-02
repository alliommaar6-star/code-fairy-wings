import { supabase } from "@/integrations/supabase/client";
import type { Order } from "@/types";

export type ServerOrder = {
  id: string;
  order_no: string;
  token: string;
  token_active: boolean;
  paid_amount: number;
  total: number;
  status: string;
  fulfillment_status: string;
  last_accessed_at: string | null;
};

export type ServerAttempt = {
  id: string;
  amount: number;
  method: string;
  status: string;
  reference: string | null;
  created_at: string;
};

/** Public, login-free address of the published store (used for customer links). */
const PUBLIC_BASE = "https://system-mirror-forge.lovable.app";

/**
 * Customer links must never point at the editor/preview host, because that one
 * asks for a Lovable login. When the admin app runs inside a preview we fall
 * back to the public published address.
 */
export function portalUrlFor(token: string): string {
  if (typeof window === "undefined") return `${PUBLIC_BASE}/p/${token}`;
  const host = window.location.hostname;
  const isPreview =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.includes("id-preview") ||
    host.includes("lovableproject.com") ||
    host.includes("lovable.dev") ||
    host.endsWith("-dev.lovable.app");
  const base = isPreview ? PUBLIC_BASE : window.location.origin;
  return `${base}/p/${token}`;
}

/**
 * Publishes an order to the customer portal without requiring a staff login.
 * Used automatically when the admin presses CREATE ORDER.
 */
export async function autoPublishOrder(order: Order): Promise<{ token: string } | { error: string }> {
  const payload = {
    order_no: order.orderNo,
    phone: (order.customerPhone || "").trim(),
    name: order.customerName || "",
    district: order.deliveryDistrict || order.deliveryZone || "",
    subtotal: order.subtotal ?? 0,
    discount: order.discount ?? 0,
    delivery_fee: order.deliveryFee ?? 0,
    delivery_fee_payer: order.deliveryFeePayer === "Business" ? "Business" : "Customer",
    advance_amount: order.advanceAmount ?? order.paidAmount ?? 0,
    delivery_address: order.deliveryAddress || order.deliveryDistrict || "",
    driver_name: order.driverName ?? "",
    driver_phone: order.driverPhone ?? "",
    fulfillment_type: order.fulfillmentType || "Delivery",
    cargo_company: order.cargoCompany ?? "",
    cargo_region: (order as any).cargoRegion || (order as any).cargoDestination || "",
    items: (order.items ?? []).map((item) => ({
      product_name: item.productName,
      image_url: item.imageUrl ?? "",
      quantity: item.quantity,
      unit_price: item.sellingPrice,
      discount: item.discount ?? 0,
      line_total: item.total,
    })),
  };

  const { data, error } = await supabase.rpc("portal_publish_order", { p_payload: payload });
  if (error) return { error: error.message };
  const result = data as { token?: string; error?: string } | null;
  if (!result?.token) return { error: result?.error ?? "unknown" };
  return { token: result.token };
}

/** Builds the wa.me link used to send the portal to the customer on WhatsApp. */
export function whatsappShareUrl(phone: string, orderNo: string, url: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  const normalized = digits.startsWith("252") ? digits : digits.replace(/^0+/, "").replace(/^/, "252");
  const text = `Salaan, waa Banadir Store.\nDalabkaaga: ${orderNo}\nHalkan ka bixi lacagta:\n${url}`;
  const base = digits.length >= 7 ? `https://wa.me/${normalized}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

export async function getStaffSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function staffSignIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error?.message ?? null;
}

export async function staffSignUp(email: string, password: string) {
  const { error } = await supabase.auth.signUp({ email, password });
  return error?.message ?? null;
}

export async function loadServerOrder(orderNo: string): Promise<ServerOrder | null> {
  const { data } = await supabase
    .from("portal_orders")
    .select("id, order_no, token, token_active, paid_amount, total, status, fulfillment_status, last_accessed_at")
    .eq("order_no", orderNo)
    .maybeSingle();
  return (data as ServerOrder | null) ?? null;
}

export async function loadAttempts(orderId: string): Promise<ServerAttempt[]> {
  const { data } = await supabase
    .from("payment_attempts")
    .select("id, amount, method, status, reference, created_at")
    .eq("order_id", orderId)
    .neq("status", "pending")
    .order("created_at", { ascending: false });
  return (data as ServerAttempt[] | null) ?? [];
}

/** Creates or updates the server copy of an admin order and returns its permanent portal link. */
export async function publishOrder(order: Order): Promise<{ order: ServerOrder } | { error: string }> {
  const phone = (order.customerPhone || "").trim() || `no-phone-${order.customerId}`;

  const { data: customer, error: customerError } = await supabase
    .from("portal_customers")
    .upsert(
      {
        phone,
        name: order.customerName || "",
        district: order.deliveryDistrict || order.deliveryZone || "",
      },
      { onConflict: "phone" },
    )
    .select("id")
    .single();
  if (customerError || !customer) return { error: customerError?.message ?? "customer" };

  const payload = {
    order_no: order.orderNo,
    customer_id: customer.id as string,
    subtotal: order.subtotal ?? 0,
    discount: order.discount ?? 0,
    delivery_fee: order.deliveryFee ?? 0,
    delivery_fee_payer: order.deliveryFeePayer === "Business" ? "Business" : "Customer",
    advance_amount: order.advanceAmount ?? 0,
    delivery_address: order.deliveryAddress || order.deliveryDistrict || "",
    driver_name: order.driverName ?? null,
    driver_phone: order.driverPhone ?? null,
  };

  const { data: saved, error: orderError } = await supabase
    .from("portal_orders")
    .upsert(payload, { onConflict: "order_no" })
    .select("id, order_no, token, token_active, paid_amount, total, status, fulfillment_status, last_accessed_at")
    .single();
  if (orderError || !saved) return { error: orderError?.message ?? "order" };

  const serverOrder = saved as ServerOrder;

  await supabase.from("portal_order_items").delete().eq("order_id", serverOrder.id);
  if (order.items?.length) {
    await supabase.from("portal_order_items").insert(
      order.items.map((item) => ({
        order_id: serverOrder.id,
        product_name: item.productName,
        image_url: item.imageUrl ?? null,
        quantity: item.quantity,
        unit_price: item.sellingPrice,
        discount: item.discount ?? 0,
        line_total: item.total,
      })),
    );
  }

  return { order: serverOrder };
}

export async function verifyAttempt(attemptId: string) {
  const { data, error } = await supabase.rpc("admin_verify_payment", { p_attempt_id: attemptId });
  return { data, error: error?.message ?? null };
}

export async function rejectAttempt(attemptId: string, reason: string) {
  const { data, error } = await supabase.rpc("admin_reject_payment", {
    p_attempt_id: attemptId,
    p_reason: reason,
  });
  return { data, error: error?.message ?? null };
}

export async function regenerateToken(orderId: string) {
  const { data, error } = await supabase.rpc("admin_regenerate_token", { p_order_id: orderId });
  return { data: data as { token?: string } | null, error: error?.message ?? null };
}

export async function setOrderStatus(orderId: string, status: string, driverName?: string, driverPhone?: string) {
  const { error } = await supabase.rpc("admin_set_order_status", {
    p_order_id: orderId,
    p_status: status,
    p_driver_name: driverName ?? undefined,
    p_driver_phone: driverPhone ?? undefined,
  });
  return error?.message ?? null;
}

export async function completeOrder(orderId: string) {
  const { data, error } = await supabase.rpc("admin_complete_order", { p_order_id: orderId });
  return { data, error: error?.message ?? null };
}
