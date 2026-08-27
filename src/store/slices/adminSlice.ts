/**
 * Redux Slice for Admin Functions
 * إدارة حالة وظائف الإدارة
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import {
  getAllUsers,
  changeUserRole,
  suspendUser,
  unsuspendUser,
  deleteUser,
  approveListing,
  rejectListing,
  getAdminStats,
  getAdminListings,
  setAdminListingStatus,
  type AdminUser,
  type AdminStats,
} from '../../lib/firebase/admin';
import type { UserRole } from '../../lib/auth/permissions';
import type { AuthUser } from '../../lib/firebase/auth';
import type { Listing } from '../../lib/data/mock';

// ===== State Types =====

interface AdminState {
  // إدارة المستخدمين
  users: AdminUser[];
  usersLoading: boolean;
  usersError: string | null;
  usersPagination: {
    lastDoc: any;
    hasMore: boolean;
  };
  
  // تحديث المستخدمين
  updatingUser: boolean;
  updateUserError: string | null;
  
  // إحصائيات الإدارة
  stats: AdminStats | null;
  statsLoading: boolean;
  statsError: string | null;
  
  // إدارة الإعلانات
  listings: Listing[];
  listingsLoading: boolean;
  listingsError: string | null;
  listingsStatusFilter: string;
  moderatingListing: boolean;
  moderationError: string | null;
  
  // الفلاتر والبحث
  filters: {
    role?: UserRole;
    status?: string;
    searchQuery?: string;
    sortBy?: 'memberSince' | 'lastLoginAt' | 'listingsCount';
    sortOrder?: 'asc' | 'desc';
  };
  
  // المستخدم المحدد حالياً
  selectedUser: AdminUser | null;
  
  // سجل الأنشطة (مستقبلاً)
  activityLog: any[];
  activityLoading: boolean;
}

const initialState: AdminState = {
  users: [],
  usersLoading: false,
  usersError: null,
  usersPagination: {
    lastDoc: null,
    hasMore: false,
  },
  
  updatingUser: false,
  updateUserError: null,
  
  stats: null,
  statsLoading: false,
  statsError: null,
  
  listings: [],
  listingsLoading: false,
  listingsError: null,
  listingsStatusFilter: 'pending',
  moderatingListing: false,
  moderationError: null,
  
  filters: {
    sortBy: 'memberSince',
    sortOrder: 'desc',
  },
  
  selectedUser: null,
  
  activityLog: [],
  activityLoading: false,
};

// ===== Async Thunks =====

/**
 * جلب جميع المستخدمين
 */
export const fetchAllUsersThunk = createAsyncThunk(
  'admin/fetchAllUsers',
  async (
    {
      currentUser,
      options,
      loadMore = false,
    }: {
      currentUser: AuthUser;
      options?: {
        limit?: number;
        role?: UserRole;
        status?: string;
        searchQuery?: string;
        sortBy?: 'memberSince' | 'lastLoginAt' | 'listingsCount';
        sortOrder?: 'asc' | 'desc';
      };
      loadMore?: boolean;
    },
    { getState }
  ) => {
    const state = getState() as { admin: AdminState };
    
    const requestOptions = {
      ...options,
      lastDoc: loadMore ? state.admin.usersPagination.lastDoc : undefined,
    };
    
    const result = await getAllUsers(currentUser, requestOptions);
    return { ...result, loadMore };
  }
);

/**
 * تغيير دور المستخدم
 */
export const changeUserRoleThunk = createAsyncThunk(
  'admin/changeUserRole',
  async ({
    currentUser,
    targetUserId,
    newRole,
    reason,
  }: {
    currentUser: AuthUser;
    targetUserId: string;
    newRole: UserRole;
    reason?: string;
  }) => {
    await changeUserRole(currentUser, targetUserId, newRole, reason);
    return { targetUserId, newRole };
  }
);

/**
 * تعليق المستخدم
 */
export const suspendUserThunk = createAsyncThunk(
  'admin/suspendUser',
  async ({
    currentUser,
    targetUserId,
    reason,
    duration,
  }: {
    currentUser: AuthUser;
    targetUserId: string;
    reason: string;
    duration?: number;
  }) => {
    await suspendUser(currentUser, targetUserId, reason, duration);
    return { targetUserId };
  }
);

/**
 * إلغاء تعليق المستخدم
 */
