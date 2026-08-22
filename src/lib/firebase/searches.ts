/**
 * Firebase Searches Service
 * إدارة عمليات البحث وتاريخ البحث
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './config';
import { mapFirebaseErrorToArabic } from './mapAuthError';
import { fields } from './docData';

// ===== Types & Interfaces =====

export interface SearchQuery {
  id: string;
  
  // معرف المستخدم (اختياري للبحث المجهول)
  userId?: string; // معرف المستخدم (إذا كان مسجل)
  
  // محتوى البحث
  searchTerm: string; // النص المبحوث عنه
  filters: {
    category?: string; // الفئة
    brand?: string; // الماركة
    minPrice?: number; // أقل سعر
    maxPrice?: number; // أعلى سعر
    condition?: string; // الحالة
    wilaya?: string; // الولاية
    size?: string; // المقاس
  };
  
  // النتائج
  resultsCount: number; // عدد النتائج المعروضة
  clickedResults: string[]; // معرفات الإعلانات التي تم النقر عليها
  
  // معلومات البحث
  searchType: 'quick' | 'advanced' | 'saved'; // نوع البحث
  searchSource: 'homepage' | 'listings' | 'navbar' | 'filters'; // مصدر البحث
  
  // التواريخ
  createdAt: string; // تاريخ البحث - ISO string
  lastUsed?: string; // آخر استخدام (للبحث المحفوظ) - ISO string
  
  // معلومات الجلسة
  sessionId?: string; // معرف الجلسة
  deviceInfo?: {
    userAgent: string;
    screen: string;
    language: string;
  };
  
  // للبحث المحفوظ
  isSaved: boolean; // هل هو بحث محفوظ
  savedName?: string; // اسم البحث المحفوظ
  notificationsEnabled: boolean; // تفعيل التنبيهات للنتائج الجديدة
}

export interface PopularSearch {
  searchTerm: string;
  count: number;
  category?: string | undefined;
  lastSearched: string;
}

export interface SearchSuggestion {
  text: string;
  type: 'term' | 'brand' | 'category' | 'location';
  count: number;
  category?: string;
}

export interface UserSearchHistory {
  recentSearches: SearchQuery[];
  savedSearches: SearchQuery[];
  popularTerms: PopularSearch[];
  suggestions: SearchSuggestion[];
}

// ===== Helper Functions =====

/**
 * تحويل Firestore document إلى SearchQuery object
 */
function docToSearchQuery(doc: QueryDocumentSnapshot<DocumentData>): SearchQuery {
  const data = fields(doc.data());
  
  return {
    id: doc.id,
    userId: data.userId,
    searchTerm: data.searchTerm || '',
    filters: data.filters || {},
    resultsCount: data.resultsCount || 0,
    clickedResults: data.clickedResults || [],
    searchType: data.searchType || 'quick',
    searchSource: data.searchSource || 'homepage',
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    lastUsed: data.lastUsed?.toDate?.()?.toISOString(),
    sessionId: data.sessionId,
    deviceInfo: data.deviceInfo,
    isSaved: data.isSaved || false,
    savedName: data.savedName,
    notificationsEnabled: data.notificationsEnabled || false,
  };
}

// ===== Search Functions =====

/**
 * تسجيل عملية بحث جديدة
 */
