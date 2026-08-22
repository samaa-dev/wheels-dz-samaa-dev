import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import {
  getUserFavorites,
  addToFavorites,
  removeFromFavorites,
  getUserFavoritesByCategory,
  isFavorite,
  getUserFavoritesCount,
  updateFavoriteNotes,
  updateFavoriteNotifications,
  getFavoritesSummary,
  clearAllFavorites,
  type Favorite,
  type FavoriteSummary,
} from '../../lib/firebase/favorites';

interface FavoritesState {
  // المفضلات الكاملة
  favorites: Favorite[];
  favoritesLoading: boolean;
  favoritesError: string | null;
  
  // معرفات المفضلات (للتوافق العكسي والفحص السريع)
  ids: string[];
  
  // ملخص المفضلات
  summary: FavoriteSummary | null;
  summaryLoading: boolean;
  summaryError: string | null;
  
  // عمليات التحديث
  updating: boolean;
  updateError: string | null;
  
  // الفلترة والبحث
  filteredFavorites: Favorite[];
  activeFilter: {
    category?: string;
    priceRange?: string;
    searchQuery?: string;
  };
  
  // التحميل العام
  loading: boolean;
  error: string | null;
}

const initialState: FavoritesState = {
  favorites: [],
  favoritesLoading: false,
  favoritesError: null,
  
  ids: [],
  
  summary: null,
  summaryLoading: false,
  summaryError: null,
  
  updating: false,
  updateError: null,
  
  filteredFavorites: [],
  activeFilter: {},
  
  loading: false,
  error: null,
};

// ===== Async Thunks =====

/**
 * جلب جميع مفضلات المستخدم
 */
export const fetchFavoritesThunk = createAsyncThunk(
  'favorites/fetch',
  async (uid: string) => {
    const favorites = await getUserFavorites(uid);
    return favorites;
  }
);

/**
 * إضافة إلى المفضلة
 */
export const addToFavoritesThunk = createAsyncThunk(
  'favorites/add',
  async (favoriteData: {
    userId: string;
    listingId: string;
    listingTitle: string;
    listingPrice: number;
    listingImageUrl: string;
    listingCategory: string;
    listingWilaya: string;
    listingStatus: string;
    sellerName: string;
    sellerId: string;
    notes?: string;
    notifyOnPriceChange?: boolean;
    notifyOnStatusChange?: boolean;
  }) => {
    const favoriteId = await addToFavorites(favoriteData);
    return { favoriteId, ...favoriteData };
  }
);

/**
 * إزالة من المفضلة
 */
export const removeFromFavoritesThunk = createAsyncThunk(
  'favorites/remove',
  async ({ userId, listingId }: { userId: string; listingId: string }) => {
    await removeFromFavorites(userId, listingId);
    return { listingId };
  }
);

/**
 * جلب مفضلات حسب الفئة
 */
export const fetchFavoritesByCategoryThunk = createAsyncThunk(
  'favorites/fetchByCategory',
  async ({ userId, category }: { userId: string; category: string }) => {
    return await getUserFavoritesByCategory(userId, category);
  }
);

/**
 * التحقق من المفضلة
 */
export const checkIsFavoriteThunk = createAsyncThunk(
  'favorites/checkIsFavorite',
  async ({ userId, listingId }: { userId: string; listingId: string }) => {
    const result = await isFavorite(userId, listingId);
    return { listingId, isFavorite: result };
  }
);

/**
 * جلب عدد المفضلات
 */
export const fetchFavoritesCountThunk = createAsyncThunk(
  'favorites/fetchCount',
  async (userId: string) => {
    return await getUserFavoritesCount(userId);
  }
);

/**
 * تحديث ملاحظات المفضلة
 */
export const updateFavoriteNotesThunk = createAsyncThunk(
  'favorites/updateNotes',
  async ({
    userId,
    listingId,
    notes,
  }: {
    userId: string;
    listingId: string;
    notes: string;
  }) => {
    await updateFavoriteNotes(userId, listingId, notes);
    return { listingId, notes };
  }
);

