import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20000) })).min(1).max(40),
  snapshot: z.string().max(400000),
});

export const askStockAdvisor = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const { runInsights } = await import("./insights.server");
    try {
      return { text: await runInsights(data.messages, data.snapshot), error: "" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/402|credit/i.test(msg)) return { text: "", error: "AI credits have run out — please add credits." };
      if (/429|rate/i.test(msg)) return { text: "", error: "Too many requests — wait a minute and try again." };
      return { text: "", error: "Could not reach the AI: " + msg.slice(0, 200) };
    }
  });