export async function recordSearch(searchData: {
  userId?: string;
  searchTerm: string;
  filters?: SearchQuery['filters'];
  resultsCount: number;
  searchType?: SearchQuery['searchType'];
  searchSource?: SearchQuery['searchSource'];
  sessionId?: string;
  deviceInfo?: SearchQuery['deviceInfo'];
}): Promise<string> {
  try {
    const firestore = getFirebaseFirestore();
    const searchesRef = collection(firestore, 'searches');
    
    const docRef = await addDoc(searchesRef, {
      userId: searchData.userId,
      searchTerm: searchData.searchTerm.trim(),
      filters: searchData.filters || {},
      resultsCount: searchData.resultsCount,
      clickedResults: [],
      searchType: searchData.searchType || 'quick',
      searchSource: searchData.searchSource || 'homepage',
      sessionId: searchData.sessionId,
      deviceInfo: searchData.deviceInfo,
      isSaved: false,
      notificationsEnabled: false,
      createdAt: serverTimestamp(),
    });
    
    return docRef.id;
  } catch (error: any) {
    console.error('Error recording search:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * تسجيل النقر على نتيجة بحث
 */
export async function recordSearchClick(searchId: string, listingId: string): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const searchRef = doc(firestore, 'searches', searchId);
    
    // جلب البحث الحالي لإضافة النقرة
    const searchDoc = await getDoc(searchRef);
    if (searchDoc.exists()) {
      const currentClickedResults = fields(searchDoc.data())['clickedResults'] || [];
      if (!currentClickedResults.includes(listingId)) {
        await updateDoc(searchRef, {
          clickedResults: [...currentClickedResults, listingId],
        });
      }
    }
  } catch (error: any) {
    console.error('Error recording search click:', error);
    // لا نرمي خطأ لأن تسجيل النقرات ليس أساسياً
  }
}

/**
 * جلب تاريخ بحث المستخدم
 */
export async function getUserSearchHistory(
  userId: string,
  limit = 20
): Promise<SearchQuery[]> {
  try {
    const firestore = getFirebaseFirestore();
    const searchesRef = collection(firestore, 'searches');
    
    const q = query(
      searchesRef,
      where('userId', '==', userId),
      where('isSaved', '==', false),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToSearchQuery);
  } catch (error: any) {
    console.error('Error fetching user search history:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * جلب البحوثات المحفوظة للمستخدم
 */
export async function getUserSavedSearches(userId: string): Promise<SearchQuery[]> {
  try {
    const firestore = getFirebaseFirestore();
    const searchesRef = collection(firestore, 'searches');
    
    const q = query(
      searchesRef,
      where('userId', '==', userId),
      where('isSaved', '==', true),
      orderBy('lastUsed', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToSearchQuery);
  } catch (error: any) {
    console.error('Error fetching saved searches:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * حفظ بحث
 */
export async function saveSearch(
  searchId: string,
  savedName: string,
  notificationsEnabled = false
): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const searchRef = doc(firestore, 'searches', searchId);
    
    await updateDoc(searchRef, {
      isSaved: true,
      savedName: savedName.trim(),
      notificationsEnabled,
      lastUsed: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error saving search:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * إلغاء حفظ بحث
 */
export async function unsaveSearch(searchId: string): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const searchRef = doc(firestore, 'searches', searchId);
    
    await updateDoc(searchRef, {
      isSaved: false,
      savedName: null,
      notificationsEnabled: false,
    });
  } catch (error: any) {
    console.error('Error unsaving search:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * تحديث آخر استخدام لبحث محفوظ
 */
export async function updateSearchLastUsed(searchId: string): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const searchRef = doc(firestore, 'searches', searchId);
    
    await updateDoc(searchRef, {
      lastUsed: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error updating search last used:', error);
  }
}

/**
 * حذف بحث من التاريخ
 */
export async function deleteSearchFromHistory(searchId: string): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const searchRef = doc(firestore, 'searches', searchId);
    
    await deleteDoc(searchRef);
  } catch (error: any) {
    console.error('Error deleting search:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * مسح تاريخ البحث للمستخدم
 */
export async function clearUserSearchHistory(userId: string): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const searchesRef = collection(firestore, 'searches');
    
    const q = query(
      searchesRef,
      where('userId', '==', userId),
      where('isSaved', '==', false)
    );
    
    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error: any) {
    console.error('Error clearing search history:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

// ===== Analytics & Suggestions Functions =====

/**
 * جلب البحوثات الشائعة
 */
export async function getPopularSearches(limit = 10): Promise<PopularSearch[]> {
  try {
    const firestore = getFirebaseFirestore();
    const searchesRef = collection(firestore, 'searches');
    
    // جلب عمليات البحث من آخر 30 يوماً
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const q = query(
      searchesRef,
      where('createdAt', '>=', thirtyDaysAgo),
      orderBy('createdAt', 'desc'),
      firestoreLimit(1000) // جلب عينة كبيرة للتحليل
    );
    
    const snapshot = await getDocs(q);
    const searches = snapshot.docs.map(docSnap => fields(docSnap.data()));
    
    // تجميع البحوثات حسب المصطلح
    const termCounts: { [term: string]: { count: number; lastSearched: string; category?: string | undefined } } = {};
    
    searches.forEach(search => {
      const term = search.searchTerm?.trim().toLowerCase();
      if (term && term.length > 0) {
        if (!termCounts[term]) {
          termCounts[term] = {
            count: 0,
            lastSearched: search.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            category: search.filters?.category,
          };
        }
        termCounts[term].count++;
        
        // تحديث آخر بحث إذا كان أحدث
        const currentSearchDate = search.createdAt?.toDate?.()?.toISOString();
        if (currentSearchDate && currentSearchDate > termCounts[term].lastSearched) {
          termCounts[term].lastSearched = currentSearchDate;
        }
      }
    });
    
    // تحويل إلى مصفوفة وترتيب
    return Object.entries(termCounts)
      .map(([term, data]) => ({
        searchTerm: term,
        count: data.count,
        category: data.category,
        lastSearched: data.lastSearched,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error: any) {
    console.error('Error fetching popular searches:', error);
    return [];
  }
}

/**
 * الحصول على اقتراحات البحث
 */
export async function getSearchSuggestions(
  searchText: string,
  limit = 5
): Promise<SearchSuggestion[]> {
  try {
    if (!searchText || searchText.trim().length < 2) {
      return [];
    }
    
    const firestore = getFirebaseFirestore();
    const searchesRef = collection(firestore, 'searches');
    
    // البحث عن مصطلحات مشابهة
    const q = query(
      searchesRef,
      orderBy('createdAt', 'desc'),
      firestoreLimit(500) // عينة للتحليل
    );
    
    const snapshot = await getDocs(q);
    const searches = snapshot.docs.map(docSnap => fields(docSnap.data()));
    
    const queryLower = searchText.trim().toLowerCase();
    const suggestions: { [text: string]: SearchSuggestion } = {};
    
    searches.forEach(search => {
      const term = search.searchTerm?.trim().toLowerCase();
      if (term && term.includes(queryLower) && term !== queryLower) {
        if (!suggestions[term]) {
          suggestions[term] = {
            text: search.searchTerm.trim(),
            type: 'term',
            count: 0,
            category: search.filters?.category,
          };
        }
        suggestions[term].count++;
      }
      
      // اقتراحات الماركة
      const brand = search.filters?.brand?.toLowerCase();
      if (brand && brand.includes(queryLower)) {
        const brandKey = `brand:${brand}`;
        if (!suggestions[brandKey]) {
          suggestions[brandKey] = {
            text: search.filters.brand,
            type: 'brand',
            count: 0,
          };
        }
        suggestions[brandKey].count++;
      }
    });
    
    return Object.values(suggestions)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error: any) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
}

/**
 * جلب ملخص البحث للمستخدم
 */
export async function getUserSearchSummary(userId: string): Promise<UserSearchHistory> {
  try {
    const [recentSearches, savedSearches, popularTerms] = await Promise.all([
      getUserSearchHistory(userId, 10),
      getUserSavedSearches(userId),
      getPopularSearches(5),
    ]);
    
    // الحصول على اقتراحات من التاريخ الأخير
    const suggestions: SearchSuggestion[] = [];
    if (recentSearches.length > 0) {
      const lastQuery = recentSearches[0]?.searchTerm;
      if (lastQuery) {
        const suggestionResults = await getSearchSuggestions(lastQuery, 3);
        suggestions.push(...suggestionResults);
      }
    }
    
    return {
      recentSearches,
      savedSearches,
      popularTerms,
      suggestions,
    };
  } catch (error: any) {
    console.error('Error getting user search summary:', error);
    return {
      recentSearches: [],
      savedSearches: [],
      popularTerms: [],
      suggestions: [],
    };
  }
}

/**
 * جلب إحصائيات البحث (للإدارة)
 */
export async function getSearchAnalytics(days = 7): Promise<{
  totalSearches: number;
  uniqueUsers: number;
  topSearchTerms: PopularSearch[];
  categoryDistribution: { category: string; count: number }[];
  dailySearches: { date: string; count: number }[];
}> {
  try {
    const firestore = getFirebaseFirestore();
    const searchesRef = collection(firestore, 'searches');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const q = query(
      searchesRef,
      where('createdAt', '>=', startDate),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const searches = snapshot.docs.map(docSnap => fields(docSnap.data()));
    
    // حساب الإحصائيات
    const totalSearches = searches.length;
    const uniqueUsers = new Set(searches.map(s => s.userId).filter(Boolean)).size;
    
    // أكثر المصطلحات بحثاً
    const termCounts: { [term: string]: number } = {};
    searches.forEach(search => {
      const term = search.searchTerm?.trim();
      if (term) {
        termCounts[term] = (termCounts[term] || 0) + 1;
      }
    });
    
    const topSearchTerms: PopularSearch[] = Object.entries(termCounts)
      .map(([term, count]) => ({
        searchTerm: term,
        count,
        lastSearched: new Date().toISOString(),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // توزيع الفئات
    const categoryCounts: { [category: string]: number } = {};
    searches.forEach(search => {
      const category = search.filters?.category;
      if (category) {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    });
    
    const categoryDistribution = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
    
    // البحوثات اليومية
    const dailySearches: { [date: string]: number } = {};
    searches.forEach(search => {
      const date = search.createdAt?.toDate?.()?.toISOString()?.split('T')[0];
      if (date) {
        dailySearches[date] = (dailySearches[date] || 0) + 1;
      }
    });
    
    const dailySearchesList = Object.entries(dailySearches)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return {
      totalSearches,
      uniqueUsers,
      topSearchTerms,
      categoryDistribution,
      dailySearches: dailySearchesList,
    };
  } catch (error: any) {
    console.error('Error getting search analytics:', error);
    return {
      totalSearches: 0,
      uniqueUsers: 0,
      topSearchTerms: [],
      categoryDistribution: [],
      dailySearches: [],
    };
  }
}