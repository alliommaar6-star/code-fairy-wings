import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

function createRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  return {
    getRunId: () => runId,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
        headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      }
      const response = await fetch(input, { ...init, headers });
      runId ??= response.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim() || undefined;
      return response;
    },
  };
}

export async function generateProductDescription(input: {
  name: string;
  details?: string;
  category?: string;
  brand?: string;
}): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI ma diyaarsana — furan ma jirto.");

  const runIdFetch = createRunIdFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const facts = [
    `Magaca alaabta: ${input.name}`,
    input.category ? `Category: ${input.category}` : "",
    input.brand && input.brand !== "General" ? `Brand: ${input.brand}` : "",
    input.details ? `Faahfaahin kale: ${input.details}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system:
          "Waxaad tahay qoraa sharaxaad alaab oo u qoran dukaan e-commerce Soomaali ah. " +
          "Qor sharaxaad kooban, iibin leh, oo Soomaali saafi ah — 2 ilaa 4 weerood oo keliya. " +
          "Ha isticmaalin markdown, liis, ama cinwaan. Kaliya qoraal cad oo diyaar u ah in si toos ah loogu dhaco field-ka description. " +
          "Ha been sheegin tirooyin ama astaamaha aan la siin.",
    messages: [{ role: "user", content: facts }],
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  const text = (await result.text).trim();
  if (!text) throw new Error("AI-ma soo saarin sharaxaad — isku day mar kale.");
  return text;
}
