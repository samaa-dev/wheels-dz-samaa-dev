/**
 * Enhanced LocalStorage Management
 * إدارة التخزين المحلي المحسن
 */

// ===== Types & Interfaces =====

export type StorageKey = 
  // User Preferences
  | 'user_preferences'
  | 'user_settings'
  | 'user_theme'
  | 'user_language'
  
  // Search & Filters
  | 'recent_searches'
  | 'saved_searches'
  | 'active_filters'
  | 'search_suggestions'
  
  // Form Drafts
  | 'listing_draft'
  | 'profile_draft'
  | 'message_draft'
  
  // UI State
  | 'sidebar_collapsed'
  | 'table_columns'
  | 'sort_preferences'
  | 'view_mode'
  
  // Cache
  | 'categories_cache'
  | 'wilayas_cache'
  | 'user_cache'
  | 'stats_cache'
  
  // Session Data
  | 'session_id'
  | 'last_activity'
  | 'device_info'
  | 'visit_count';

export interface StorageOptions {
  expiry?: number; // في الميلي ثانية
  encrypt?: boolean;
  compress?: boolean;
}

export interface StorageItem<T = any> {
  value: T;
  timestamp: number;
  expiry?: number;
  version?: string;
}

// ===== Constants =====

const STORAGE_PREFIX = 'jazzy_wheels_';
const STORAGE_VERSION = '1.0.0';
const DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 ساعة

// Storage Keys Configuration
export const LOCAL_STORAGE_KEYS: Record<StorageKey, {
  key: string;
  defaultExpiry?: number;
  encrypt?: boolean;
  description: string;
}> = {
  // User Preferences
  user_preferences: {
    key: 'user_prefs',
    defaultExpiry: 30 * 24 * 60 * 60 * 1000, // 30 يوم
    description: 'إعدادات المستخدم العامة'
  },
  user_settings: {
    key: 'user_settings',
    defaultExpiry: 30 * 24 * 60 * 60 * 1000,
    description: 'إعدادات واجهة المستخدم'
  },
  user_theme: {
    key: 'theme',
    defaultExpiry: 365 * 24 * 60 * 60 * 1000, // سنة
    description: 'سمة المظهر المفضلة'
  },
  user_language: {
    key: 'lang',
    defaultExpiry: 365 * 24 * 60 * 60 * 1000,
    description: 'لغة الواجهة'
  },
  
  // Search & Filters
  recent_searches: {
    key: 'recent_searches',
    defaultExpiry: 7 * 24 * 60 * 60 * 1000, // أسبوع
    description: 'عمليات البحث الأخيرة'
  },
  saved_searches: {
    key: 'saved_searches',
    defaultExpiry: 90 * 24 * 60 * 60 * 1000, // 3 شهور
    description: 'عمليات البحث المحفوظة'
  },
  active_filters: {
    key: 'filters',
    defaultExpiry: 2 * 60 * 60 * 1000, // ساعتين
    description: 'الفلاتر النشطة حالياً'
  },
  search_suggestions: {
    key: 'search_suggestions',
    defaultExpiry: 24 * 60 * 60 * 1000,
    description: 'اقتراحات البحث المخزنة'
  },
  
  // Form Drafts
  listing_draft: {
    key: 'listing_draft',
    defaultExpiry: 3 * 24 * 60 * 60 * 1000, // 3 أيام
    description: 'مسودة إنشاء الإعلان'
  },
  profile_draft: {
    key: 'profile_draft',
    defaultExpiry: 7 * 24 * 60 * 60 * 1000,
    description: 'مسودة تعديل الملف الشخصي'
  },
  message_draft: {
    key: 'message_draft',
    defaultExpiry: 60 * 60 * 1000, // ساعة
    description: 'مسودة الرسالة'
  },
  
  // UI State
  sidebar_collapsed: {
    key: 'sidebar_state',
    defaultExpiry: 30 * 24 * 60 * 60 * 1000,
    description: 'حالة الشريط الجانبي'
  },
  table_columns: {
    key: 'table_cols',
    defaultExpiry: 30 * 24 * 60 * 60 * 1000,
    description: 'تفضيلات أعمدة الجدول'
  },
  sort_preferences: {
    key: 'sort_prefs',
    defaultExpiry: 7 * 24 * 60 * 60 * 1000,
    description: 'تفضيلات الترتيب'
  },
  view_mode: {
    key: 'view_mode',
    defaultExpiry: 30 * 24 * 60 * 60 * 1000,
    description: 'وضع العرض المفضل'
  },
  
  // Cache
  categories_cache: {
    key: 'categories',
    defaultExpiry: 24 * 60 * 60 * 1000,
    description: 'تخزين مؤقت للفئات'
  },
  wilayas_cache: {
    key: 'wilayas',
    defaultExpiry: 7 * 24 * 60 * 60 * 1000,
    description: 'تخزين مؤقت للولايات'
  },
  user_cache: {
    key: 'user_cache',
    defaultExpiry: 30 * 60 * 1000, // 30 دقيقة
    encrypt: true,
    description: 'تخزين مؤقت لبيانات المستخدم'
  },
  stats_cache: {
    key: 'stats',
    defaultExpiry: 60 * 60 * 1000, // ساعة
    description: 'تخزين مؤقت للإحصائيات'
  },
  
  // Session Data
  session_id: {
    key: 'session',
    defaultExpiry: 24 * 60 * 60 * 1000,
    description: 'معرف الجلسة'
  },
  last_activity: {
    key: 'last_activity',
    defaultExpiry: 7 * 24 * 60 * 60 * 1000,
    description: 'آخر نشاط للمستخدم'
  },
  device_info: {
    key: 'device',
    defaultExpiry: 30 * 24 * 60 * 60 * 1000,
    description: 'معلومات الجهاز'
  },
  visit_count: {
    key: 'visits',
    defaultExpiry: 365 * 24 * 60 * 60 * 1000,
    description: 'عداد الزيارات'
  },
};

