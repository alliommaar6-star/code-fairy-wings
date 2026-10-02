import { useSyncExternalStore } from 'react';

export type TrackStage = 'pending' | 'picked' | 'on_way' | 'delivered' | 'failed';
export const STAGES: { id: TrackStage; label: string }[] = [
  { id: 'pending', label: 'Sugaya' },
  { id: 'picked', label: 'La Qaaday' },
  { id: 'on_way', label: 'Jidka Ku Jira' },
  { id: 'delivered', label: 'Macmiilku Helay' },
  { id: 'failed', label: 'Fashilmay' },
];

export type TrackRecord = {
  stage: TrackStage;
  pickedAt?: string;
  deliveredAt?: string;
  cashCollectedAt?: string;
  cashCollectedAmount?: number;
  debtDueDate?: string; // YYYY-MM-DD
  lastDebtReminder?: string; // YYYY-MM-DD
  note?: string;
  updatedAt: string;
};

const KEY = 'benadir_tracking_v1';
let state: Record<string, TrackRecord> = {};
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = JSON.parse(raw); } catch { /* ignore */ }
  window.addEventListener('benadir-remote-update', () => {
    try { const raw = localStorage.getItem(KEY); state = raw ? JSON.parse(raw) : {}; listeners.forEach((l) => l()); } catch { /* ignore */ }
  });
}
function set(next: Record<string, TrackRecord>) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function useTracking() {
  load();
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state, () => state);
}

export function getTrack(id: string): TrackRecord {
  load();
  return state[id] ?? { stage: 'pending', updatedAt: '' };
}

export function updateTrack(id: string, patch: Partial<TrackRecord>) {
  load();
  const now = new Date().toISOString();
  const cur = getTrack(id);
  const next: TrackRecord = { ...cur, ...patch, updatedAt: now };
  if (patch.stage === 'picked' && !cur.pickedAt) next.pickedAt = now;
  if (patch.stage === 'delivered' && !cur.deliveredAt) next.deliveredAt = now;
  if (patch.stage && patch.stage !== 'delivered') { next.deliveredAt = patch.stage === 'failed' ? undefined : next.deliveredAt; }
  set({ ...state, [id]: next });
}

export const HOUR = 60 * 60 * 1000;
export const todayStr = () => new Date().toISOString().slice(0, 10);