/**
 * تحديث إعدادات التنبيهات
 */
export const updateFavoriteNotificationsThunk = createAsyncThunk(
  'favorites/updateNotifications',
  async ({
    userId,
    listingId,
    notifications,
  }: {
    userId: string;
    listingId: string;
    notifications: {
      notifyOnPriceChange: boolean;
      notifyOnStatusChange: boolean;
    };
  }) => {
    await updateFavoriteNotifications(userId, listingId, notifications);
    return { listingId, notifications };
  }
);

/**
 * جلب ملخص المفضلات
 */
export const fetchFavoritesSummaryThunk = createAsyncThunk(
  'favorites/fetchSummary',
  async (userId: string) => {
    return await getFavoritesSummary(userId);
  }
);

/**
 * مسح جميع المفضلات
 */
export const clearAllFavoritesThunk = createAsyncThunk(
  'favorites/clearAll',
  async (userId: string) => {
    await clearAllFavorites(userId);
    return true;
  }
);

/**
 * إضافة/إزالة تلقائية (للتوافق العكسي)
 */
export const toggleFavoriteThunk = createAsyncThunk(
  'favorites/toggle',
  async (
    { uid, listingId, listingData }: { 
      uid: string; 
      listingId: string;
      listingData?: {
        title: string;
        price: number;
        imageUrl: string;
        category: string;
        wilaya: string;
        status: string;
        sellerName: string;
        sellerId: string;
      };
    },
    { dispatch, getState }
  ) => {
    const state = getState() as { favorites: FavoritesState };
    const isFav = state.favorites.ids.includes(listingId);
    
    if (isFav) {
      await dispatch(removeFromFavoritesThunk({ userId: uid, listingId }));
      return { listingId, added: false };
    } else {
      if (!listingData) {
        throw new Error('بيانات الإعلان مطلوبة للإضافة للمفضلة');
      }
      
      await dispatch(addToFavoritesThunk({
        userId: uid,
        listingId,
        listingTitle: listingData.title,
        listingPrice: listingData.price,
        listingImageUrl: listingData.imageUrl,
        listingCategory: listingData.category,
        listingWilaya: listingData.wilaya,
        listingStatus: listingData.status,
        sellerName: listingData.sellerName,
        sellerId: listingData.sellerId,
      }));
      return { listingId, added: true };
    }
  }
);

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    // مسح الأخطاء
    clearError: (state) => {
      state.error = null;
      state.favoritesError = null;
      state.summaryError = null;
      state.updateError = null;
    },
    
    // تحديث تفاؤلي (للتوافق العكسي)
    optimisticToggle: (state, action: PayloadAction<string>) => {
      const listingId = action.payload;
      const isCurrentlyFavorite = state.ids.includes(listingId);
      
      if (isCurrentlyFavorite) {
        state.ids = state.ids.filter(id => id !== listingId);
        state.favorites = state.favorites.filter(fav => fav.listingId !== listingId);
      } else {
        state.ids.push(listingId);
      }
      
      // تحديث المفضلات المفلترة
      state.filteredFavorites = applyFilters(state.favorites, state.activeFilter);
    },
    
    // تعيين فلتر
    setFilter: (state, action: PayloadAction<{
      category?: string;
      priceRange?: string;
      searchQuery?: string;
    }>) => {
      state.activeFilter = { ...state.activeFilter, ...action.payload };
      state.filteredFavorites = applyFilters(state.favorites, state.activeFilter);
    },
    
    // مسح الفلاتر
    clearFilters: (state) => {
      state.activeFilter = {};
      state.filteredFavorites = state.favorites;
    },
    
    // إعادة تعيين حالة المفضلات
    resetFavoritesState: (state) => {
      state.favorites = [];
      state.ids = [];
      state.summary = null;
      state.filteredFavorites = [];
      state.activeFilter = {};
      state.favoritesError = null;
      state.summaryError = null;
      state.updateError = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // جلب المفضلات
    builder
      .addCase(fetchFavoritesThunk.pending, (state) => {
        state.loading = true;
        state.favoritesLoading = true;
        state.error = null;
        state.favoritesError = null;
      })
      .addCase(fetchFavoritesThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.favoritesLoading = false;
        state.favorites = action.payload;
        state.ids = action.payload.map(fav => fav.listingId);
        state.filteredFavorites = applyFilters(action.payload, state.activeFilter);
        state.error = null;
        state.favoritesError = null;
      })
      .addCase(fetchFavoritesThunk.rejected, (state, action) => {
        state.loading = false;
        state.favoritesLoading = false;
        state.error = action.error.message || 'حدث خطأ أثناء جلب المفضّلة';
        state.favoritesError = action.error.message || 'حدث خطأ أثناء جلب المفضّلة';
      });

    // إضافة للمفضلة
    builder
      .addCase(addToFavoritesThunk.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(addToFavoritesThunk.fulfilled, (state, action) => {
        state.updating = false;
        const newFavorite: Favorite = {
          id: action.payload.favoriteId,
          userId: action.payload.userId,
          listingId: action.payload.listingId,
          listingTitle: action.payload.listingTitle,
          listingPrice: action.payload.listingPrice,
          listingImageUrl: action.payload.listingImageUrl,
          listingCategory: action.payload.listingCategory,
          listingWilaya: action.payload.listingWilaya,
          listingStatus: action.payload.listingStatus,
          sellerName: action.payload.sellerName,
          sellerId: action.payload.sellerId,
          addedAt: new Date().toISOString(),
          priceAtAddition: action.payload.listingPrice,
          notes: action.payload.notes || '',
          notifyOnPriceChange: action.payload.notifyOnPriceChange || false,
          notifyOnStatusChange: action.payload.notifyOnStatusChange || false,
          isActive: true,
          lastChecked: new Date().toISOString(),
        };
        
        state.favorites = [newFavorite, ...state.favorites];
        if (!state.ids.includes(action.payload.listingId)) {
          state.ids.push(action.payload.listingId);
        }
        state.filteredFavorites = applyFilters(state.favorites, state.activeFilter);
        state.updateError = null;
      })
      .addCase(addToFavoritesThunk.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.error.message || 'حدث خطأ أثناء إضافة المفضّلة';
      });

    // إزالة من المفضلة
    builder
      .addCase(removeFromFavoritesThunk.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(removeFromFavoritesThunk.fulfilled, (state, action) => {
        state.updating = false;
        state.favorites = state.favorites.filter(fav => fav.listingId !== action.payload.listingId);
        state.ids = state.ids.filter(id => id !== action.payload.listingId);
        state.filteredFavorites = applyFilters(state.favorites, state.activeFilter);
        state.updateError = null;
      })
      .addCase(removeFromFavoritesThunk.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.error.message || 'حدث خطأ أثناء إزالة المفضّلة';
      });

    // جلب الملخص
    builder
      .addCase(fetchFavoritesSummaryThunk.pending, (state) => {
        state.summaryLoading = true;
        state.summaryError = null;
      })
      .addCase(fetchFavoritesSummaryThunk.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.summary = action.payload;
        state.summaryError = null;
      })
      .addCase(fetchFavoritesSummaryThunk.rejected, (state, action) => {
        state.summaryLoading = false;
        state.summaryError = action.error.message || 'حدث خطأ أثناء جلب ملخص المفضّلة';
      });

    // تحديث الملاحظات
    builder
      .addCase(updateFavoriteNotesThunk.fulfilled, (state, action) => {
        const { listingId, notes } = action.payload;
        const favorite = state.favorites.find(fav => fav.listingId === listingId);
        if (favorite) {
          favorite.notes = notes;
          favorite.lastChecked = new Date().toISOString();
        }
        state.filteredFavorites = applyFilters(state.favorites, state.activeFilter);
      });

    // تحديث التنبيهات
    builder
      .addCase(updateFavoriteNotificationsThunk.fulfilled, (state, action) => {
        const { listingId, notifications } = action.payload;
        const favorite = state.favorites.find(fav => fav.listingId === listingId);
        if (favorite) {
          favorite.notifyOnPriceChange = notifications.notifyOnPriceChange;
          favorite.notifyOnStatusChange = notifications.notifyOnStatusChange;
          favorite.lastChecked = new Date().toISOString();
        }
      });

    // مسح جميع المفضلات
    builder
      .addCase(clearAllFavoritesThunk.fulfilled, (state) => {
        state.favorites = [];
        state.ids = [];
        state.filteredFavorites = [];
        state.summary = null;
      });

    // التبديل التلقائي (للتوافق العكسي)
    builder
      .addCase(toggleFavoriteThunk.fulfilled, (state, action) => {
        const { listingId, added } = action.payload;
        
        if (added) {
          if (!state.ids.includes(listingId)) {
            state.ids.push(listingId);
          }
        } else {
          state.ids = state.ids.filter(id => id !== listingId);
          state.favorites = state.favorites.filter(fav => fav.listingId !== listingId);
        }
        
        state.filteredFavorites = applyFilters(state.favorites, state.activeFilter);
      })
      .addCase(toggleFavoriteThunk.rejected, (state, action) => {
        state.error = action.error.message || 'حدث خطأ أثناء تحديث المفضّلة';
        state.updateError = action.error.message || 'حدث خطأ أثناء تحديث المفضّلة';
      });
  },
});

