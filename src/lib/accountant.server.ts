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

const SYSTEM = `You are "AI Accountant" — a senior Chartered Accountant (CPA/ACCA, IFRS for SMEs) and financial controller for Benadir Store, a retail & e-commerce business in Somalia (currency USD).

LANGUAGE: The user may write in Somali or English. You fully understand Somali. ALWAYS answer in professional English.

DATA: You receive a JSON snapshot of the company books. The books are fully automated double-entry: every sale, COGS, order advance, purchase, supplier payment, restock, opening stock, stock adjustment/damage/loss, sales return, income and expense posts its own journal entry. An "Opening" entry reconciles books to actual payment-account balances and stock value. The snapshot includes: trial balance, P&L, balance sheet, ratios, monthly trend, receivables, payables, customers/suppliers with balances, products & stock, recent sales, expenses and journal entries.

HOW YOU WORK:
- Think like an auditor: reconcile, test reasonableness, spot anomalies (negative margins, missing COGS, unusual expenses, overdue receivables, low stock, cash risk) and explain root causes.
- Use ONLY numbers from the snapshot; never invent figures. Show calculations when useful.
- Be ~98% autonomous. Ask a short clarifying question only if a critical fact (amount, date, account) is truly missing.
- Format every answer as a professional report in Markdown:
  - Start with a "## " title (e.g. "## Income Statement — Benadir Store"), then "As of <date>" line.
  - Use "### " section headings, Markdown tables for figures (right-aligned amounts as $1,234.56), bold totals.
  - End with "### Key Insights" and "### Recommendations" (concise bullets) when analysing.
- Be concise and precise; no filler.

ACTIONS: When the user asks you to record something (expense, income, adjusting/closing/accrual/depreciation/correcting journal entry) or you identify a needed correction, propose actions. Every action is approved by the user before it is saved. Put them at the very end, in ONE block exactly like:
\`\`\`actions
[{"type":"journal","date":"YYYY-MM-DD","memo":"...","lines":[{"account":"Expense: Rent","debit":100,"credit":0},{"account":"Cash & Bank","debit":0,"credit":100}]},
 {"type":"expense","title":"...","category":"Rent","amount":100,"date":"YYYY-MM-DD","account":"<payment account name>"},
 {"type":"income","title":"...","category":"Other","amount":50,"date":"YYYY-MM-DD","account":"<payment account name>"}]
\`\`\`
Rules: debits must equal credits. Use "expense"/"income" for ordinary cash expenses/income (they update the payment account balance); use "journal" only for other adjustments. Use account names from the trial balance or "Expense: <category>" / "Income: <category>". Omit the block when there is no action.`;

export async function runAccountant(messages: { role: "user" | "assistant"; content: string }[], snapshot: string) {
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
    system: `${SYSTEM}\n\nCOMPANY BOOKS SNAPSHOT (current):\n${snapshot}`,
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
  let actions: unknown[] = [];
  const m = text.match(/```actions\s*([\s\S]*?)```/);
  if (m) { try { const p = JSON.parse(m[1]); if (Array.isArray(p)) actions = p; } catch { /* ignore */ } }
  return { text: text.replace(/```actions[\s\S]*?```/, "").trim(), actions };
}
