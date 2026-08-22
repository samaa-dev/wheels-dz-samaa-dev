/**
 * Redux Slice for Searches
 * إدارة حالة البحث وتاريخ البحث
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import {
  recordSearch,
  recordSearchClick,
  getUserSearchHistory,
  getUserSavedSearches,
  saveSearch,
  unsaveSearch,
  updateSearchLastUsed,
  deleteSearchFromHistory,
  clearUserSearchHistory,
  getPopularSearches,
  getSearchSuggestions,
  getUserSearchSummary,
  type SearchQuery,
  type PopularSearch,
  type SearchSuggestion,
  type UserSearchHistory,
} from '../../lib/firebase/searches';

// ===== State Types =====

interface SearchesState {
  // البحث الحالي
  currentQuery: string;
  currentFilters: {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    wilaya?: string;
    size?: string;
  };
  currentSearchId: string | null;
  
  // تاريخ البحث
  recentSearches: SearchQuery[];
  recentSearchesLoading: boolean;
  recentSearchesError: string | null;
  
  // البحوثات المحفوظة
  savedSearches: SearchQuery[];
  savedSearchesLoading: boolean;
  savedSearchesError: string | null;
  
  // البحوثات الشائعة
  popularSearches: PopularSearch[];
  popularSearchesLoading: boolean;
  popularSearchesError: string | null;
  
  // الاقتراحات
  suggestions: SearchSuggestion[];
  suggestionsLoading: boolean;
  suggestionsError: string | null;
  
  // ملخص البحث
  searchSummary: UserSearchHistory | null;
  summaryLoading: boolean;
  summaryError: string | null;
  
  // عمليات التحديث
  updating: boolean;
  updateError: string | null;
  
  // إعدادات البحث
  settings: {
    saveSearchHistory: boolean;
    enableSuggestions: boolean;
    maxRecentSearches: number;
  };
}

const initialState: SearchesState = {
  currentQuery: '',
  currentFilters: {},
  currentSearchId: null,
  
  recentSearches: [],
  recentSearchesLoading: false,
  recentSearchesError: null,
  
  savedSearches: [],
  savedSearchesLoading: false,
  savedSearchesError: null,
  
  popularSearches: [],
  popularSearchesLoading: false,
  popularSearchesError: null,
  
  suggestions: [],
  suggestionsLoading: false,
  suggestionsError: null,
  
  searchSummary: null,
  summaryLoading: false,
  summaryError: null,
  
  updating: false,
  updateError: null,
  
  settings: {
    saveSearchHistory: true,
    enableSuggestions: true,
    maxRecentSearches: 20,
  },
};

// ===== Async Thunks =====

/**
 * تسجيل بحث جديد
 */
export const recordSearchThunk = createAsyncThunk(
  'searches/recordSearch',
  async (searchData: {
    userId?: string;
    searchTerm: string;
    filters?: SearchesState['currentFilters'];
    resultsCount: number;
    searchType?: 'quick' | 'advanced' | 'saved';
    searchSource?: 'homepage' | 'listings' | 'navbar' | 'filters';
    sessionId?: string;
    deviceInfo?: {
      userAgent: string;
      screen: string;
      language: string;
    };
  }) => {
    const searchId = await recordSearch(searchData);
    return { searchId, ...searchData };
  }
);

/**
 * تسجيل النقر على نتيجة بحث
 */
export const recordSearchClickThunk = createAsyncThunk(
  'searches/recordClick',
  async ({ searchId, listingId }: { searchId: string; listingId: string }) => {
    await recordSearchClick(searchId, listingId);
    return { searchId, listingId };
  }
);

/**
 * جلب تاريخ البحث
 */
export const fetchRecentSearchesThunk = createAsyncThunk(
  'searches/fetchRecentSearches',
  async ({ userId, limit = 20 }: { userId: string; limit?: number }) => {
    return await getUserSearchHistory(userId, limit);
  }
);

/**
 * جلب البحوثات المحفوظة
 */
export const fetchSavedSearchesThunk = createAsyncThunk(
  'searches/fetchSavedSearches',
  async (userId: string) => {
    return await getUserSavedSearches(userId);
  }
);

/**
 * حفظ بحث
 */
export const saveSearchThunk = createAsyncThunk(
  'searches/saveSearch',
  async ({
    searchId,
    savedName,
    notificationsEnabled = false,
  }: {
    searchId: string;
    savedName: string;
    notificationsEnabled?: boolean;
  }) => {
    await saveSearch(searchId, savedName, notificationsEnabled);
    return { searchId, savedName, notificationsEnabled };
  }
);

