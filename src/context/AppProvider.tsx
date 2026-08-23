import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MOCK_LISTINGS, type Listing } from "@/lib/data/mock";
import { STORAGE_KEYS, delay, readStore, writeStore } from "@/lib/storage";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  wilaya: string;
  memberSince: string;
  rating: number;
}

interface AppState {
  user: AuthUser | null;
  hydrated: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  register: (data: Omit<AuthUser, "id" | "memberSince" | "rating"> & { password: string }) => Promise<AuthUser>;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  favorites: string[];
  toggleFavorite: (id: string) => boolean;
  isFavorite: (id: string) => boolean;
  recent: string[];
  pushRecent: (id: string) => void;
  views: Record<string, number>;
  registerView: (id: string) => void;
  myListings: Listing[];
  saveListing: (listing: Listing) => void;
  removeListing: (id: string) => void;
  updateListingStatus: (id: string, status: Listing["status"]) => void;
  revealedContacts: string[];
  revealContact: (id: string) => boolean;
}

const CONTACT_LIMIT = 5;

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [views, setViews] = useState<Record<string, number>>({});
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [revealedContacts, setRevealedContacts] = useState<string[]>([]);

  useEffect(() => {
    setUser(readStore<AuthUser | null>(STORAGE_KEYS.user, null));
    setFavorites(readStore<string[]>(STORAGE_KEYS.favorites, []));
    setRecent(readStore<string[]>(STORAGE_KEYS.recent, []));
    setViews(readStore<Record<string, number>>(STORAGE_KEYS.views, {}));
    setMyListings(readStore<Listing[]>(STORAGE_KEYS.myListings, []));
    setRevealedContacts(readStore<string[]>(STORAGE_KEYS.contacts, []));
    setHydrated(true);
  }, []);

  const login = useCallback(async (identifier: string, _password: string) => {
    await delay(700);
    const next: AuthUser = {
      id: "me",
      name: "مستخدم جزائري",
      email: identifier.includes("@") ? identifier : "user@djazair-wheels.dz",
      phone: identifier.includes("@") ? "0555123456" : identifier,
      wilaya: "الجزائر",
      memberSince: new Date(2023, 4, 12).toISOString(),
      rating: 4.6,
    };
    setUser(next);
    writeStore(STORAGE_KEYS.user, next);
    return next;
  }, []);

  const register = useCallback<AppState["register"]>(async (data) => {
    await delay(800);
    const next: AuthUser = {
      id: "me",
      name: data.name,
      email: data.email,
      phone: data.phone,
      wilaya: data.wilaya,
      memberSince: new Date().toISOString(),
      rating: 0,
    };
    setUser(next);
    writeStore(STORAGE_KEYS.user, next);
    return next;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    writeStore(STORAGE_KEYS.user, null);
  }, []);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      writeStore(STORAGE_KEYS.user, next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    let added = false;
    setFavorites((prev) => {
      added = !prev.includes(id);
      const next = added ? [...prev, id] : prev.filter((f) => f !== id);
      writeStore(STORAGE_KEYS.favorites, next);
      return next;
    });
    return added;
  }, []);

  const pushRecent = useCallback((id: string) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((r) => r !== id)].slice(0, 8);
      writeStore(STORAGE_KEYS.recent, next);
      return next;
    });
  }, []);

  const registerView = useCallback((id: string) => {
    setViews((prev) => {
      const next = { ...prev, [id]: (prev[id] ?? 0) + 1 };
      writeStore(STORAGE_KEYS.views, next);
      return next;
    });
  }, []);

  const saveListing = useCallback((_listing: Listing) => {
    throw new Error("saveListing لم يعد مدعوماً — استخدم createListing عبر Firebase");
  }, []);

  const removeListing = useCallback((id: string) => {
    setMyListings((prev) => {
      const next = prev.filter((l) => l.id !== id);
      writeStore(STORAGE_KEYS.myListings, next);
      return next;
    });
  }, []);

  const updateListingStatus = useCallback((id: string, status: Listing["status"]) => {
    setMyListings((prev) => {
      const next = prev.map((l) => (l.id === id ? { ...l, status } : l));
      writeStore(STORAGE_KEYS.myListings, next);
      return next;
    });
  }, []);

  const revealContact = useCallback((id: string) => {
    let allowed = true;
    setRevealedContacts((prev) => {
      if (prev.includes(id)) return prev;
      if (prev.length >= CONTACT_LIMIT) {
        allowed = false;
        return prev;
      }
      const next = [...prev, id];
      writeStore(STORAGE_KEYS.contacts, next);
      return next;
    });
    return allowed;
  }, []);

  const value = useMemo<AppState>(
    () => ({
      user,
      hydrated,
      login,
      register,
      logout,
      updateUser,
      favorites,
      toggleFavorite,
      isFavorite: (id: string) => favorites.includes(id),
      recent,
      pushRecent,
      views,
      registerView,
      myListings,
      saveListing,
      removeListing,
      updateListingStatus,
      revealedContacts,
      revealContact,
    }),
    [
      user,
      hydrated,
      login,
      register,
      logout,
      updateUser,
      favorites,
      toggleFavorite,
      recent,
      pushRecent,
      views,
      registerView,
      myListings,
      saveListing,
      removeListing,
      updateListingStatus,
      revealedContacts,
      revealContact,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

/** All listings = mock catalogue + locally created ones. */
export function useAllListings(): Listing[] {
  const { myListings } = useApp();
  return useMemo(() => [...myListings, ...MOCK_LISTINGS], [myListings]);
}

export { CONTACT_LIMIT };