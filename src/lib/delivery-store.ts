import { useSyncExternalStore } from 'react';

export type DeliveryCompany = {
  id: string; name: string; phone: string; contactPerson: string; address: string;
  active: boolean; notes: string; createdAt: string; updatedAt: string;
};
export type LocationRate = { companyId: string; rate: number; active: boolean };
export type DeliveryLocation = {
  id: string; name: string; district: string; rates: LocationRate[];
  active: boolean; notes: string; createdAt: string; updatedAt: string;
};
export type DeliveryDriver = {
  id: string; name: string; phone: string; companyId: string;
  active: boolean; notes: string; createdAt: string; updatedAt: string;
};
type State = { companies: DeliveryCompany[]; locations: DeliveryLocation[]; drivers: DeliveryDriver[] };

const KEY = 'benadir_delivery_v1';
const now = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

function seed(): State {
  return { companies: [], locations: [], drivers: [] };
}
function _unusedSeed(): State {
  const t = now();
  const rik: DeliveryCompany = { id: 'dc-rikaab', name: 'Rikaab', phone: '', contactPerson: '', address: '', active: true, notes: '', createdAt: t, updatedAt: t };
  const sok: DeliveryCompany = { id: 'dc-sokow', name: 'Sokow', phone: '', contactPerson: '', address: '', active: true, notes: '', createdAt: t, updatedAt: t };
  return {
    companies: [rik, sok],
    locations: [{
      id: 'dl-hodan', name: 'Hodan', district: 'Hodan', active: true, notes: '', createdAt: t, updatedAt: t,
      rates: [{ companyId: rik.id, rate: 3, active: true }, { companyId: sok.id, rate: 4, active: true }],
    }],
    drivers: [],
  };
}

let state: State = seed();
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch { /* keep seed */ }
}
function set(next: State) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function useDelivery(): State {
  load();
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => state,
  );
}

export const deliveryActions = {
  saveCompany(c: Partial<DeliveryCompany> & { name: string }) {
    load();
    const t = now();
    if (c.id) set({ ...state, companies: state.companies.map((x) => (x.id === c.id ? { ...x, ...c, updatedAt: t } : x)) });
    else set({ ...state, companies: [...state.companies, { phone: '', contactPerson: '', address: '', notes: '', active: true, ...c, id: uid('dc'), createdAt: t, updatedAt: t }] });
  },
  deleteCompany(id: string) {
    load();
    set({
      companies: state.companies.filter((c) => c.id !== id),
      drivers: state.drivers.filter((d) => d.companyId !== id),
      locations: state.locations.map((l) => ({ ...l, rates: l.rates.filter((r) => r.companyId !== id) })),
    });
  },
  saveLocation(l: Partial<DeliveryLocation> & { name: string; district: string; rates: LocationRate[] }) {
    load();
    const t = now();
    if (l.id) set({ ...state, locations: state.locations.map((x) => (x.id === l.id ? { ...x, ...l, updatedAt: t } : x)) });
    else set({ ...state, locations: [...state.locations, { notes: '', active: true, ...l, id: uid('dl'), createdAt: t, updatedAt: t }] });
  },
  deleteLocation(id: string) { load(); set({ ...state, locations: state.locations.filter((l) => l.id !== id) }); },
  saveDriver(d: Partial<DeliveryDriver> & { name: string; phone: string; companyId: string }) {
    load();
    const t = now();
    if (d.id) set({ ...state, drivers: state.drivers.map((x) => (x.id === d.id ? { ...x, ...d, updatedAt: t } : x)) });
    else set({ ...state, drivers: [...state.drivers, { notes: '', active: true, ...d, id: uid('dd'), createdAt: t, updatedAt: t }] });
  },
  deleteDriver(id: string) { load(); set({ ...state, drivers: state.drivers.filter((d) => d.id !== id) }); },
};

/** Single rule: LOCATION + COMPANY = RATE (only active rates of active entries). */
export function rateFor(s: State, locationId: string, companyId: string): number | null {
  const loc = s.locations.find((l) => l.id === locationId && l.active);
  const r = loc?.rates.find((x) => x.companyId === companyId && x.active);
  return r ? r.rate : null;
}

export type DeliverySelection = {
  locationId: string; companyId: string; driverId: string; payer: 'Customer' | 'Business';
};

export const DELIVERY_STATUSES = ['Pending', 'Assigned', 'Picked Up', 'On The Way', 'Delivered', 'Failed', 'Cancelled'] as const;
