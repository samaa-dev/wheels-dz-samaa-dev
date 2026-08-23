import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { revealContact, getUserRevealedContacts } from '../../lib/firebase/users';
import { STORAGE_KEYS, readStore, writeStore } from '../../lib/storage';

interface UiState {
  recent: string[];
  views: Record<string, number>;
  revealedContacts: string[];
  /** When true, listings come from Firebase; when false, local mock listings are shown. */
  liveListings: boolean;
  loading: boolean;
  error: string | null;
}

const defaultLiveListings = typeof import.meta !== "undefined" && Boolean(import.meta.env?.PROD);

const initialState: UiState = {
  recent: [],
  views: {},
  revealedContacts: [],
  liveListings: defaultLiveListings,
  loading: false,
  error: null,
};

// Async thunks
export const fetchRevealedContactsThunk = createAsyncThunk(
  'ui/fetchRevealedContacts',
  async (uid: string) => {
    return await getUserRevealedContacts(uid);
  }
);

export const revealContactThunk = createAsyncThunk(
  'ui/revealContact',
  async ({ uid, listingId }: { uid: string; listingId: string }) => {
    const result = await revealContact(uid, listingId);
    return { listingId, allowed: result.allowed };
  }
);

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Initialize from localStorage (SSR-safe)
    hydrateFromLocalStorage: (state) => {
      if (typeof window !== 'undefined') {
        state.recent = readStore(STORAGE_KEYS.recent, []);
        state.views = readStore(STORAGE_KEYS.views, {});
        // In production always use live Firebase listings
        if (import.meta.env.PROD) {
          state.liveListings = true;
        } else {
          state.liveListings = readStore(STORAGE_KEYS.liveListings, false);
        }
      }
    },

    setLiveListings: (state, action: PayloadAction<boolean>) => {
      state.liveListings = action.payload;
      if (typeof window !== 'undefined') {
        writeStore(STORAGE_KEYS.liveListings, state.liveListings);
      }
    },
    
    // Add to recently viewed (keep last 8)
    pushRecent: (state, action: PayloadAction<string>) => {
      const listingId = action.payload;
      state.recent = [listingId, ...state.recent.filter(id => id !== listingId)].slice(0, 8);
      
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        writeStore(STORAGE_KEYS.recent, state.recent);
      }
    },
    
    // Register a view (local counter only)
    registerView: (state, action: PayloadAction<string>) => {
      const listingId = action.payload;
      state.views[listingId] = (state.views[listingId] || 0) + 1;
      
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        writeStore(STORAGE_KEYS.views, state.views);
      }
    },
    
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch revealed contacts
    builder
      .addCase(fetchRevealedContactsThunk.fulfilled, (state, action) => {
        state.revealedContacts = action.payload;
      })
      .addCase(fetchRevealedContactsThunk.rejected, (state, action) => {
        console.error('Error fetching revealed contacts:', action.error.message);
      });

    // Reveal contact
    builder
      .addCase(revealContactThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(revealContactThunk.fulfilled, (state, action) => {
        state.loading = false;
        const { listingId, allowed } = action.payload;
        
        if (allowed && !state.revealedContacts.includes(listingId)) {
          state.revealedContacts.push(listingId);
        }
      })
      .addCase(revealContactThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'حدث خطأ أثناء كشف رقم الهاتف';
      });
  },
});

export const { hydrateFromLocalStorage, setLiveListings, pushRecent, registerView, clearError } = uiSlice.actions;
export default uiSlice.reducer;