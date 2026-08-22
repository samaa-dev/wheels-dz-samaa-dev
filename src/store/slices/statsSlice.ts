/**
 * Redux Slice for Stats
 * إدارة حالة الإحصائيات
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import {
  getDailyStats,
  getDateRangeStats,
  getPlatformSummary,
  getCategoryStats,
  getWilayaStats,
  getRecentStats,
  type DailyStats,
  type PlatformSummary,
  type CategoryStats,
  type WilayaStats,
} from '../../lib/firebase/stats';

// ===== State Types =====

interface StatsState {
  // الإحصائيات اليومية
  dailyStats: { [date: string]: DailyStats };
  dailyStatsLoading: boolean;
  dailyStatsError: string | null;
  
  // ملخص المنصة
  platformSummary: PlatformSummary | null;
  platformSummaryLoading: boolean;
  platformSummaryError: string | null;
  
  // إحصائيات الفئات
  categoryStats: CategoryStats[];
  categoryStatsLoading: boolean;
  categoryStatsError: string | null;
  
  // إحصائيات الولايات
  wilayaStats: WilayaStats[];
  wilayaStatsLoading: boolean;
  wilayaStatsError: string | null;
  
  // الإحصائيات الأخيرة
  recentStats: DailyStats[];
  recentStatsLoading: boolean;
  recentStatsError: string | null;
  
  // إحصائيات فترة زمنية
  dateRangeStats: DailyStats[];
  dateRangeLoading: boolean;
  dateRangeError: string | null;
  
  // آخر تحديث
  lastUpdated: string | null;
}

const initialState: StatsState = {
  dailyStats: {},
  dailyStatsLoading: false,
  dailyStatsError: null,
  
  platformSummary: null,
  platformSummaryLoading: false,
  platformSummaryError: null,
  
  categoryStats: [],
  categoryStatsLoading: false,
  categoryStatsError: null,
  
  wilayaStats: [],
  wilayaStatsLoading: false,
  wilayaStatsError: null,
  
  recentStats: [],
  recentStatsLoading: false,
  recentStatsError: null,
  
  dateRangeStats: [],
  dateRangeLoading: false,
  dateRangeError: null,
  
  lastUpdated: null,
};

// ===== Async Thunks =====

/**
 * جلب الإحصائيات اليومية
 */
export const fetchDailyStatsThunk = createAsyncThunk(
  'stats/fetchDailyStats',
  async (date: string) => {
    const stats = await getDailyStats(date);
    return { date, stats };
  }
);

/**
 * جلب إحصائيات فترة زمنية
 */
export const fetchDateRangeStatsThunk = createAsyncThunk(
  'stats/fetchDateRangeStats',
  async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
    return await getDateRangeStats(startDate, endDate);
  }
);

/**
 * جلب ملخص المنصة
 */
export const fetchPlatformSummaryThunk = createAsyncThunk(
  'stats/fetchPlatformSummary',
  async () => {
    return await getPlatformSummary();
  }
);

/**
 * جلب إحصائيات الفئات
 */
export const fetchCategoryStatsThunk = createAsyncThunk(
  'stats/fetchCategoryStats',
  async () => {
    return await getCategoryStats();
  }
);

/**
 * جلب إحصائيات الولايات
 */
export const fetchWilayaStatsThunk = createAsyncThunk(
  'stats/fetchWilayaStats',
  async () => {
    return await getWilayaStats();
  }
);

/**
 * جلب الإحصائيات الأخيرة
 */
export const fetchRecentStatsThunk = createAsyncThunk(
  'stats/fetchRecentStats',
  async (days: number = 7) => {
    return await getRecentStats(days);
  }
);

/**
 * جلب جميع الإحصائيات
 */
export const fetchAllStatsThunk = createAsyncThunk(
  'stats/fetchAllStats',
  async (_, { dispatch }) => {
    // تشغيل جميع عمليات جلب الإحصائيات في نفس الوقت
    const promises = [
      dispatch(fetchPlatformSummaryThunk()),
      dispatch(fetchCategoryStatsThunk()),
      dispatch(fetchWilayaStatsThunk()),
      dispatch(fetchRecentStatsThunk(7)),
    ];
    
    await Promise.all(promises);
    return new Date().toISOString();
  }
);