// ===== Helper Functions =====

/**
 * فحص توفر localStorage
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const testKey = 'localStorage_test';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * إنشاء المفتاح الكامل
 */
function getFullKey(key: StorageKey): string {
  const config = LOCAL_STORAGE_KEYS[key];
  return `${STORAGE_PREFIX}${config.key}`;
}

/**
 * ضغط البيانات (بسيط)
 */
function compressData(data: string): string {
  // ضغط بسيط - يمكن تحسينه لاحقاً
  try {
    return btoa(data);
  } catch {
    return data;
  }
}

/**
 * إلغاء ضغط البيانات
 */
function decompressData(data: string): string {
  try {
    return atob(data);
  } catch {
    return data;
  }
}

/**
 * تشفير البيانات (بسيط)
 */
function encryptData(data: string): string {
  // تشفير بسيط - يجب استخدام مكتبة تشفير حقيقية في الإنتاج
  return btoa(data.split('').reverse().join(''));
}

/**
 * فك تشفير البيانات
 */
function decryptData(data: string): string {
  try {
    return atob(data).split('').reverse().join('');
  } catch {
    return data;
  }
}

// ===== Main Storage Functions =====

/**
 * حفظ عنصر في localStorage
 */
export function setStorageItem<T>(
  key: StorageKey,
  value: T,
  options: StorageOptions = {}
): boolean {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available');
    return false;
  }
  
  try {
    const config = LOCAL_STORAGE_KEYS[key];
    const expiry = options.expiry || config.defaultExpiry || DEFAULT_EXPIRY;
    
    const storageItem: StorageItem<T> = {
      value,
      timestamp: Date.now(),
      expiry: Date.now() + expiry,
      version: STORAGE_VERSION,
    };
    
    let serializedData = JSON.stringify(storageItem);
    
    // تطبيق الضغط
    if (options.compress) {
      serializedData = compressData(serializedData);
    }
    
    // تطبيق التشفير
    if (options.encrypt || config.encrypt) {
      serializedData = encryptData(serializedData);
    }
    
    localStorage.setItem(getFullKey(key), serializedData);
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
    return false;
  }
}

/**
 * جلب عنصر من localStorage
 */
export function getStorageItem<T>(key: StorageKey): T | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }
  
  try {
    const config = LOCAL_STORAGE_KEYS[key];
    let serializedData = localStorage.getItem(getFullKey(key));
    
    if (!serializedData) {
      return null;
    }
    
    // إلغاء التشفير
    if (config.encrypt) {
      serializedData = decryptData(serializedData);
    }
    
    // إلغاء الضغط
    try {
      serializedData = decompressData(serializedData);
    } catch {
      // البيانات ليست مضغوطة
    }
    
    const storageItem: StorageItem<T> = JSON.parse(serializedData);
    
    // فحص انتهاء الصلاحية
    if (storageItem.expiry && Date.now() > storageItem.expiry) {
      removeStorageItem(key);
      return null;
    }
    
    return storageItem.value;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    // محاولة حذف البيانات التالفة
    removeStorageItem(key);
    return null;
  }
}

/**
 * حذف عنصر من localStorage
 */
export function removeStorageItem(key: StorageKey): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }
  
  try {
    localStorage.removeItem(getFullKey(key));
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
    return false;
  }
}

/**
 * فحص وجود عنصر في localStorage
 */
export function hasStorageItem(key: StorageKey): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }
  
  const item = getStorageItem(key);
  return item !== null;
}

/**
 * مسح جميع عناصر التطبيق من localStorage
 */
export function clearAllStorageItems(): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }
  
  try {
    const keysToRemove: string[] = [];
    
    // جمع جميع المفاتيح التي تخص التطبيق
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    // حذف المفاتيح
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
}

/**
 * مسح العناصر المنتهية الصلاحية
 */
