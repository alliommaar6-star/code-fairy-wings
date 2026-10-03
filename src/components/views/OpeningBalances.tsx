import { useState, type FormEvent } from "react";
import { Wallet, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/context/StoreContext";
import type { PaymentAccount } from "@/types";

type Entry = { kind: "Cash" | "Bank" | "EVC Plus" | "e-Dahab"; balance: string; bank: string; holder: string; number: string; phone: string };
const blank = (kind: Entry["kind"] = "Cash"): Entry => ({ kind, balance: "", bank: "", holder: "", number: "", phone: "" });

export function OpeningBalances() {
  const { initializeOpeningAccounts } = useStore();
  const [entries, setEntries] = useState<Entry[]>([blank()]);
  const [error, setError] = useState("");
  const update = (index: number, patch: Partial<Entry>) => setEntries(prev => prev.map((row, i) => i === index ? { ...row, ...patch } : row));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (entries.some(e => !Number.isFinite(Number(e.balance)) || Number(e.balance) < 0 || e.balance.trim() === "" || (e.kind === "Bank" && (!e.bank.trim() || !e.holder.trim() || !e.number.trim() || !e.phone.trim())) || ((e.kind === "EVC Plus" || e.kind === "e-Dahab") && !e.number.trim()))) {
      setError("Buuxi lacagta iyo xogta akoon kasta; lacagtu ma noqon karto mid taban.");
      return;
    }
    const accounts: Omit<PaymentAccount, "id">[] = entries.map(e => ({
      name: e.kind === "Bank" ? e.bank.trim() : e.kind,
      type: e.kind === "Bank" ? "Bank" : e.kind === "Cash" ? "Cash" : "Mobile Money",
      accountNumber: e.number.trim() || undefined,
      accountHolder: e.holder.trim() || undefined,
      telephone: e.phone.trim() || undefined,
      balance: Number(e.balance), currency: "USD", isActive: true, isDefault: e.kind === "Cash",
    }));
    initializeOpeningAccounts(accounts);
  };
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 p-4 sm:p-8">
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5 py-6">
      <div className="flex items-center gap-3"><Wallet className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold text-foreground">Lacagta bilowga</h1><p className="text-sm text-muted-foreground">Diiwaangeli inta aad hadda haysato iyo halka ay taallo.</p></div></div>
      {entries.map((e, i) => <div key={i} className="space-y-3 border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2"><label className="text-sm font-semibold text-foreground">Meesha lacagtu taallo
          <select aria-label={`Meesha lacagta ${i + 1}`} value={e.kind} onChange={ev => update(i, { ...blank(ev.target.value as Entry["kind"]), balance: e.balance })} className="mt-1 block w-full rounded border border-input bg-background p-2 text-foreground"><option>Cash</option><option>Bank</option><option>EVC Plus</option><option>e-Dahab</option></select>
        </label>{entries.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label="Ka saar" onClick={() => setEntries(prev => prev.filter((_, n) => n !== i))}><Trash2 /></Button>}</div>
        <label className="block text-sm text-foreground">Lacagta ($)<input required min="0" step="0.01" type="number" value={e.balance} onChange={ev => update(i, { balance: ev.target.value })} className="mt-1 block w-full rounded border border-input bg-background p-2" /></label>
        {e.kind === "Bank" && <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-foreground">Magaca Bank-ga<input required value={e.bank} onChange={ev => update(i, { bank: ev.target.value })} className="mt-1 block w-full rounded border border-input bg-background p-2" /></label><label className="text-sm text-foreground">Account name<input required value={e.holder} onChange={ev => update(i, { holder: ev.target.value })} className="mt-1 block w-full rounded border border-input bg-background p-2" /></label><label className="text-sm text-foreground">Account number<input required value={e.number} onChange={ev => update(i, { number: ev.target.value })} className="mt-1 block w-full rounded border border-input bg-background p-2" /></label><label className="text-sm text-foreground">Telephone number<input required type="tel" value={e.phone} onChange={ev => update(i, { phone: ev.target.value })} className="mt-1 block w-full rounded border border-input bg-background p-2" /></label></div>}
        {(e.kind === "EVC Plus" || e.kind === "e-Dahab") && <label className="block text-sm text-foreground">{e.kind} number<input required type="tel" value={e.number} onChange={ev => update(i, { number: ev.target.value })} className="mt-1 block w-full rounded border border-input bg-background p-2" /></label>}
      </div>)}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setEntries(prev => [...prev, blank()])}><Plus /> Meel kale ku dar</Button><Button type="submit">Kaydi lacagta bilowga</Button></div>
    </form>
  </div>;
}