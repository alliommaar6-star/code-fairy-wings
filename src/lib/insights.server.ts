import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const RUN = "X-Lovable-AIG-Run-ID";
function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN)) headers.set(RUN, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN)?.trim() || undefined;
    return res;
  };
}

const SYSTEM = `You are the "Stock Advisor" for Benadir Store, a retail business in Somalia (currency USD).
The user may write in Somali or English; answer in the same language they used.
You receive a JSON snapshot with: products (stock, min level, cost, price), per-product sales for the last 30/90 days, daily sales totals for the last 60 days, and recent stock movements.
- Use ONLY numbers in the snapshot; never invent figures. If data is missing, say so.
- Identify trends: fast/slow movers, rising/falling demand, days of stock left (stock ÷ avg daily units sold over 30 days), dead stock, margin outliers.
- Recommend concrete stock decisions: what to reorder and how many units (aim for ~30 days of cover unless asked otherwise), what to discount or stop buying, what risks stockouts.
- Format in Markdown: short "## " title, Markdown tables for product lists, end with "### Recommended actions" as numbered bullets. Be concise.`;

export async function runInsights(messages: { role: "user" | "assistant"; content: string }[], snapshot: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch(),
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system: `${SYSTEM}\n\nSTORE SNAPSHOT:\n${snapshot}`,
    messages: messages.slice(-20),
    maxRetries: 0,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = (await result.text).trim();
  if (!text) throw new Error("The AI returned no answer — please try again.");
  return text;
}