// ===== Slice Definition =====

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    // مسح أخطاء الإحصائيات
    clearStatsErrors: (state) => {
      state.dailyStatsError = null;
      state.platformSummaryError = null;
      state.categoryStatsError = null;
      state.wilayaStatsError = null;
      state.recentStatsError = null;
      state.dateRangeError = null;
    },
    
    // مسح إحصائيات فترة زمنية
    clearDateRangeStats: (state) => {
      state.dateRangeStats = [];
      state.dateRangeError = null;
    },
    
    // تحديث آخر وقت تحديث
    updateLastUpdated: (state) => {
      state.lastUpdated = new Date().toISOString();
    },
    
    // إضافة إحصائية يومية محلياً
    addDailyStatsLocally: (state, action: PayloadAction<DailyStats>) => {
      state.dailyStats[action.payload.date] = action.payload;
    },
    
    // تحديث إحصائية معينة محلياً
    updateStatsLocally: (state, action: PayloadAction<{
      type: 'views' | 'contacts' | 'favorites' | 'shares' | 'messages';
      increment: number;
    }>) => {
      const today = new Date().toISOString().slice(0, 10);
      const dayStats = state.dailyStats[today];
      if (dayStats) {
        const { type, increment } = action.payload;
        switch (type) {
          case 'views':
            dayStats.totalViews += increment;
            break;
          case 'contacts':
            dayStats.totalContacts += increment;
            break;
          case 'favorites':
            dayStats.favorites += increment;
            break;
          case 'shares':
            dayStats.shares += increment;
            break;
          case 'messages':
            dayStats.messages += increment;
            break;
        }
        dayStats.updatedAt = new Date().toISOString();
      }
    },
    
    // إعادة تعيين حالة الإحصائيات
    resetStatsState: (state) => {
      state.dailyStats = {};
      state.platformSummary = null;
      state.categoryStats = [];
      state.wilayaStats = [];
      state.recentStats = [];
      state.dateRangeStats = [];
      state.lastUpdated = null;
      state.dailyStatsError = null;
      state.platformSummaryError = null;
      state.categoryStatsError = null;
      state.wilayaStatsError = null;
      state.recentStatsError = null;
      state.dateRangeError = null;
    },
  },
  extraReducers: (builder) => {
    // جلب الإحصائيات اليومية
    builder
      .addCase(fetchDailyStatsThunk.pending, (state) => {
        state.dailyStatsLoading = true;
        state.dailyStatsError = null;
      })
      .addCase(fetchDailyStatsThunk.fulfilled, (state, action) => {
        state.dailyStatsLoading = false;
        state.dailyStatsError = null;
        const { date, stats } = action.payload;
        if (stats) {
          state.dailyStats[date] = stats;
        }
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDailyStatsThunk.rejected, (state, action) => {
        state.dailyStatsLoading = false;
        state.dailyStatsError = action.error.message || 'فشل في جلب الإحصائيات اليومية';
      });

    // جلب إحصائيات فترة زمنية
    builder
      .addCase(fetchDateRangeStatsThunk.pending, (state) => {
        state.dateRangeLoading = true;
        state.dateRangeError = null;
      })
      .addCase(fetchDateRangeStatsThunk.fulfilled, (state, action) => {
        state.dateRangeLoading = false;
        state.dateRangeError = null;
        state.dateRangeStats = action.payload;
        
        // إضافة الإحصائيات إلى dailyStats أيضاً
        action.payload.forEach(stats => {
          state.dailyStats[stats.date] = stats;
        });
        
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDateRangeStatsThunk.rejected, (state, action) => {
        state.dateRangeLoading = false;
        state.dateRangeError = action.error.message || 'فشل في جلب إحصائيات الفترة الزمنية';
      });

    // جلب ملخص المنصة
    builder
      .addCase(fetchPlatformSummaryThunk.pending, (state) => {
        state.platformSummaryLoading = true;
        state.platformSummaryError = null;
      })
      .addCase(fetchPlatformSummaryThunk.fulfilled, (state, action) => {
        state.platformSummaryLoading = false;
        state.platformSummaryError = null;
        state.platformSummary = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchPlatformSummaryThunk.rejected, (state, action) => {
        state.platformSummaryLoading = false;
        state.platformSummaryError = action.error.message || 'فشل في جلب ملخص المنصة';
      });

    // جلب إحصائيات الفئات
    builder
      .addCase(fetchCategoryStatsThunk.pending, (state) => {
        state.categoryStatsLoading = true;
        state.categoryStatsError = null;
      })
      .addCase(fetchCategoryStatsThunk.fulfilled, (state, action) => {
        state.categoryStatsLoading = false;
        state.categoryStatsError = null;
        state.categoryStats = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchCategoryStatsThunk.rejected, (state, action) => {
        state.categoryStatsLoading = false;
        state.categoryStatsError = action.error.message || 'فشل في جلب إحصائيات الفئات';
      });

    // جلب إحصائيات الولايات
    builder
      .addCase(fetchWilayaStatsThunk.pending, (state) => {
        state.wilayaStatsLoading = true;
        state.wilayaStatsError = null;
      })
      .addCase(fetchWilayaStatsThunk.fulfilled, (state, action) => {
        state.wilayaStatsLoading = false;
        state.wilayaStatsError = null;
        state.wilayaStats = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchWilayaStatsThunk.rejected, (state, action) => {
        state.wilayaStatsLoading = false;
        state.wilayaStatsError = action.error.message || 'فشل في جلب إحصائيات الولايات';
      });

    // جلب الإحصائيات الأخيرة
    builder
      .addCase(fetchRecentStatsThunk.pending, (state) => {
        state.recentStatsLoading = true;
        state.recentStatsError = null;
      })
      .addCase(fetchRecentStatsThunk.fulfilled, (state, action) => {
        state.recentStatsLoading = false;
        state.recentStatsError = null;
        state.recentStats = action.payload;
        
        // إضافة إلى dailyStats أيضاً
        action.payload.forEach(stats => {
          state.dailyStats[stats.date] = stats;
        });
        
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchRecentStatsThunk.rejected, (state, action) => {
        state.recentStatsLoading = false;
        state.recentStatsError = action.error.message || 'فشل في جلب الإحصائيات الأخيرة';
      });

    // جلب جميع الإحصائيات
    builder
      .addCase(fetchAllStatsThunk.fulfilled, (state, action) => {
        state.lastUpdated = action.payload;
      });
  },
});

// ===== Actions & Selectors =====

export const {
  clearStatsErrors,
  clearDateRangeStats,
  updateLastUpdated,
  addDailyStatsLocally,
  updateStatsLocally,
  resetStatsState,
} = statsSlice.actions;

// Selectors
export const selectStats = (state: { stats: StatsState }) => state.stats;

export const selectDailyStats = (state: { stats: StatsState }, date: string) =>
  state.stats.dailyStats[date] || null;

export const selectPlatformSummary = (state: { stats: StatsState }) =>
  state.stats.platformSummary;

export const selectCategoryStats = (state: { stats: StatsState }) =>
  state.stats.categoryStats;

export const selectWilayaStats = (state: { stats: StatsState }) =>
  state.stats.wilayaStats;

export const selectRecentStats = (state: { stats: StatsState }) =>
  state.stats.recentStats;

export const selectDateRangeStats = (state: { stats: StatsState }) =>
  state.stats.dateRangeStats;

export const selectStatsLoading = (state: { stats: StatsState }) =>
  state.stats.dailyStatsLoading ||
  state.stats.platformSummaryLoading ||
  state.stats.categoryStatsLoading ||
  state.stats.wilayaStatsLoading ||
  state.stats.recentStatsLoading ||
  state.stats.dateRangeLoading;

export const selectLastUpdated = (state: { stats: StatsState }) =>
  state.stats.lastUpdated;

// محددات للإحصائيات المحسوبة
export const selectTodayStats = (state: { stats: StatsState }) => {
  const today = new Date().toISOString().slice(0, 10);
  return state.stats.dailyStats[today] || null;
};

export const selectWeeklyGrowth = (state: { stats: StatsState }) => {
  const recentStats = state.stats.recentStats;
  if (recentStats.length < 2) return null;
  
  const today = recentStats[0];
  const weekAgo = recentStats[6] ?? recentStats[recentStats.length - 1];
  if (!today || !weekAgo) return null;
  
  return {
    users: ((today.newUsers - weekAgo.newUsers) / Math.max(weekAgo.newUsers, 1)) * 100,
    listings: ((today.newListings - weekAgo.newListings) / Math.max(weekAgo.newListings, 1)) * 100,
    views: ((today.totalViews - weekAgo.totalViews) / Math.max(weekAgo.totalViews, 1)) * 100,
  };
};

export const selectTopCategory = (state: { stats: StatsState }) => {
  const categories = state.stats.categoryStats;
  if (categories.length === 0) return null;
  
  return categories.reduce((prev, current) =>
    prev.totalListings > current.totalListings ? prev : current
  );
};

export const selectTopWilaya = (state: { stats: StatsState }) => {
  const wilayas = state.stats.wilayaStats;
  if (wilayas.length === 0) return null;
  
  return wilayas[0]; // مرتبة حسب totalListings desc
};

export default statsSlice.reducer;