export const unsuspendUserThunk = createAsyncThunk(
  'admin/unsuspendUser',
  async ({
    currentUser,
    targetUserId,
  }: {
    currentUser: AuthUser;
    targetUserId: string;
  }) => {
    await unsuspendUser(currentUser, targetUserId);
    return { targetUserId };
  }
);

/**
 * حذف المستخدم
 */
export const deleteUserThunk = createAsyncThunk(
  'admin/deleteUser',
  async ({
    currentUser,
    targetUserId,
    reason,
  }: {
    currentUser: AuthUser;
    targetUserId: string;
    reason: string;
  }) => {
    await deleteUser(currentUser, targetUserId, reason);
    return { targetUserId };
  }
);

/**
 * الموافقة على إعلان
 */
export const approveListingThunk = createAsyncThunk(
  'admin/approveListing',
  async ({
    currentUser,
    listingId,
    shouldFeature,
  }: {
    currentUser: AuthUser;
    listingId: string;
    shouldFeature?: boolean;
  }) => {
    await approveListing(currentUser, listingId, shouldFeature);
    return { listingId, approved: true, featured: shouldFeature };
  }
);

/**
 * رفض إعلان
 */
export const rejectListingThunk = createAsyncThunk(
  'admin/rejectListing',
  async ({
    currentUser,
    listingId,
    reason,
  }: {
    currentUser: AuthUser;
    listingId: string;
    reason: string;
  }) => {
    await rejectListing(currentUser, listingId, reason);
    return { listingId, approved: false, reason };
  }
);

/**
 * جلب إعلانات الإدارة
 */
export const fetchAdminListingsThunk = createAsyncThunk(
  'admin/fetchListings',
  async ({
    currentUser,
    status,
    searchQuery,
  }: {
    currentUser: AuthUser;
    status?: string;
    searchQuery?: string;
  }) => {
    return await getAdminListings(currentUser, { status, searchQuery, limit: 100 });
  }
);

/**
 * إيقاف / تفعيل إعلان
 */
export const setAdminListingStatusThunk = createAsyncThunk(
  'admin/setListingStatus',
  async ({
    currentUser,
    listingId,
    status,
  }: {
    currentUser: AuthUser;
    listingId: string;
    status: 'active' | 'inactive';
  }) => {
    await setAdminListingStatus(currentUser, listingId, status);
    return { listingId, status };
  }
);

/**
 * جلب إحصائيات الإدارة
 */
export const fetchAdminStatsThunk = createAsyncThunk(
  'admin/fetchStats',
  async (currentUser: AuthUser) => {
    return await getAdminStats(currentUser);
  }
);