// ===== Helper Functions =====

/**
 * تطبيق الفلاتر على المفضلات
 */
function applyFilters(favorites: Favorite[], filters: FavoritesState['activeFilter']): Favorite[] {
  let filtered = [...favorites];
  
  // فلتر حسب الفئة
  if (filters.category) {
    filtered = filtered.filter(fav => fav.listingCategory === filters.category);
  }
  
  // فلتر حسب نطاق السعر
  if (filters.priceRange) {
    filtered = filtered.filter(fav => {
      const price = fav.listingPrice;
      switch (filters.priceRange) {
        case 'low':
          return price < 50000;
        case 'medium':
          return price >= 50000 && price < 150000;
        case 'high':
          return price >= 150000;
        default:
          return true;
      }
    });
  }
  
  // فلتر حسب البحث
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(fav =>
      fav.listingTitle.toLowerCase().includes(query) ||
      fav.sellerName.toLowerCase().includes(query) ||
      fav.listingWilaya.toLowerCase().includes(query)
    );
  }
  
  return filtered;
}

export const {
  clearError,
  optimisticToggle,
  setFilter,
  clearFilters,
  resetFavoritesState,
} = favoritesSlice.actions;

// ===== Selectors =====

export const selectFavorites = (state: { favorites: FavoritesState }) => state.favorites;
export const selectFavoritesIds = (state: { favorites: FavoritesState }) => state.favorites.ids;
export const selectFavoritesList = (state: { favorites: FavoritesState }) => state.favorites.favorites;
export const selectFilteredFavorites = (state: { favorites: FavoritesState }) => state.favorites.filteredFavorites;
export const selectFavoritesSummary = (state: { favorites: FavoritesState }) => state.favorites.summary;
export const selectFavoritesLoading = (state: { favorites: FavoritesState }) => state.favorites.loading;
export const selectFavoritesUpdating = (state: { favorites: FavoritesState }) => state.favorites.updating;
export const selectActiveFilters = (state: { favorites: FavoritesState }) => state.favorites.activeFilter;

export const selectIsFavorite = (listingId: string) => (state: { favorites: FavoritesState }) =>
  state.favorites.ids.includes(listingId);

export default favoritesSlice.reducer;