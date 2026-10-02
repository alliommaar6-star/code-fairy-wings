import { useSyncExternalStore } from 'react';

export type CargoRegionRate = { region: string; rate: number };
export type CargoCompany = { id: string; name: string; phone: string; address: string; rates: CargoRegionRate[]; createdAt: string };

const KEY = 'benadir_cargo_companies_v1';
let state: CargoCompany[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = JSON.parse(raw); } catch { /* ignore */ }
}
function set(next: CargoCompany[]) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function useCargoCompanies(): CargoCompany[] {
  load();
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state, () => state);
}

export const cargoActions = {
  save(c: Omit<CargoCompany, 'id' | 'createdAt'> & { id?: string }) {
    load();
    if (c.id) set(state.map((x) => (x.id === c.id ? { ...x, ...c } as CargoCompany : x)));
    else set([...state, { ...c, id: `cc-${Math.random().toString(36).slice(2, 9)}`, createdAt: new Date().toISOString() }]);
  },
  remove(id: string) { load(); set(state.filter((x) => x.id !== id)); },
};