// ===== Slice Definition =====

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    // تعيين الفلاتر
    setFilters: (
      state,
      action: PayloadAction<Partial<AdminState['filters']>>
    ) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    // مسح الفلاتر
    clearFilters: (state) => {
      state.filters = {
        sortBy: 'memberSince',
        sortOrder: 'desc',
      };
    },
    
    // تعيين المستخدم المحدد
    setSelectedUser: (state, action: PayloadAction<AdminUser | null>) => {
      state.selectedUser = action.payload;
    },
    
    // تحديث المستخدم محلياً
    updateUserLocally: (
      state,
      action: PayloadAction<{ userId: string; updates: Partial<AdminUser> }>
    ) => {
      const { userId, updates } = action.payload;
      
      // تحديث في قائمة المستخدمين
      const userIndex = state.users.findIndex(user => user.id === userId);
      const user = state.users[userIndex];
      if (user) Object.assign(user, updates);
      
      // تحديث المستخدم المحدد
      if (state.selectedUser && state.selectedUser.id === userId) {
        Object.assign(state.selectedUser, updates);
      }
    },
    
    // إزالة المستخدم محلياً
    removeUserLocally: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      
      // إزالة من قائمة المستخدمين
      state.users = state.users.filter(user => user.id !== userId);
      
      // مسح المستخدم المحدد إذا كان هو نفسه
      if (state.selectedUser && state.selectedUser.id === userId) {
        state.selectedUser = null;
      }
    },
    
    // مسح الأخطاء
    clearAdminErrors: (state) => {
      state.usersError = null;
      state.updateUserError = null;
      state.statsError = null;
      state.moderationError = null;
      state.listingsError = null;
    },

    setListingsStatusFilter: (state, action: PayloadAction<string>) => {
      state.listingsStatusFilter = action.payload;
    },
    
    // إعادة تعيين الترقيم
    resetPagination: (state) => {
      state.usersPagination = {
        lastDoc: null,
        hasMore: false,
      };
    },
    
    // إعادة تعيين حالة الإدارة
    resetAdminState: (state) => {
      state.users = [];
      state.selectedUser = null;
      state.stats = null;
      state.listings = [];
      state.activityLog = [];
      state.usersError = null;
      state.updateUserError = null;
      state.statsError = null;
      state.moderationError = null;
      state.listingsError = null;
      state.usersPagination = {
        lastDoc: null,
        hasMore: false,
      };
    },
  },
  extraReducers: (builder) => {
    // جلب المستخدمين
    builder
      .addCase(fetchAllUsersThunk.pending, (state) => {
        state.usersLoading = true;
        state.usersError = null;
      })
      .addCase(fetchAllUsersThunk.fulfilled, (state, action) => {
        state.usersLoading = false;
        const { users, lastDoc, hasMore, loadMore } = action.payload;
        
        if (loadMore) {
          // إضافة المزيد من المستخدمين
          state.users = [...state.users, ...users];
        } else {
          // استبدال المستخدمين
          state.users = users;
        }
        
        state.usersPagination = {
          lastDoc,
          hasMore,
        };
        state.usersError = null;
      })
      .addCase(fetchAllUsersThunk.rejected, (state, action) => {
        state.usersLoading = false;
        state.usersError = action.error.message || 'فشل في جلب المستخدمين';
      });

    // تغيير الدور
    builder
      .addCase(changeUserRoleThunk.pending, (state) => {
        state.updatingUser = true;
        state.updateUserError = null;
      })
      .addCase(changeUserRoleThunk.fulfilled, (state, action) => {
        state.updatingUser = false;
        const { targetUserId, newRole } = action.payload;
        
        adminSlice.caseReducers.updateUserLocally(state, {
          type: 'admin/updateUserLocally',
          payload: { userId: targetUserId, updates: { role: newRole } },
        });
        
        state.updateUserError = null;
      })
      .addCase(changeUserRoleThunk.rejected, (state, action) => {
        state.updatingUser = false;
        state.updateUserError = action.error.message || 'فشل في تغيير دور المستخدم';
      });

    // تعليق المستخدم
    builder
      .addCase(suspendUserThunk.pending, (state) => {
        state.updatingUser = true;
        state.updateUserError = null;
      })
      .addCase(suspendUserThunk.fulfilled, (state, action) => {
        state.updatingUser = false;
        const { targetUserId } = action.payload;
        
        adminSlice.caseReducers.updateUserLocally(state, {
          type: 'admin/updateUserLocally',
          payload: { userId: targetUserId, updates: { accountStatus: 'suspended' } },
        });
        
        state.updateUserError = null;
      })
      .addCase(suspendUserThunk.rejected, (state, action) => {
        state.updatingUser = false;
        state.updateUserError = action.error.message || 'فشل في تعليق المستخدم';
      });

    // إلغاء التعليق
    builder
      .addCase(unsuspendUserThunk.fulfilled, (state, action) => {
        const { targetUserId } = action.payload;
        
        adminSlice.caseReducers.updateUserLocally(state, {
          type: 'admin/updateUserLocally',
          payload: { userId: targetUserId, updates: { accountStatus: 'active' } },
        });
      });

    // حذف المستخدم (ناعم)
    builder
      .addCase(deleteUserThunk.fulfilled, (state, action) => {
        const { targetUserId } = action.payload;
        
        adminSlice.caseReducers.updateUserLocally(state, {
          type: 'admin/updateUserLocally',
          payload: { userId: targetUserId, updates: { accountStatus: 'deleted' } },
        });
      });

    // الموافقة على الإعلان
    builder
      .addCase(approveListingThunk.pending, (state) => {
        state.moderatingListing = true;
        state.moderationError = null;
      })
      .addCase(approveListingThunk.fulfilled, (state, action) => {
        state.moderatingListing = false;
        state.moderationError = null;
        state.listings = state.listings.filter((l) => l.id !== action.payload.listingId);
      })
      .addCase(approveListingThunk.rejected, (state, action) => {
        state.moderatingListing = false;
        state.moderationError = action.error.message || 'فشل في الموافقة على الإعلان';
      });

    // رفض الإعلان
    builder
      .addCase(rejectListingThunk.pending, (state) => {
        state.moderatingListing = true;
        state.moderationError = null;
      })
      .addCase(rejectListingThunk.fulfilled, (state, action) => {
        state.moderatingListing = false;
        state.moderationError = null;
        state.listings = state.listings.filter((l) => l.id !== action.payload.listingId);
      })
      .addCase(rejectListingThunk.rejected, (state, action) => {
        state.moderatingListing = false;
        state.moderationError = action.error.message || 'فشل في رفض الإعلان';
      });

    // جلب إعلانات الإدارة
    builder
      .addCase(fetchAdminListingsThunk.pending, (state) => {
        state.listingsLoading = true;
        state.listingsError = null;
      })
      .addCase(fetchAdminListingsThunk.fulfilled, (state, action) => {
        state.listingsLoading = false;
        state.listings = action.payload;
        state.listingsError = null;
      })
      .addCase(fetchAdminListingsThunk.rejected, (state, action) => {
        state.listingsLoading = false;
        state.listingsError = action.error.message || 'فشل في جلب الإعلانات';
      });

    builder
      .addCase(setAdminListingStatusThunk.pending, (state) => {
        state.moderatingListing = true;
        state.moderationError = null;
      })
      .addCase(setAdminListingStatusThunk.fulfilled, (state, action) => {
        state.moderatingListing = false;
        const { listingId, status } = action.payload;
        const item = state.listings.find((l) => l.id === listingId);
        if (item) item.status = status;
        if (state.listingsStatusFilter !== 'all' && state.listingsStatusFilter !== status) {
          state.listings = state.listings.filter((l) => l.id !== listingId);
        }
      })
      .addCase(setAdminListingStatusThunk.rejected, (state, action) => {
        state.moderatingListing = false;
        state.moderationError = action.error.message || 'فشل في تحديث حالة الإعلان';
      });

    // جلب الإحصائيات
    builder
      .addCase(fetchAdminStatsThunk.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(fetchAdminStatsThunk.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload;
        state.statsError = null;
      })
      .addCase(fetchAdminStatsThunk.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.error.message || 'فشل في جلب الإحصائيات';
      });
  },
});

