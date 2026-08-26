/**
 * Firebase Favorites Service
 * إدارة مجموعة المفضلة المستقلة
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './config';
import { mapFirebaseErrorToArabic } from './mapAuthError';
import { fields, toIsoOrNow } from './docData';

// ===== Types & Interfaces =====

export interface Favorite {
  id: string;
  
  // معرفات أساسية
  userId: string; // معرف المستخدم
  listingId: string; // معرف الإعلان
  
  // معلومات الإعلان (للعرض السريع)
  listingTitle: string; // عنوان الإعلان
  listingPrice: number; // سعر الإعلان وقت الإضافة
  listingImageUrl: string; // صورة الإعلان
  listingCategory: string; // فئة الإعلان
  listingWilaya: string; // ولاية الإعلان
  listingStatus: string; // حالة الإعلان
  
  // معلومات البائع (للعرض السريع)
  sellerName: string; // اسم البائع
  sellerId: string; // معرف البائع
  
  // معلومات المفضلة
  addedAt: string; // تاريخ الإضافة - ISO string
  priceAtAddition: number; // السعر وقت الإضافة (للمقارنة)
  notes?: string; // ملاحظات اختيارية من المستخدم
  
  // تنبيهات (مستقبلاً)
  notifyOnPriceChange: boolean; // تنبيه عند تغيير السعر
  notifyOnStatusChange: boolean; // تنبيه عند تغيير الحالة
  
  // معلومات تقنية
  isActive: boolean; // هل الإعلان ما زال نشطاً
  lastChecked: string; // آخر تحقق من حالة الإعلان - ISO string
}

export interface FavoriteSummary {
  totalFavorites: number;
  categoryBreakdown: { category: string; count: number }[];
  priceRanges: { range: string; count: number }[];
  recentlyAdded: Favorite[];
  priceAlerts: {
    priceIncreased: Favorite[];
    priceDecreased: Favorite[];
    becameUnavailable: Favorite[];
  };
}

// ===== Helper Functions =====

/**
 * تحويل Firestore document إلى Favorite object
 */
