import { useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useTracking, TrackRecord, HOUR, todayStr } from './tracking-store';

export type TrackItem = {
  id: string;
  ref: string;
  date: string;
  customer: string;
  phone?: string;
  kind: 'Delivery' | 'Cargo' | 'Pickup';
  carrier: string; // driver or cargo company
  carrierPhone?: string;
  balance: number;
  track: TrackRecord;
  cashOverdue: boolean;
  cashPendingMs: number; // ms since delivered
  debtState: 'none' | 'ok' | 'soon' | 'overdue';
};

export function useTrackItems() {
  const { orders, sales } = useStore();
  const tracks = useTracking();
  return useMemo(() => {
    const now = Date.now();
    const today = todayStr();
    const tomorrow = new Date(now + 24 * HOUR).toISOString().slice(0, 10);
    const orderIds = new Set(orders.map((o) => o.id));
    const raw: Omit<TrackItem, 'track' | 'cashOverdue' | 'cashPendingMs' | 'debtState'>[] = [];
    for (const o of orders) {
      if (o.status === 'cancelled') continue;
      raw.push({
        id: `o:${o.id}`, ref: o.orderNo, date: o.date, customer: o.customerName, phone: o.customerPhone,
        kind: (o.fulfillmentType as TrackItem['kind']) || 'Pickup',
        carrier: o.fulfillmentType === 'Cargo' ? (o.cargoCompany || '—') : (o.driverName || o.deliveryCompany || '—'),
        carrierPhone: o.fulfillmentType === 'Cargo' ? o.cargoPhone : o.driverPhone,
        balance: Math.max(0, (o.total || 0) - (o.paidAmount || 0)),
      });
    }
    for (const s of sales) {
      if (s.orderId && orderIds.has(s.orderId)) continue;
      raw.push({
        id: `s:${s.id}`, ref: s.invoiceNo, date: s.date, customer: s.customerName, phone: s.customerPhone,
        kind: (s.fulfillmentType as TrackItem['kind']) || 'Pickup',
        carrier: s.fulfillmentType === 'Cargo' ? (s.cargoCompany || '—') : (s.driverName || '—'),
        balance: Math.max(0, s.remainingBalance || 0),
      });
    }
    return raw.map((r) => {
      const track = tracks[r.id] ?? { stage: 'pending' as const, updatedAt: '' };
      const deliveredMs = track.deliveredAt ? now - new Date(track.deliveredAt).getTime() : 0;
      const cashOpen = r.kind === 'Delivery' && track.stage === 'delivered' && r.balance > 0 && !track.cashCollectedAt;
      let debtState: TrackItem['debtState'] = 'none';
      if (r.balance > 0 && track.debtDueDate && !cashOpen) {
        debtState = track.debtDueDate < today ? 'overdue' : track.debtDueDate <= tomorrow ? 'soon' : 'ok';
      }
      return { ...r, track, cashPendingMs: cashOpen ? deliveredMs : 0, cashOverdue: cashOpen && deliveredMs >= HOUR, debtState };
    });
  }, [orders, sales, tracks]);
}
