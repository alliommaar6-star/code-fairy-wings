/**
 * Account numbers are never stored in full. Only the last 4 digits are
 * kept, masked like "••••1234", so the real number never reaches localStorage
 * or the synced database.
 */
export function maskAccountNumber(value: string | undefined | null): string | undefined {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return undefined;
  const digits = trimmed.replace(/\D/g, "");
  const tail = (digits || trimmed).slice(-4);
  return `••••${tail}`;
}

/** Display helper: masks any stored value, even legacy full numbers. */
export function displayAccountNumber(value: string | undefined | null): string {
  return maskAccountNumber(value) ?? "";
}