/**
 * إلغاء حفظ بحث
 */
export const unsaveSearchThunk = createAsyncThunk(
  'searches/unsaveSearch',
  async (searchId: string) => {
    await unsaveSearch(searchId);
    return searchId;
  }
);

/**
 * تحديث آخر استخدام
 */
export const updateSearchLastUsedThunk = createAsyncThunk(
  'searches/updateLastUsed',
  async (searchId: string) => {
    await updateSearchLastUsed(searchId);
    return searchId;
  }
);

/**
 * حذف بحث من التاريخ
 */
export const deleteSearchThunk = createAsyncThunk(
  'searches/deleteSearch',
  async (searchId: string) => {
    await deleteSearchFromHistory(searchId);
    return searchId;
  }
);

/**
 * مسح تاريخ البحث
 */
export const clearSearchHistoryThunk = createAsyncThunk(
  'searches/clearHistory',
  async (userId: string) => {
    await clearUserSearchHistory(userId);
    return true;
  }
);

/**
 * جلب البحوثات الشائعة
 */
export const fetchPopularSearchesThunk = createAsyncThunk(
  'searches/fetchPopularSearches',
  async (limit: number = 10) => {
    return await getPopularSearches(limit);
  }
);

/**
 * جلب اقتراحات البحث
 */
export const fetchSearchSuggestionsThunk = createAsyncThunk(
  'searches/fetchSuggestions',
  async ({ query, limit = 5 }: { query: string; limit?: number }) => {
    return await getSearchSuggestions(query, limit);
  }
);

/**
 * جلب ملخص البحث
 */
export const fetchSearchSummaryThunk = createAsyncThunk(
  'searches/fetchSummary',
  async (userId: string) => {
    return await getUserSearchSummary(userId);
  }
);

// ===== Slice Definition =====