// ===== Actions & Selectors =====

export const {
  setFilters,
  clearFilters,
  setSelectedUser,
  updateUserLocally,
  removeUserLocally,
  clearAdminErrors,
  setListingsStatusFilter,
  resetPagination,
  resetAdminState,
} = adminSlice.actions;

// Selectors
export const selectAdmin = (state: { admin: AdminState }) => state.admin;

export const selectAdminUsers = (state: { admin: AdminState }) =>
  state.admin.users;

export const selectSelectedUser = (state: { admin: AdminState }) =>
  state.admin.selectedUser;

export const selectAdminStats = (state: { admin: AdminState }) =>
  state.admin.stats;

export const selectAdminListings = (state: { admin: AdminState }) =>
  state.admin.listings;

export const selectAdminListingsLoading = (state: { admin: AdminState }) =>
  state.admin.listingsLoading;

export const selectAdminFilters = (state: { admin: AdminState }) =>
  state.admin.filters;

export const selectUsersLoading = (state: { admin: AdminState }) =>
  state.admin.usersLoading;

export const selectUpdatingUser = (state: { admin: AdminState }) =>
  state.admin.updatingUser;

export const selectStatsLoading = (state: { admin: AdminState }) =>
  state.admin.statsLoading;

export const selectUsersPagination = (state: { admin: AdminState }) =>
  state.admin.usersPagination;

// محددات مفلترة
export const selectFilteredUsers = (state: { admin: AdminState }) => {
  const { users, filters } = state.admin;
  let filtered = [...users];
  
  // تطبيق فلتر الدور
  if (filters.role) {
    filtered = filtered.filter(user => user.role === filters.role);
  }
  
  // تطبيق فلتر الحالة
  if (filters.status) {
    filtered = filtered.filter(user => user.accountStatus === filters.status);
  }
  
  // تطبيق البحث النصي
  if (filters.searchQuery) {
    const searchTerm = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(user =>
      user.displayName.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      user.phoneNumber.includes(searchTerm) ||
      user.wilaya.toLowerCase().includes(searchTerm)
    );
  }
  
  return filtered;
};

export const selectAdminErrors = (state: { admin: AdminState }) => ({
  users: state.admin.usersError,
  updateUser: state.admin.updateUserError,
  stats: state.admin.statsError,
  moderation: state.admin.moderationError,
});

export const selectHasUsers = (state: { admin: AdminState }) =>
  state.admin.users.length > 0;

export const selectCanLoadMore = (state: { admin: AdminState }) =>
  state.admin.usersPagination.hasMore && !state.admin.usersLoading;

export default adminSlice.reducer;