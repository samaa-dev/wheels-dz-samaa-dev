/** Thin localStorage wrapper — SSR safe. Swap for a backend later. */
export function readStore<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStore(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota errors ignored */
  }
}

export const STORAGE_KEYS = {
  user: "dw.user",
  favorites: "dw.favorites",
  recent: "dw.recentlyViewed",
  views: "dw.views",
  myListings: "dw.myListings",
  draft: "dw.listingDraft",
  contacts: "dw.contactsRevealed",
  liveListings: "dw.liveListings",
} as const;

/** Simulated network latency so the UI exercises loading states. */
export const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));