import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import {
  fetchActiveListings,
  fetchUserListings,
  fetchListingById,
  createListing,
  updateListing,
  updateListingStatus,
  deleteListing,
  incrementListingViews,
  fetchFeaturedListings,
  fetchRecentListings,
} from '../../lib/firebase/listings';
import { uploadListingImages } from '../../lib/firebase/storage';
import type { Listing } from '../../lib/data/mock';

interface ListingsState {
  items: Listing[];
  myListings: Listing[];
  featuredListings: Listing[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  createError: string | null;
}

const initialState: ListingsState = {
  items: [],
  myListings: [],
  featuredListings: [],
  loading: false,
  error: null,
  creating: false,
  createError: null,
};

// Async thunks
export const fetchListingsThunk = createAsyncThunk('listings/fetchActive', async () => {
  return await fetchActiveListings();
});

export const fetchMyListingsThunk = createAsyncThunk(
  'listings/fetchMyListings',
  async (sellerId: string) => {
    return await fetchUserListings(sellerId);
  }
);

export const fetchFeaturedListingsThunk = createAsyncThunk(
  'listings/fetchFeatured',
  async (limit?: number) => {
    return await fetchFeaturedListings(limit ?? 6);
  }
);

export const fetchRecentListingsThunk = createAsyncThunk(
  'listings/fetchRecent',
  async (limit?: number) => {
    return await fetchRecentListings(limit ?? 12);
  }
);

export const createListingThunk = createAsyncThunk(
  'listings/create',
  async ({
    listingData,
    images,
  }: {
    listingData: Omit<Listing, 'id' | 'createdAt' | 'views' | 'contactClicks' | 'favorites' | 'shareCount' | 'publishedAt'>;
    images: File[];
  }) => {
    if (!images.length) {
      throw new Error('أضف صورة واحدة على الأقل من جهازك');
    }

    const { id: listingId, status } = await createListing({
      ...listingData,
      imageUrls: [],
      images: [],
      coverImageUrl: '',
    });

    const uploaded = await uploadListingImages(
      listingData.ownerId || listingData.sellerId,
      listingId,
      images,
    );
    const imageUrls = uploaded.map((item) => item.url);
    const coverImageUrl = imageUrls[0] || '';
    await updateListing(listingId, { imageUrls, images: imageUrls, coverImageUrl });

    const createdListing: Listing = {
      ...listingData,
      id: listingId,
      status,
      imageUrls,
      images: imageUrls,
      coverImageUrl,
      createdAt: new Date().toISOString(),
      views: 0,
      contactClicks: 0,
      favorites: 0,
      shareCount: 0,
    };

    return createdListing;
  }
);

export const updateListingThunk = createAsyncThunk(
  'listings/update',
  async ({
    listingId,
    updates,
    images,
    ownerId,
  }: {
    listingId: string;
    updates: Partial<Listing>;
    images?: File[];
    ownerId?: string;
  }) => {
    let nextUpdates = { ...updates };

    if (images && images.length > 0 && ownerId) {
      const uploaded = await uploadListingImages(ownerId, listingId, images);
      const imageUrls = uploaded.map((item) => item.url);
      const existing = updates.imageUrls ?? [];
      const merged = [...existing, ...imageUrls].slice(0, 5);
      nextUpdates = {
        ...nextUpdates,
        imageUrls: merged,
        images: merged,
        coverImageUrl: merged[0] || updates.coverImageUrl || '',
      };
    }

    await updateListing(listingId, nextUpdates);
    return { listingId, updates: nextUpdates };
  }
);

export const updateListingStatusThunk = createAsyncThunk(
  'listings/updateStatus',
  async ({
    listingId,
    status,
    sellerId,
  }: {
    listingId: string;
    status: Listing['status'];
    sellerId?: string;
  }) => {
    await updateListingStatus(listingId, status, sellerId);
    return { listingId, status };
  }
);

export const deleteListingThunk = createAsyncThunk(
  'listings/delete',
  async ({ listingId, sellerId }: { listingId: string; sellerId?: string }) => {
    await deleteListing(listingId, sellerId);
    return listingId;
  }
);

export const incrementViewsThunk = createAsyncThunk(
  'listings/incrementViews',
  async (listingId: string) => {
    await incrementListingViews(listingId);
    return listingId;
  }
);

const listingsSlice = createSlice({
  name: 'listings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.createError = null;
    },
    addLocalListing: (state, action: PayloadAction<Listing>) => {
      // Add to myListings for immediate UI update
      state.myListings.unshift(action.payload);
    },
    updateLocalListing: (state, action: PayloadAction<{ id: string; updates: Partial<Listing> }>) => {
      const { id, updates } = action.payload;
      
      // Update in items array
      const itemIndex = state.items.findIndex(item => item.id === id);
      const item = state.items[itemIndex];
      if (item) Object.assign(item, updates);
      
      // Update in myListings array
      const myItemIndex = state.myListings.findIndex(item => item.id === id);
      const myItem = state.myListings[myItemIndex];
      if (myItem) Object.assign(myItem, updates);
    },
    removeLocalListing: (state, action: PayloadAction<string>) => {
      const listingId = action.payload;
      state.items = state.items.filter(item => item.id !== listingId);
      state.myListings = state.myListings.filter(item => item.id !== listingId);
    },
  },
  extraReducers: (builder) => {
    // Fetch active listings
    builder
      .addCase(fetchListingsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchListingsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchListingsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'حدث خطأ أثناء جلب الإعلانات';
      });

