import { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  loginWithEmailThunk,
  registerWithEmailThunk,
  loginWithGoogleThunk,
  logoutThunk,
  updateProfileThunk,
  type AuthUser,
} from '../store/slices/authSlice';
import {
  toggleFavoriteThunk,
  optimisticToggle,
} from '../store/slices/favoritesSlice';
import {
  pushRecent,
  registerView,
  revealContactThunk,
} from '../store/slices/uiSlice';
import {
  fetchMyListingsThunk,
  updateListingStatusThunk,
  deleteListingThunk,
  createListingThunk,
} from '../store/slices/listingsSlice';
import { MOCK_LISTINGS, type Listing } from '../lib/data/mock';

/** Daily limit for revealing seller phone numbers */
export const CONTACT_LIMIT = 20;

/**
 * Compatibility hook that provides the same interface as the old AppProvider's useApp()
 * but backed by Redux store instead of Context
 */
export function useApp() {
  const dispatch = useAppDispatch();
  
  // Selectors
  const user = useAppSelector(state => state.auth.user);
  const hydrated = useAppSelector(state => state.auth.hydrated);
  const authLoading = useAppSelector(state => state.auth.loading);
  const favorites = useAppSelector(state => state.favorites.ids);
  const recent = useAppSelector(state => state.ui.recent);
  const views = useAppSelector(state => state.ui.views);
  const myListings = useAppSelector(state => state.listings.myListings);
  const revealedContacts = useAppSelector(state => state.ui.revealedContacts);

  // Auth functions
  const login = useMemo(() => {
    return async (identifier: string, password: string): Promise<AuthUser> => {
      const result = await dispatch(loginWithEmailThunk({ email: identifier, password }));
      if (loginWithEmailThunk.fulfilled.match(result)) {
        return result.payload;
      } else {
        throw new Error(result.error?.message || 'حدث خطأ أثناء تسجيل الدخول');
      }
    };
  }, [dispatch]);

  const register = useMemo(() => {
    return async (data: { name: string; email: string; phone: string; wilaya: string; password: string; commune?: string }): Promise<AuthUser> => {
      const { password, ...profile } = data;
      const result = await dispatch(registerWithEmailThunk({ 
        email: profile.email, 
        password, 
        profile: {
          name: profile.name,
          displayName: profile.name,
          phone: profile.phone,
          phoneNumber: profile.phone,
          wilaya: profile.wilaya,
          commune: profile.commune || '',
        },
      }));
      if (registerWithEmailThunk.fulfilled.match(result)) {
        return result.payload;
      } else {
        throw new Error(result.error?.message || 'حدث خطأ أثناء إنشاء الحساب');
      }
    };
  }, [dispatch]);

  const loginWithGoogle = useMemo(() => {
    return async (): Promise<AuthUser> => {
      const result = await dispatch(loginWithGoogleThunk());
      if (loginWithGoogleThunk.fulfilled.match(result)) {
        return result.payload;
      } else {
        throw new Error(result.error?.message || 'حدث خطأ أثناء تسجيل الدخول بجوجل');
      }
    };
  }, [dispatch]);

  const logout = useMemo(() => {
    return () => {
      dispatch(logoutThunk());
    };
  }, [dispatch]);

  const updateUser = useMemo(() => {
    return (patch: Partial<AuthUser>) => {
      dispatch(updateProfileThunk(patch));
    };
  }, [dispatch]);

  // Favorites functions
  const toggleFavorite = useMemo(() => {
    return (id: string): boolean => {
      if (!user) return false;
      
      const isCurrentlyFavorite = favorites.includes(id);
      
      // Optimistic update
      dispatch(optimisticToggle(id));
      
      // Sync with Firebase
      dispatch(toggleFavoriteThunk({ uid: user.id, listingId: id }));
      
      return !isCurrentlyFavorite;
    };
  }, [dispatch, user, favorites]);

  const isFavorite = useMemo(() => {
    return (id: string): boolean => favorites.includes(id);
  }, [favorites]);

  // Recent and views functions
  const pushRecentFunc = useMemo(() => {
    return (id: string) => {
      dispatch(pushRecent(id));
    };
  }, [dispatch]);

  const registerViewFunc = useMemo(() => {
    return (id: string) => {
      dispatch(registerView(id));
    };
  }, [dispatch]);

  // Listings functions
  const createListing = useMemo(() => {
    return async (
      listingData: Omit<Listing, 'id' | 'createdAt' | 'views' | 'contactClicks' | 'favorites' | 'shareCount' | 'publishedAt'>,
      images: File[] = [],
    ): Promise<Listing> => {
      if (!images.length) {
        throw new Error('أضف صورة واحدة على الأقل من جهازك');
      }
      const result = await dispatch(createListingThunk({ listingData, images }));
      if (createListingThunk.fulfilled.match(result)) {
        return result.payload;
      }
      throw new Error(result.error?.message || 'تعذّر نشر الإعلان');
    };
  }, [dispatch]);

  const saveListing = useMemo(() => {
    return (_listing: Listing) => {
      throw new Error('saveListing لم يعد مدعوماً — استخدم createListing');
    };
  }, []);

  const removeListing = useMemo(() => {
    return (id: string) => {
      if (!user) return;
      dispatch(deleteListingThunk({ listingId: id, sellerId: user.id }));
    };
  }, [dispatch, user]);

  const updateListingStatus = useMemo(() => {
    return (id: string, status: Listing["status"]) => {
      if (!user) return;
      dispatch(updateListingStatusThunk({ listingId: id, status, sellerId: user.id }));
    };
  }, [dispatch, user]);

  const revealContact = useMemo(() => {
    return (id: string): boolean => {
      if (!user) return false;
      
      const alreadyRevealed = revealedContacts.includes(id);
      if (alreadyRevealed) return true;
      
      const canReveal = revealedContacts.length < CONTACT_LIMIT;
      if (canReveal) {
        dispatch(revealContactThunk({ uid: user.id, listingId: id }));
      }
      
      return canReveal;
    };
  }, [dispatch, user, revealedContacts]);

  return {
    user,
    hydrated,
    login,
    register,
    loginWithGoogle,
    logout,
    updateUser,
    favorites,
    toggleFavorite,
    isFavorite,
    recent,
    pushRecent: pushRecentFunc,
    views,
    registerView: registerViewFunc,
    myListings,
    saveListing,
    createListing,
    removeListing,
    updateListingStatus,
    revealedContacts,
    revealContact,
    // Additional properties for compatibility
    loading: authLoading,
  };
}

/**
 * Compatibility hook that provides all listings (active + user's own).
 * Live mode uses Firebase; otherwise MOCK_LISTINGS is shown.
 */
export function useAllListings(): Listing[] {
  const liveListings = useAppSelector(state => state.ui.liveListings);
  const activeListings = useAppSelector(state => state.listings.items);
  const myListings = useAppSelector(state => state.listings.myListings);

  return useMemo(() => {
    const source = liveListings ? activeListings : MOCK_LISTINGS;
    const myListingIds = new Set(myListings.map(listing => listing.id));
    const filteredActiveListings = source.filter(listing => !myListingIds.has(listing.id));

    return [...myListings, ...filteredActiveListings];
  }, [liveListings, activeListings, myListings]);
}

/** True when the UI is showing local mock listings. */
export function useIsDemoListings(): boolean {
  return useAppSelector(state => !state.ui.liveListings);
}

export function useLiveListings(): boolean {
  return useAppSelector(state => state.ui.liveListings);
}