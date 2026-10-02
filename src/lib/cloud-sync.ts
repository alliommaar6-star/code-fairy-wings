import { supabase } from "@/integrations/supabase/client";

/**
 * Offline-first cloud sync for the admin system.
 * - localStorage stays the working copy (works with no internet).
 * - Every write to a `benadir_*` key is queued and pushed to the cloud when online + signed in.
 * - On start, newer cloud data is pulled before the app loads, so a new device/account sees everything.
 */

const META_KEY = "benadir__sync_meta";
const EXCLUDE = new Set(["benadir_portal_auth", "benadir_active_portal", META_KEY]);

type Meta = { dirty: Record<string, string>; seen: Record<string, string>; uploadedOnce?: boolean };
export type SyncStatus = "offline" | "signed_out" | "syncing" | "synced" | "pending" | "error";

let origSet: (k: string, v: string) => void = () => {};
let installed = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let status: SyncStatus = "synced";
let pulledOk = false;
let pulling: Promise<number> | null = null;
const listeners = new Set<() => void>();

function isSyncable(key: string) {
  return key.startsWith("benadir_") && !key.startsWith("benadir__") && !EXCLUDE.has(key);
}
function isEmptyJson(v: string | null | undefined) {
  if (v == null || v === "") return true;
  try {
    const j = JSON.parse(v);
    return j == null || (Array.isArray(j) ? j.length === 0 : typeof j === "object" ? Object.keys(j).length === 0 : false);
  } catch { return false; }
}
/** Keep the local copy of a key before the cloud replaces it (recoverable from System Management). */
function backupLocal(key: string, value: string) {
  try { origSet("benadir__localbak:" + key, JSON.stringify({ at: new Date().toISOString(), value })); } catch { /* storage full */ }
}
function readMeta(): Meta {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) || "");
    return { dirty: m.dirty || {}, seen: m.seen || {}, uploadedOnce: !!m.uploadedOnce };
  } catch {
    return { dirty: {}, seen: {} };
  }
}
function writeMeta(m: Meta) {
  origSet(META_KEY, JSON.stringify(m));
}
function setStatus(s: SyncStatus) {
  status = s;
  listeners.forEach((l) => l());
}
export function getSyncStatus() {
  return status;
}
export function subscribeSync(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function pendingCount() {
  return Object.keys(readMeta().dirty).length;
}

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const proto = Storage.prototype;
  const nativeSet = proto.setItem;
  origSet = (k, v) => nativeSet.call(localStorage, k, v);
  proto.setItem = function (key: string, value: string) {
    const prev = this === localStorage ? localStorage.getItem(key) : null;
    nativeSet.call(this, key, value);
    if (this === localStorage && isSyncable(key) && prev !== value) {
      const m = readMeta();
      m.dirty[key] = new Date().toISOString();
      writeMeta(m);
      scheduleFlush();
    }
  };
  window.addEventListener("online", () => scheduleFlush(0));
  window.addEventListener("offline", () => setStatus("offline"));
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") void pull().then(() => scheduleFlush(0));
  });
}

export function scheduleFlush(delay = 1500) {
  if (flushTimer) clearTimeout(flushTimer);
  if (pendingCount() > 0) setStatus(navigator.onLine ? "pending" : "offline");
  flushTimer = setTimeout(() => void flush(), delay);
}

