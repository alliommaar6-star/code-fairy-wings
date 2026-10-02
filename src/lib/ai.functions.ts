import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  name: z.string().trim().min(1, "Magaca alaabta ayaa loo baahan yahay"),
  details: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
});

export const generateDescription = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { generateProductDescription } = await import("./ai.server");
    const description = await generateProductDescription(data);
    return { description };
  });
