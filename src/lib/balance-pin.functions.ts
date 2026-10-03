import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const verifyBalancePin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value) => z.object({ pin: z.string().max(12) }).parse(value))
  .handler(async ({ data }) => {
    const configured = process.env["BALANCE_VIEW_PIN"];
    if (!configured) return false;
    const { timingSafeEqual } = await import("node:crypto");
    const a = Buffer.from(data.pin);
    const b = Buffer.from(configured);
    return a.length === b.length && timingSafeEqual(a, b);
  });