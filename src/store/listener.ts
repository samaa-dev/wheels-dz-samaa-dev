import { useEffect } from 'react';
import { onAuthStateChange, getCurrentUser } from '../lib/firebase/auth';
import { initializeFirebase, isFirebaseAvailable } from '../lib/firebase/config';
import { useAppDispatch } from './hooks';
import { hydrateUserThunk, clearUser, setHydrated } from './slices/authSlice';
import { fetchFavoritesThunk } from './slices/favoritesSlice';
import { fetchRevealedContactsThunk, hydrateFromLocalStorage } from './slices/uiSlice';

/**
 * AuthListener component that sets up Firebase auth state listener
 * and handles user hydration on app start
 */
export function AuthListener() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    let unsubscribe: (() => void) | null = null;

    const initAuth = async () => {
      try {
        // Initialize Firebase
        await initializeFirebase();
        
        // Hydrate UI state from localStorage
        dispatch(hydrateFromLocalStorage());

        if (!isFirebaseAvailable()) {
          console.warn('Firebase not available, marking as hydrated');
          dispatch(setHydrated(true));
          return;
        }

        // Check if user is already signed in
        const currentUser = getCurrentUser();
        if (currentUser) {
          // User is signed in, hydrate their data
          try {
            await dispatch(hydrateUserThunk(currentUser.uid));
            
            // Fetch user's favorites and revealed contacts
            dispatch(fetchFavoritesThunk(currentUser.uid));
            dispatch(fetchRevealedContactsThunk(currentUser.uid));
          } catch (error) {
            console.error('Error hydrating user data:', error);
            dispatch(clearUser());
          }
        } else {
          // No user signed in
          dispatch(clearUser());
        }

        // Set up auth state listener
        unsubscribe = onAuthStateChange(async (user) => {
          if (user) {
            // User signed in
            try {
              await dispatch(hydrateUserThunk(user.uid));
              
              // Fetch user's favorites and revealed contacts
              dispatch(fetchFavoritesThunk(user.uid));
              dispatch(fetchRevealedContactsThunk(user.uid));
            } catch (error) {
              console.error('Error hydrating user data:', error);
              dispatch(clearUser());
            }
          } else {
            // User signed out
            dispatch(clearUser());
          }
        });

        // Mark as hydrated
        dispatch(setHydrated(true));
      } catch (error) {
        console.error('Error initializing auth:', error);
        dispatch(setHydrated(true));
        dispatch(clearUser());
      }
    };

    initAuth();

    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [dispatch]);

  // This component doesn't render anything
  return null;
}