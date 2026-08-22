import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import listingsSlice from './slices/listingsSlice';
import favoritesSlice from './slices/favoritesSlice';
import uiSlice from './slices/uiSlice';
import messagesSlice from './slices/messagesSlice';
import statsSlice from './slices/statsSlice';
import searchesSlice from './slices/searchesSlice';
import adminSlice from './slices/adminSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    listings: listingsSlice,
    favorites: favoritesSlice,
    ui: uiSlice,
    messages: messagesSlice,
    stats: statsSlice,
    searches: searchesSlice,
    admin: adminSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types that might contain Firebase Timestamps
        ignoredActions: [
          'auth/loginWithEmail/fulfilled',
          'auth/registerWithEmail/fulfilled', 
          'auth/loginWithGoogle/fulfilled',
          'auth/hydrateUser/fulfilled',
          'favorites/fetch/fulfilled',
          'ui/fetchRevealedContacts/fulfilled',
          'messages/fetchConversationMessages/fulfilled',
          'messages/fetchUserConversations/fulfilled',
          'stats/fetchDailyStats/fulfilled',
          'stats/fetchPlatformSummary/fulfilled',
          'searches/fetchRecentSearches/fulfilled',
          'searches/fetchSavedSearches/fulfilled',
        ],
        // Ignore Firebase Timestamp objects in state paths
        ignoredPaths: [
          'auth.user.createdAt',
          'auth.user.updatedAt',
        ],
        // Ignore Firebase Timestamp type
        isSerializable: (value: any) => {
          // Allow Firebase Timestamp objects (they have toDate method)
          if (value && typeof value.toDate === 'function') {
            return true;
          }
          return true;
        },
      },
    }),
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;