function docToFavorite(doc: QueryDocumentSnapshot<DocumentData>): Favorite {
  const data = fields(doc.data());
  
  return {
    id: doc.id,
    userId: data.userId,
    listingId: data.listingId,
    listingTitle: data.listingTitle,
    listingPrice: data.listingPrice,
    listingImageUrl: data.listingImageUrl,
    listingCategory: data.listingCategory,
    listingWilaya: data.listingWilaya,
    listingStatus: data.listingStatus,
    sellerName: data.sellerName,
    sellerId: data.sellerId,
    addedAt: data.addedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    priceAtAddition: data.priceAtAddition || data.listingPrice,
    notes: data.notes,
    notifyOnPriceChange: data.notifyOnPriceChange || false,
    notifyOnStatusChange: data.notifyOnStatusChange || false,
    isActive: data.isActive !== false, // افتراض أنه نشط إلا إذا تم تحديد خلاف ذلك
    lastChecked: data.lastChecked?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

// ===== Favorites Functions =====

/**
 * إضافة إعلان للمفضلة
 */
export async function addToFavorites(favoriteData: {
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
}): Promise<string> {
  try {
    const firestore = getFirebaseFirestore();
    const favoritesRef = collection(firestore, 'favorites');
    
    // التحقق من عدم وجود المفضلة مسبقاً
    const existingQuery = query(
      favoritesRef,
      where('userId', '==', favoriteData.userId),
      where('listingId', '==', favoriteData.listingId)
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    if (!existingSnapshot.empty) {
      throw new Error('هذا الإعلان موجود بالفعل في مفضلتك');
    }
    
    const docRef = await addDoc(favoritesRef, {
      userId: favoriteData.userId,
      listingId: favoriteData.listingId,
      listingTitle: favoriteData.listingTitle,
      listingPrice: favoriteData.listingPrice,
      listingImageUrl: favoriteData.listingImageUrl,
      listingCategory: favoriteData.listingCategory,
      listingWilaya: favoriteData.listingWilaya,
      listingStatus: favoriteData.listingStatus,
      sellerName: favoriteData.sellerName,
      sellerId: favoriteData.sellerId,
      priceAtAddition: favoriteData.listingPrice,
      notes: favoriteData.notes || '',
      notifyOnPriceChange: favoriteData.notifyOnPriceChange || false,
      notifyOnStatusChange: favoriteData.notifyOnStatusChange || false,
      isActive: true,
      addedAt: serverTimestamp(),
      lastChecked: serverTimestamp(),
    });
    
    return docRef.id;
  } catch (error: any) {
    console.error('Error adding to favorites:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * إزالة إعلان من المفضلة
 */
export async function removeFromFavorites(userId: string, listingId: string): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const favoritesRef = collection(firestore, 'favorites');
    
    const q = query(
      favoritesRef,
      where('userId', '==', userId),
      where('listingId', '==', listingId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new Error('هذا الإعلان غير موجود في مفضلتك');
    }
    
    // حذف جميع المفضلات المطابقة (يجب أن تكون واحدة فقط)
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error: any) {
    console.error('Error removing from favorites:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * جلب جميع مفضلات المستخدم
 */
export async function getUserFavorites(userId: string): Promise<Favorite[]> {
  try {
    const firestore = getFirebaseFirestore();
    const favoritesRef = collection(firestore, 'favorites');
    
    const q = query(
      favoritesRef,
      where('userId', '==', userId),
      orderBy('addedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToFavorite);
  } catch (error: any) {
    // Soft-fail: missing index or first login without profile should not break auth
    console.error('Error fetching user favorites:', error);
    if (error?.code === 'permission-denied' || error?.code === 'failed-precondition') {
      return [];
    }
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * جلب مفضلات المستخدم حسب الفئة
 */
export async function getUserFavoritesByCategory(userId: string, category: string): Promise<Favorite[]> {
  try {
    const firestore = getFirebaseFirestore();
    const favoritesRef = collection(firestore, 'favorites');
    
    const q = query(
      favoritesRef,
      where('userId', '==', userId),
      where('listingCategory', '==', category),
      orderBy('addedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToFavorite);
  } catch (error: any) {
    console.error('Error fetching favorites by category:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * التحقق من وجود إعلان في المفضلة
 */
export async function isFavorite(userId: string, listingId: string): Promise<boolean> {
  try {
    const firestore = getFirebaseFirestore();
    const favoritesRef = collection(firestore, 'favorites');
    
    const q = query(
      favoritesRef,
      where('userId', '==', userId),
      where('listingId', '==', listingId)
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error: any) {
    console.error('Error checking if favorite:', error);
    return false;
  }
}

/**
 * الحصول على عدد مفضلات المستخدم
 */
export async function getUserFavoritesCount(userId: string): Promise<number> {
  try {
    const favorites = await getUserFavorites(userId);
    return favorites.length;
  } catch (error: any) {
    console.error('Error getting favorites count:', error);
    return 0;
  }
}

/**
 * تحديث ملاحظات المفضلة
 */
export async function updateFavoriteNotes(
  userId: string,
  listingId: string,
  notes: string
): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const favoritesRef = collection(firestore, 'favorites');
    
    const q = query(
      favoritesRef,
      where('userId', '==', userId),
      where('listingId', '==', listingId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new Error('المفضلة غير موجودة');
    }
    
    const favoriteDoc = snapshot.docs[0];
    if (!favoriteDoc) {
      throw new Error('المفضلة غير موجودة');
    }
    await updateDoc(favoriteDoc.ref, {
      notes: notes,
      lastChecked: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error updating favorite notes:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * تحديث إعدادات التنبيهات للمفضلة
 */
export async function updateFavoriteNotifications(
  userId: string,
  listingId: string,
  notifications: {
    notifyOnPriceChange: boolean;
    notifyOnStatusChange: boolean;
  }
): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const favoritesRef = collection(firestore, 'favorites');
    
    const q = query(
      favoritesRef,
      where('userId', '==', userId),
      where('listingId', '==', listingId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new Error('المفضلة غير موجودة');
    }
    
    const favoriteDoc = snapshot.docs[0];
    if (!favoriteDoc) {
      throw new Error('المفضلة غير موجودة');
    }
    await updateDoc(favoriteDoc.ref, {
      notifyOnPriceChange: notifications.notifyOnPriceChange,
      notifyOnStatusChange: notifications.notifyOnStatusChange,
      lastChecked: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error updating favorite notifications:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * جلب ملخص المفضلات للمستخدم
 */
export async function getFavoritesSummary(userId: string): Promise<FavoriteSummary> {
  try {
    const favorites = await getUserFavorites(userId);
    
    // تجميع البيانات حسب الفئة
    const categoryBreakdown = favorites.reduce((acc, fav) => {
      const existing = acc.find(item => item.category === fav.listingCategory);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ category: fav.listingCategory, count: 1 });
      }
      return acc;
    }, [] as { category: string; count: number }[]);
    
    // تجميع البيانات حسب نطاق السعر
    const priceRanges = favorites.reduce((acc, fav) => {
      let range: string;
      if (fav.listingPrice < 10000) range = 'أقل من 10,000 دج';
      else if (fav.listingPrice < 50000) range = '10,000 - 50,000 دج';
      else if (fav.listingPrice < 100000) range = '50,000 - 100,000 دج';
      else if (fav.listingPrice < 200000) range = '100,000 - 200,000 دج';
      else range = 'أكثر من 200,000 دج';
      
      const existing = acc.find(item => item.range === range);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ range, count: 1 });
      }
      return acc;
    }, [] as { range: string; count: number }[]);
    
    // المفضلات المضافة حديثاً (آخر 5)
    const recentlyAdded = favorites.slice(0, 5);
    
    // تنبيهات الأسعار (سيتم تطويرها لاحقاً)
    const priceAlerts = {
      priceIncreased: [] as Favorite[],
      priceDecreased: [] as Favorite[],
      becameUnavailable: [] as Favorite[],
    };
    
    return {
      totalFavorites: favorites.length,
      categoryBreakdown,
      priceRanges,
      recentlyAdded,
      priceAlerts,
    };
  } catch (error: any) {
    console.error('Error getting favorites summary:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * مسح جميع المفضلات للمستخدم
 */
export async function clearAllFavorites(userId: string): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const favoritesRef = collection(firestore, 'favorites');
    
    const q = query(
      favoritesRef,
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error: any) {
    console.error('Error clearing all favorites:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * جلب الإعلانات الأكثر إضافة للمفضلة (للإحصائيات)
 */
export async function getMostFavoritedListings(limit = 10): Promise<{ listingId: string; count: number; listingTitle: string }[]> {
  try {
    const firestore = getFirebaseFirestore();
    const favoritesRef = collection(firestore, 'favorites');
    
    const snapshot = await getDocs(favoritesRef);
    const favorites = snapshot.docs.map(doc => fields(doc.data()));
    
    // تجميع الإعلانات حسب العدد
    const listingCounts: Record<string, { listingId: string; count: number; listingTitle: string }> = {};
    for (const fav of favorites) {
      const listingId = String(fav.listingId || '');
      const existing = listingCounts[listingId];
      if (!existing) {
        listingCounts[listingId] = {
          listingId,
          count: 1,
          listingTitle: String(fav.listingTitle || ''),
        };
      } else {
        existing.count++;
      }
    }
    
    // ترتيب وتحديد العدد
    return Object.values(listingCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error: any) {
    console.error('Error getting most favorited listings:', error);
    return [];
  }
}