    // Fetch my listings
    builder
      .addCase(fetchMyListingsThunk.fulfilled, (state, action) => {
        state.myListings = action.payload;
      })
      .addCase(fetchMyListingsThunk.rejected, (state, action) => {
        state.error = action.error.message || 'حدث خطأ أثناء جلب إعلاناتك';
      });

    // Fetch featured listings
    builder
      .addCase(fetchFeaturedListingsThunk.fulfilled, (state, action) => {
        state.featuredListings = action.payload;
      });

    // Create listing
    builder
      .addCase(createListingThunk.pending, (state) => {
        state.creating = true;
        state.createError = null;
      })
      .addCase(createListingThunk.fulfilled, (state, action) => {
        state.creating = false;
        state.myListings.unshift(action.payload);
        state.items.unshift(action.payload);
      })
      .addCase(createListingThunk.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.error.message || 'حدث خطأ أثناء إنشاء الإعلان';
      });

    // Update listing
    builder
      .addCase(updateListingThunk.fulfilled, (state, action) => {
        const { listingId, updates } = action.payload;
        const itemIndex = state.items.findIndex((item) => item.id === listingId);
        const item = state.items[itemIndex];
        if (item) Object.assign(item, updates);
        const myItemIndex = state.myListings.findIndex((item) => item.id === listingId);
        const myItem = state.myListings[myItemIndex];
        if (myItem) Object.assign(myItem, updates);
      });

    // Update listing status
    builder
      .addCase(updateListingStatusThunk.fulfilled, (state, action) => {
        const { listingId, status } = action.payload;
        
        // Update in items
        const itemIndex = state.items.findIndex(item => item.id === listingId);
        if (itemIndex !== -1) {
          const item = state.items[itemIndex];
          if (item) item.status = status;
        }
        
        // Update in myListings
        const myItemIndex = state.myListings.findIndex(item => item.id === listingId);
        if (myItemIndex !== -1) {
          const item = state.myListings[myItemIndex];
          if (item) item.status = status;
        }
      });

    // Delete listing
    builder
      .addCase(deleteListingThunk.fulfilled, (state, action) => {
        const listingId = action.payload;
        state.items = state.items.filter(item => item.id !== listingId);
        state.myListings = state.myListings.filter(item => item.id !== listingId);
      });

    // Increment views (optimistic update)
    builder
      .addCase(incrementViewsThunk.fulfilled, (state, action) => {
        const listingId = action.payload;
        
        // Update in items
        const itemIndex = state.items.findIndex(item => item.id === listingId);
        if (itemIndex !== -1) {
          const item = state.items[itemIndex];
          if (item) item.views += 1;
        }
        
        // Update in myListings  
        const myItemIndex = state.myListings.findIndex(item => item.id === listingId);
        if (myItemIndex !== -1) {
          const item = state.myListings[myItemIndex];
          if (item) item.views += 1;
        }
      });
  },
});

export const { clearError, addLocalListing, updateLocalListing, removeLocalListing } = listingsSlice.actions;
export default listingsSlice.reducer;