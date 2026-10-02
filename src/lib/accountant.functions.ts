import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20000) })).min(1).max(40),
  snapshot: z.string().max(400000),
});

export const askAccountant = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const { runAccountant } = await import("./accountant.server");
    try {
      const r = await runAccountant(data.messages, data.snapshot);
      return { text: r.text, actionsJson: JSON.stringify(r.actions), error: "" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/402|credit/i.test(msg)) return { text: "", actionsJson: "[]", error: "Credit-ka AI waa dhammaaday — fadlan ku dar credit." };
      if (/429|rate/i.test(msg)) return { text: "", actionsJson: "[]", error: "Codsiyo badan — sug daqiiqad kadib isku day." };
      return { text: "", actionsJson: "[]", error: "AI-ga lama gaarin: " + msg.slice(0, 200) };
    }
  });
