/** Auto-generated, editable record codes: SO-00001, PO-00001, CU-00001, SU-00001. */
export type CodePrefix = 'SO' | 'PO' | 'CU' | 'SU';

export function nextCode(prefix: CodePrefix, existing: (string | undefined | null)[]): string {
  const re = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  let max = 0;
  for (const c of existing) {
    const m = c?.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(5, '0')}`;
}

/** Ensure a user-edited code is unique; append -2, -3... if it collides. */
export function uniqueCode(wanted: string, existing: (string | undefined | null)[]): string {
  const taken = new Set(existing.filter(Boolean).map((c) => c!.toLowerCase()));
  let code = wanted.trim();
  if (!taken.has(code.toLowerCase())) return code;
  let i = 2;
  while (taken.has(`${code}-${i}`.toLowerCase())) i++;
  return `${code}-${i}`;
}

export function nowStamp() {
  const d = new Date();
  return {
    iso: d.toISOString(),
    date: d.toISOString().split('T')[0],
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}