const searchesSlice = createSlice({
  name: 'searches',
  initialState,
  reducers: {
    // تحديث البحث الحالي
    setCurrentSearch: (
      state,
      action: PayloadAction<{
        query: string;
        filters?: SearchesState['currentFilters'];
      }>
    ) => {
      state.currentQuery = action.payload.query;
      if (action.payload.filters) {
        state.currentFilters = { ...state.currentFilters, ...action.payload.filters };
      }
    },
    
    // تعيين معرف البحث الحالي
    setCurrentSearchId: (state, action: PayloadAction<string>) => {
      state.currentSearchId = action.payload;
    },
    
    // مسح البحث الحالي
    clearCurrentSearch: (state) => {
      state.currentQuery = '';
      state.currentFilters = {};
      state.currentSearchId = null;
    },
    
    // تحديث فلاتر البحث
    updateSearchFilters: (
      state,
      action: PayloadAction<Partial<SearchesState['currentFilters']>>
    ) => {
      state.currentFilters = { ...state.currentFilters, ...action.payload };
    },
    
    // مسح فلاتر البحث
    clearSearchFilters: (state) => {
      state.currentFilters = {};
    },
    
    // مسح الاقتراحات
    clearSuggestions: (state) => {
      state.suggestions = [];
      state.suggestionsError = null;
    },
    
    // إضافة بحث للتاريخ محلياً (للتحديث الفوري)
    addRecentSearchLocally: (state, action: PayloadAction<SearchQuery>) => {
      // إزالة البحث إذا كان موجوداً مسبقاً
      state.recentSearches = state.recentSearches.filter(
        search => search.searchTerm !== action.payload.searchTerm ||
                  JSON.stringify(search.filters) !== JSON.stringify(action.payload.filters)
      );
      
      // إضافة البحث في المقدمة
      state.recentSearches = [action.payload, ...state.recentSearches];
      
      // الاحتفاظ بالحد الأقصى
      if (state.recentSearches.length > state.settings.maxRecentSearches) {
        state.recentSearches = state.recentSearches.slice(0, state.settings.maxRecentSearches);
      }
    },
    
    // تحديث إعدادات البحث
    updateSearchSettings: (
      state,
      action: PayloadAction<Partial<SearchesState['settings']>>
    ) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    
    // مسح الأخطاء
    clearSearchErrors: (state) => {
      state.recentSearchesError = null;
      state.savedSearchesError = null;
      state.popularSearchesError = null;
      state.suggestionsError = null;
      state.summaryError = null;
      state.updateError = null;
    },
    
    // إعادة تعيين حالة البحث
    resetSearchesState: (state) => {
      state.currentQuery = '';
      state.currentFilters = {};
      state.currentSearchId = null;
      state.recentSearches = [];
      state.savedSearches = [];
      state.popularSearches = [];
      state.suggestions = [];
      state.searchSummary = null;
      state.recentSearchesError = null;
      state.savedSearchesError = null;
      state.popularSearchesError = null;
      state.suggestionsError = null;
      state.summaryError = null;
      state.updateError = null;
    },
  },
  extraReducers: (builder) => {
    // تسجيل البحث
    builder
      .addCase(recordSearchThunk.fulfilled, (state, action) => {
        state.currentSearchId = action.payload.searchId;
        
        // إضافة البحث للتاريخ الأخير إذا كان هناك معرف مستخدم
        if (action.payload.userId && state.settings.saveSearchHistory) {
          const newSearch: SearchQuery = {
            id: action.payload.searchId,
            userId: action.payload.userId,
            searchTerm: action.payload.searchTerm,
            filters: action.payload.filters || {},
            resultsCount: action.payload.resultsCount,
            clickedResults: [],
            searchType: action.payload.searchType || 'quick',
            searchSource: action.payload.searchSource || 'homepage',
            createdAt: new Date().toISOString(),
            isSaved: false,
            notificationsEnabled: false,
          };
          
          searchesSlice.caseReducers.addRecentSearchLocally(state, { 
            type: 'searches/addRecentSearchLocally', 
            payload: newSearch 
          });
        }
      });

    // جلب التاريخ الأخير
    builder
      .addCase(fetchRecentSearchesThunk.pending, (state) => {
        state.recentSearchesLoading = true;
        state.recentSearchesError = null;
      })
      .addCase(fetchRecentSearchesThunk.fulfilled, (state, action) => {
        state.recentSearchesLoading = false;
        state.recentSearches = action.payload;
        state.recentSearchesError = null;
      })
      .addCase(fetchRecentSearchesThunk.rejected, (state, action) => {
        state.recentSearchesLoading = false;
        state.recentSearchesError = action.error.message || 'فشل في جلب تاريخ البحث';
      });

    // جلب البحوثات المحفوظة
    builder
      .addCase(fetchSavedSearchesThunk.pending, (state) => {
        state.savedSearchesLoading = true;
        state.savedSearchesError = null;
      })
      .addCase(fetchSavedSearchesThunk.fulfilled, (state, action) => {
        state.savedSearchesLoading = false;
        state.savedSearches = action.payload;
        state.savedSearchesError = null;
      })
      .addCase(fetchSavedSearchesThunk.rejected, (state, action) => {
        state.savedSearchesLoading = false;
        state.savedSearchesError = action.error.message || 'فشل في جلب البحوثات المحفوظة';
      });

    // حفظ البحث
    builder
      .addCase(saveSearchThunk.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(saveSearchThunk.fulfilled, (state, action) => {
        state.updating = false;
        
        // تحديث البحث في التاريخ الأخير
        const searchIndex = state.recentSearches.findIndex(
          search => search.id === action.payload.searchId
        );
        
        if (searchIndex !== -1) {
          const existing = state.recentSearches[searchIndex];
          if (existing) {
            existing.isSaved = true;
            existing.savedName = action.payload.savedName;
            existing.notificationsEnabled = action.payload.notificationsEnabled;
            existing.lastUsed = new Date().toISOString();
            state.savedSearches.unshift(existing);
            state.recentSearches.splice(searchIndex, 1);
          }
        }
        
        state.updateError = null;
      })
      .addCase(saveSearchThunk.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.error.message || 'فشل في حفظ البحث';
      });

    // إلغاء حفظ البحث
    builder
      .addCase(unsaveSearchThunk.fulfilled, (state, action) => {
        // إزالة البحث من المحفوظ وإضافته للتاريخ
        const searchIndex = state.savedSearches.findIndex(
          search => search.id === action.payload
        );
        
        if (searchIndex !== -1) {
          const existing = state.savedSearches[searchIndex];
          if (existing) {
            existing.isSaved = false;
            existing.notificationsEnabled = false;
            delete existing.savedName;
            state.recentSearches.unshift(existing);
            state.savedSearches.splice(searchIndex, 1);
          }
        }
      });

    // حذف البحث
    builder
      .addCase(deleteSearchThunk.fulfilled, (state, action) => {
        // إزالة البحث من التاريخ
        state.recentSearches = state.recentSearches.filter(
          search => search.id !== action.payload
        );
        
        // إزالة من المحفوظ أيضاً إن وُجد
        state.savedSearches = state.savedSearches.filter(
          search => search.id !== action.payload
        );
      });

    // مسح التاريخ
    builder
      .addCase(clearSearchHistoryThunk.fulfilled, (state) => {
        state.recentSearches = [];
      });

    // جلب البحوثات الشائعة
    builder
      .addCase(fetchPopularSearchesThunk.pending, (state) => {
        state.popularSearchesLoading = true;
        state.popularSearchesError = null;
      })
      .addCase(fetchPopularSearchesThunk.fulfilled, (state, action) => {
        state.popularSearchesLoading = false;
        state.popularSearches = action.payload;
        state.popularSearchesError = null;
      })
      .addCase(fetchPopularSearchesThunk.rejected, (state, action) => {
        state.popularSearchesLoading = false;
        state.popularSearchesError = action.error.message || 'فشل في جلب البحوثات الشائعة';
      });

    // جلب الاقتراحات
    builder
      .addCase(fetchSearchSuggestionsThunk.pending, (state) => {
        state.suggestionsLoading = true;
        state.suggestionsError = null;
      })
      .addCase(fetchSearchSuggestionsThunk.fulfilled, (state, action) => {
        state.suggestionsLoading = false;
        state.suggestions = action.payload;
        state.suggestionsError = null;
      })
      .addCase(fetchSearchSuggestionsThunk.rejected, (state, action) => {
        state.suggestionsLoading = false;
        state.suggestionsError = action.error.message || 'فشل في جلب اقتراحات البحث';
      });

    // جلب الملخص
    builder
      .addCase(fetchSearchSummaryThunk.pending, (state) => {
        state.summaryLoading = true;
        state.summaryError = null;
      })
      .addCase(fetchSearchSummaryThunk.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.searchSummary = action.payload;
        
        // تحديث البيانات المحلية من الملخص
        if (action.payload.recentSearches.length > 0) {
          state.recentSearches = action.payload.recentSearches;
        }
        if (action.payload.savedSearches.length > 0) {
          state.savedSearches = action.payload.savedSearches;
        }
        if (action.payload.popularTerms.length > 0) {
          state.popularSearches = action.payload.popularTerms;
        }
        
        state.summaryError = null;
      })
      .addCase(fetchSearchSummaryThunk.rejected, (state, action) => {
        state.summaryLoading = false;
        state.summaryError = action.error.message || 'فشل في جلب ملخص البحث';
      });
  },
});

