import type { DocumentData } from 'firebase/firestore';

/** Firestore `DocumentData` uses an index signature; return `any` for field access. */
export function fields(data: DocumentData): any {
  return data;
}

export function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const ts = value as { toDate: () => Date };
    if (typeof ts.toDate === 'function') {
      return ts.toDate().toISOString();
    }
  }
  return undefined;
}

export function toIsoOrNow(value: unknown): string {
  return toIso(value) ?? new Date().toISOString();
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