export function clearExpiredItems(): number {
  if (!isLocalStorageAvailable()) {
    return 0;
  }
  
  let clearedCount = 0;
  const now = Date.now();
  
  try {
    for (const storageKey in LOCAL_STORAGE_KEYS) {
      const key = storageKey as StorageKey;
      const fullKey = getFullKey(key);
      const serializedData = localStorage.getItem(fullKey);
      
      if (serializedData) {
        try {
          const config = LOCAL_STORAGE_KEYS[key];
          let data = serializedData;
          
          // إلغاء التشفير والضغط إذا لزم الأمر
          if (config.encrypt) {
            data = decryptData(data);
          }
          
          try {
            data = decompressData(data);
          } catch {
            // البيانات ليست مضغوطة
          }
          
          const storageItem: StorageItem = JSON.parse(data);
          
          if (storageItem.expiry && now > storageItem.expiry) {
            localStorage.removeItem(fullKey);
            clearedCount++;
          }
        } catch {
          // بيانات تالفة، احذفها
          localStorage.removeItem(fullKey);
          clearedCount++;
        }
      }
    }
  } catch (error) {
    console.error('Error clearing expired items:', error);
  }
  
  return clearedCount;
}

/**
 * الحصول على معلومات استخدام localStorage
 */
export function getStorageUsage(): {
  used: number;
  total: number;
  percentage: number;
  itemsCount: number;
  appItemsCount: number;
} {
  if (!isLocalStorageAvailable()) {
    return { used: 0, total: 0, percentage: 0, itemsCount: 0, appItemsCount: 0 };
  }
  
  try {
    let totalSize = 0;
    let appItemsCount = 0;
    
    // حساب الحجم المستخدم
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
          if (key.startsWith(STORAGE_PREFIX)) {
            appItemsCount++;
          }
        }
      }
    }
    
    // الحد الأقصى التقريبي لـ localStorage (5-10MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    return {
      used: totalSize,
      total: maxSize,
      percentage: (totalSize / maxSize) * 100,
      itemsCount: localStorage.length,
      appItemsCount,
    };
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return { used: 0, total: 0, percentage: 0, itemsCount: 0, appItemsCount: 0 };
  }
}

// ===== Specialized Functions =====

/**
 * حفظ تفضيلات المستخدم
 */
export function saveUserPreferences(preferences: {
  theme?: string;
  language?: string;
  notifications?: boolean;
  autoSave?: boolean;
  [key: string]: any;
}): boolean {
  return setStorageItem('user_preferences', preferences);
}

/**
 * جلب تفضيلات المستخدم
 */
export function getUserPreferences(): {
  theme?: string;
  language?: string;
  notifications?: boolean;
  autoSave?: boolean;
  [key: string]: any;
} | null {
  return getStorageItem('user_preferences');
}

/**
 * حفظ مسودة الإعلان
 */
export function saveListingDraft(draft: {
  title?: string;
  category?: string;
  brand?: string;
  price?: number;
  description?: string;
  [key: string]: any;
}): boolean {
  return setStorageItem('listing_draft', draft);
}

/**
 * جلب مسودة الإعلان
 */
export function getListingDraft(): {
  title?: string;
  category?: string;
  brand?: string;
  price?: number;
  description?: string;
  [key: string]: any;
} | null {
  return getStorageItem('listing_draft');
}

/**
 * مسح مسودة الإعلان
 */
export function clearListingDraft(): boolean {
  return removeStorageItem('listing_draft');
}

/**
 * حفظ عمليات البحث الأخيرة
 */
export function saveRecentSearches(searches: string[]): boolean {
  // الاحتفاظ بآخر 10 عمليات بحث فقط
  const limitedSearches = searches.slice(0, 10);
  return setStorageItem('recent_searches', limitedSearches);
}

/**
 * إضافة بحث جديد للتاريخ
 */
export function addRecentSearch(searchTerm: string): boolean {
  const existing = getStorageItem<string[]>('recent_searches') || [];
  
  // إزالة البحث إذا كان موجوداً مسبقاً
  const filtered = existing.filter(term => term !== searchTerm);
  
  // إضافة البحث الجديد في المقدمة
  const updated = [searchTerm, ...filtered].slice(0, 10);
  
  return saveRecentSearches(updated);
}

/**
 * جلب عمليات البحث الأخيرة
 */
export function getRecentSearches(): string[] {
  return getStorageItem<string[]>('recent_searches') || [];
}

/**
 * تشغيل تنظيف دوري للبيانات المنتهية الصلاحية
 */
export function startPeriodicCleanup(): void {
  if (typeof window === 'undefined') return;
  
  // تشغيل التنظيف كل ساعة
  setInterval(() => {
    const cleared = clearExpiredItems();
    if (cleared > 0) {
      console.log(`Cleared ${cleared} expired localStorage items`);
    }
  }, 60 * 60 * 1000);
  
  // تشغيل تنظيف فوري عند البدء
  setTimeout(() => {
    clearExpiredItems();
  }, 1000);
}

/**
 * تهيئة نظام التخزين المحلي
 */
export function initializeStorage(): void {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available. Some features may not work properly.');
    return;
  }
  
  // تنظيف البيانات المنتهية الصلاحية
  clearExpiredItems();
  
  // بدء التنظيف الدوري
  startPeriodicCleanup();
  
  // تسجيل زيارة جديدة
  const visitCount = getStorageItem<number>('visit_count') || 0;
  setStorageItem('visit_count', visitCount + 1);
  
  // حفظ آخر نشاط
  setStorageItem('last_activity', new Date().toISOString());
  
  console.log('✅ Storage system initialized');
}