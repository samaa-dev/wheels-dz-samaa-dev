import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import {
  signInWithEmail,
  registerWithEmail,
  signInWithGoogle,
  signOutUser,
  sendPasswordReset,
  getUserProfile,
  updateUserProfile,
  type AuthUser,
  type RegisterProfileInput,
} from '../../lib/firebase/auth';

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  hydrated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  hydrated: false,
  loading: false,
  error: null,
};

// Async thunks
export const loginWithEmailThunk = createAsyncThunk(
  'auth/loginWithEmail',
  async ({ email, password }: { email: string; password: string }) => {
    return await signInWithEmail(email, password);
  }
);

export const registerWithEmailThunk = createAsyncThunk(
  'auth/registerWithEmail',
  async ({
    email,
    password,
    profile,
  }: {
    email: string;
    password: string;
    profile: RegisterProfileInput;
  }) => {
    return await registerWithEmail(email, password, profile);
  }
);

export const loginWithGoogleThunk = createAsyncThunk('auth/loginWithGoogle', async () => {
  return await signInWithGoogle();
});

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  await signOutUser();
});

export const sendPasswordResetThunk = createAsyncThunk(
  'auth/sendPasswordReset',
  async (email: string) => {
    await sendPasswordReset(email);
  }
);

export const updateProfileThunk = createAsyncThunk(
  'auth/updateProfile',
  async (updates: Partial<AuthUser>, { getState }) => {
    const state = getState() as { auth: AuthState };
    if (!state.auth.user) {
      throw new Error('المستخدم غير مسجل');
    }
    
    await updateUserProfile(state.auth.user.id, updates);
    const next = { ...state.auth.user, ...updates };
    if (updates.name) next.displayName = updates.name;
    if (updates.displayName) next.name = updates.displayName;
    if (updates.phone) next.phoneNumber = updates.phone;
    if (updates.phoneNumber) next.phone = updates.phoneNumber;
    return next;
  }
);

export const hydrateUserThunk = createAsyncThunk(
  'auth/hydrateUser',
  async (uid: string) => {
    // Don't throw when profile is missing (race during first Google signup)
    const profile = await getUserProfile(uid, false);
    if (
      profile &&
      (profile.accountStatus === 'deleted' || profile.accountStatus === 'suspended')
    ) {
      await signOutUser();
      return null;
    }
    return profile;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setHydrated: (state, action: PayloadAction<boolean>) => {
      state.hydrated = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearUser: (state) => {
      state.user = null;
    },
  },
  extraReducers: (builder) => {
    // Login with email
    builder
      .addCase(loginWithEmailThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithEmailThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loginWithEmailThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'حدث خطأ أثناء تسجيل الدخول';
      });

    // Register with email
    builder
      .addCase(registerWithEmailThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerWithEmailThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(registerWithEmailThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'حدث خطأ أثناء إنشاء الحساب';
      });

    // Login with Google
    builder
      .addCase(loginWithGoogleThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithGoogleThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loginWithGoogleThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'حدث خطأ أثناء تسجيل الدخول بجوجل';
      });

    // Logout
    builder
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.error = null;
      });

    // Send password reset
    builder
      .addCase(sendPasswordResetThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendPasswordResetThunk.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(sendPasswordResetThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'حدث خطأ أثناء إرسال رابط الاستعادة';
      });

    // Update profile
    builder
      .addCase(updateProfileThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'حدث خطأ أثناء تحديث الملف الشخصي';
      });

    // Hydrate user
    builder
      .addCase(hydrateUserThunk.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload;
        } else {
          state.user = null;
        }
        state.hydrated = true;
      })
      .addCase(hydrateUserThunk.rejected, (state) => {
        // Keep existing user if hydrate failed (e.g. race); only clear on logout
        state.hydrated = true;
      });
  },
});

export const { setHydrated, clearError, clearUser } = authSlice.actions;
export default authSlice.reducer;