// ===== Actions & Selectors =====

export const {
  setCurrentSearch,
  setCurrentSearchId,
  clearCurrentSearch,
  updateSearchFilters,
  clearSearchFilters,
  clearSuggestions,
  addRecentSearchLocally,
  updateSearchSettings,
  clearSearchErrors,
  resetSearchesState,
} = searchesSlice.actions;

// Selectors
export const selectSearches = (state: { searches: SearchesState }) => state.searches;

export const selectCurrentSearch = (state: { searches: SearchesState }) => ({
  query: state.searches.currentQuery,
  filters: state.searches.currentFilters,
  searchId: state.searches.currentSearchId,
});

export const selectRecentSearches = (state: { searches: SearchesState }) =>
  state.searches.recentSearches;

export const selectSavedSearches = (state: { searches: SearchesState }) =>
  state.searches.savedSearches;

export const selectPopularSearches = (state: { searches: SearchesState }) =>
  state.searches.popularSearches;

export const selectSearchSuggestions = (state: { searches: SearchesState }) =>
  state.searches.suggestions;

export const selectSearchSummary = (state: { searches: SearchesState }) =>
  state.searches.searchSummary;

export const selectSearchSettings = (state: { searches: SearchesState }) =>
  state.searches.settings;

export const selectSearchLoading = (state: { searches: SearchesState }) =>
  state.searches.recentSearchesLoading ||
  state.searches.savedSearchesLoading ||
  state.searches.popularSearchesLoading ||
  state.searches.suggestionsLoading ||
  state.searches.summaryLoading ||
  state.searches.updating;

export const selectHasActiveFilters = (state: { searches: SearchesState }) =>
  Object.keys(state.searches.currentFilters).length > 0;

export const selectActiveFiltersCount = (state: { searches: SearchesState }) =>
  Object.values(state.searches.currentFilters).filter(value => 
    value !== undefined && value !== null && value !== ''
  ).length;

export default searchesSlice.reducer;