export async function flush() {
  if (!navigator.onLine) return setStatus("offline");
  const { data } = await supabase.auth.getSession();
  if (!data.session) return setStatus("signed_out");
  // Never push before we've seen what the cloud has — protects real data from being overwritten.
  if (!pulledOk) { await pull(); if (!pulledOk) return; }
  const m = readMeta();
  const keys = Object.keys(m.dirty);
  if (!keys.length) return setStatus("synced");
  setStatus("syncing");
  const rows = keys
    .map((key) => {
      const raw = localStorage.getItem(key);
      return raw == null ? null : { key, value: { s: raw }, updated_at: m.dirty[key], updated_by: data.session!.user.id };
    })
    .filter(Boolean) as { key: string; value: { s: string }; updated_at: string; updated_by: string }[];
  const { error } = await supabase.from("app_state").upsert(rows, { onConflict: "key" });
  if (error) {
    setStatus("error");
    flushTimer = setTimeout(() => void flush(), 15000);
    return;
  }
  const after = readMeta();
  for (const r of rows) {
    if (after.dirty[r.key] === r.updated_at) delete after.dirty[r.key];
    after.seen[r.key] = r.updated_at;
  }
  after.uploadedOnce = true;
  writeMeta(after);
  setStatus(Object.keys(after.dirty).length ? "pending" : "synced");
}

/** Pull newer cloud data into localStorage. Returns number of keys updated. */
export function pull(): Promise<number> {
  if (!pulling) pulling = doPull().finally(() => { pulling = null; });
  return pulling;
}
async function doPull(): Promise<number> {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) {
    setStatus("signed_out");
    return 0;
  }
  const { data, error } = await supabase.from("app_state").select("key, value, updated_at");
  if (error || !data) return 0;
  const m = readMeta();
  let changed = 0;
  for (const row of data) {
    const remote = row.updated_at as string;
    // Local unsynced edit wins only if this device has synced this key before.
    // A fresh device/project never overwrites existing cloud data.
    if (m.dirty[row.key] && m.seen[row.key]) continue;
    if (m.dirty[row.key]) delete m.dirty[row.key];
    if (m.seen[row.key] && m.seen[row.key] >= remote) continue;
    if (!isSyncable(row.key)) continue;
    const s = (row.value as { s?: string } | null)?.s;
    const local = localStorage.getItem(row.key);
    // Safety: on first sight, an EMPTY cloud value never wipes real local data — local is uploaded instead.
    if (!m.seen[row.key] && isEmptyJson(s) && !isEmptyJson(local)) {
      m.dirty[row.key] = new Date().toISOString();
      continue;
    }
    if (typeof s === "string" && local !== s) {
      if (local && !isEmptyJson(local)) backupLocal(row.key, local);
      origSet(row.key, s);
      changed++;
    }
    m.seen[row.key] = remote;
  }
  // First time on a device with existing local data and nothing in the cloud: upload everything.
  if (!m.uploadedOnce) {
    const cloudKeys = new Set(data.map((r) => r.key));
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (isSyncable(k) && !cloudKeys.has(k)) m.dirty[k] = new Date().toISOString();
    }
  }
  writeMeta(m);
  pulledOk = true;
  return changed;
}

/** Called before the admin app loads. Never blocks longer than ~2.5s. */
export async function startCloudSync() {
  install();
  if (!navigator.onLine) {
    setStatus("offline");
    return;
  }
  try {
    let done = false;
    const p = pull().then((n) => { done = true; return n; });
    await Promise.race([p, new Promise((r) => setTimeout(r, 6000))]);
    // Slow network: app already opened with the local copy — reload once cloud data lands.
    if (!done) void p.then((n) => { if (n > 0) window.location.reload(); });
  } catch {
    /* offline or slow — keep local copy */
  }
  scheduleFlush(500);

  supabase
    .channel("app_state_sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "app_state" }, (payload) => {
      const row = payload.new as { key?: string; value?: { s?: string }; updated_at?: string };
      if (!row?.key || !row.value?.s || !isSyncable(row.key)) return;
      const m = readMeta();
      if (m.dirty[row.key] || (m.seen[row.key] && row.updated_at && m.seen[row.key] >= row.updated_at)) return;
      if (localStorage.getItem(row.key) === row.value.s) return;
      origSet(row.key, row.value.s);
      m.seen[row.key] = row.updated_at || new Date().toISOString();
      writeMeta(m);
      window.dispatchEvent(new CustomEvent("benadir-remote-update"));
    })
    .subscribe();
}
