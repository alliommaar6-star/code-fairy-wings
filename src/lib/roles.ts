import { createContext, useContext } from "react";
import type { NavSection } from "@/components/layout/Sidebar";

export type StaffRole = "owner" | "admin" | "cashier" | "inventory";

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Owner",
  admin: "Administrator",
  cashier: "Cashier",
  inventory: "Inventory Manager",
};

/** Sections each role may open. `null` = everything. */
const ACCESS: Record<StaffRole, NavSection[] | null> = {
  owner: null,
  admin: null,
  cashier: ["dashboard", "orders", "sales", "returns", "pos", "customers", "payments", "delivery", "drivers", "tracking"],
  inventory: ["dashboard", "products", "inventory", "purchases", "suppliers", "cargo", "tracking", "insights"],
};

export function normalizeRole(r: string | null | undefined): StaffRole {
  const v = (r || "").toLowerCase();
  return v === "owner" || v === "admin" || v === "cashier" || v === "inventory" ? v : "admin";
}

export function canAccess(role: StaffRole, section: NavSection): boolean {
  const list = ACCESS[role];
  return list === null || list.includes(section);
}

export const ROLE_CACHE_KEY = "benadir__staff_role"; // double underscore: never cloud-synced

export const StaffRoleContext = createContext<StaffRole>("admin");
export const useStaffRole = () => useContext(StaffRoleContext);
