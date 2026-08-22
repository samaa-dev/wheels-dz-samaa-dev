/**
 * Firebase Stats Service
 * إدارة إحصائيات المنصة والمستخدمين
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  increment,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './config';
import { mapFirebaseErrorToArabic } from './mapAuthError';
import { fields, todayKey } from './docData';

// ===== Types & Interfaces =====

export interface DailyStats {
  id: string; // التاريخ بصيغة YYYY-MM-DD
  
  // إحصائيات عامة
  date: string; // التاريخ - ISO string
  totalUsers: number; // إجمالي المستخدمين
  totalListings: number; // إجمالي الإعلانات
  activeListings: number; // الإعلانات النشطة
  
  // إحصائيات يومية
  newUsers: number; // مستخدمين جدد اليوم
  newListings: number; // إعلانات جديدة اليوم
  completedDeals: number; // صفقات مكتملة اليوم
  totalViews: number; // مشاهدات اليوم
  totalContacts: number; // اتصالات اليوم
  
  // إحصائيات التفاعل
  searchQueries: number; // عمليات البحث
  favorites: number; // إضافات للمفضلة
  shares: number; // المشاركات
  messages: number; // الرسائل المرسلة
  
  // الأجهزة والمتصفحات
  devices: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  
  browsers: {
    chrome: number;
    firefox: number;
    safari: number;
    edge: number;
    other: number;
  };
  
  // التواريخ
  createdAt: string; // تاريخ الإنشاء - ISO string
  updatedAt: string; // تاريخ آخر تحديث - ISO string
}

export interface CategoryStats {
  id: string;
  
  // معلومات الفئة
  category: string; // tire, rim, complete_set, accessories
  categoryLabel: string; // الاسم بالعربية
  
  // الإحصائيات
  totalListings: number; // إجمالي الإعلانات في هذه الفئة
  activeListings: number; // الإعلانات النشطة
  soldListings: number; // الإعلانات المباعة
  averagePrice: number; // متوسط السعر
  totalViews: number; // إجمالي المشاهدات
  
  // الماركات الشائعة في هذه الفئة
  popularBrands: { name: string; count: number }[];
  
  // التوزيع الجغرافي
  wilayaDistribution: { wilaya: string; count: number }[];
  
  // الاتجاهات الشهرية
  monthlyTrends: {
    month: string; // YYYY-MM
    listings: number;
    averagePrice: number;
  }[];
  
  // التواريخ
  lastUpdated: string; // آخر تحديث - ISO string
}

export interface WilayaStats {
  id: string;
  
  // معلومات الولاية
  wilayaCode: string; // رمز الولاية
  wilayaName: string; // اسم الولاية
  
  // الإحصائيات
  totalUsers: number; // إجمالي المستخدمين
  totalListings: number; // إجمالي الإعلانات
  activeListings: number; // الإعلانات النشطة
  averagePrice: number; // متوسط السعر
  
  // الفئات الشائعة
  popularCategories: { category: string; count: number }[];
  
  // النشاط الشهري
  monthlyActivity: {
    month: string;
    newUsers: number;
    newListings: number;
  }[];
  
  // الترتيب على مستوى البلد
  rankByUsers: number; // ترتيب الولاية حسب عدد المستخدمين
  rankByListings: number; // ترتيب الولاية حسب عدد الإعلانات
  
  // التواريخ
  lastUpdated: string; // آخر تحديث - ISO string
}

export interface PlatformSummary {
  id: string; // 'platform-summary'
  
  // الإحصائيات الإجمالية
  totalUsers: number;
  totalListings: number;
  totalDeals: number;
  totalViews: number;
  totalMessages: number;
  
  // النمو الشهري
  monthlyGrowth: {
    users: number; // نسبة النمو الشهري للمستخدمين
    listings: number; // نسبة النمو الشهري للإعلانات
    deals: number; // نسبة النمو الشهري للصفقات
  };
  
  // أكثر الفئات نشاطاً
  topCategories: { category: string; count: number; percentage: number }[];
  
  // أكثر الولايات نشاطاً
  topWilayas: { wilaya: string; count: number; percentage: number }[];
  
  // أكثر الماركات طلباً
  topBrands: { brand: string; count: number; percentage: number }[];
  
  // متوسط الأسعار حسب الفئة
  averagePrices: { category: string; averagePrice: number }[];
  
  // إحصائيات الوقت
  peakHours: { hour: number; activity: number }[]; // الساعات الأكثر نشاطاً
  peakDays: { day: string; activity: number }[]; // الأيام الأكثر نشاطاً
  
  // معدلات التحويل
  conversionRates: {
    listingToContact: number; // نسبة الإعلانات التي تحصل على اتصال
    contactToDeal: number; // نسبة الاتصالات التي تتحول لصفقات
    userRetention: number; // نسبة عودة المستخدمين
  };
  
  // آخر تحديث
  lastUpdated: string; // آخر تحديث - ISO string
}

// ===== Helper Functions =====

/**
 * تحويل Firestore document إلى DailyStats object
 */
function docToDailyStats(doc: QueryDocumentSnapshot<DocumentData>): DailyStats {
  const data = fields(doc.data());
  
  return {
    id: doc.id,
    date: data.date,
    totalUsers: data.totalUsers || 0,
    totalListings: data.totalListings || 0,
    activeListings: data.activeListings || 0,
    newUsers: data.newUsers || 0,
    newListings: data.newListings || 0,
    completedDeals: data.completedDeals || 0,
    totalViews: data.totalViews || 0,
    totalContacts: data.totalContacts || 0,
    searchQueries: data.searchQueries || 0,
    favorites: data.favorites || 0,
    shares: data.shares || 0,
    messages: data.messages || 0,
    devices: data.devices || { mobile: 0, desktop: 0, tablet: 0 },
    browsers: data.browsers || { chrome: 0, firefox: 0, safari: 0, edge: 0, other: 0 },
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

/**
 * تحويل Firestore document إلى PlatformSummary object
 */
function docToPlatformSummary(doc: QueryDocumentSnapshot<DocumentData>): PlatformSummary {
  const data = fields(doc.data());
  
  return {
    id: doc.id,
    totalUsers: data.totalUsers || 0,
    totalListings: data.totalListings || 0,
    totalDeals: data.totalDeals || 0,
    totalViews: data.totalViews || 0,
    totalMessages: data.totalMessages || 0,
    monthlyGrowth: data.monthlyGrowth || { users: 0, listings: 0, deals: 0 },
    topCategories: data.topCategories || [],
    topWilayas: data.topWilayas || [],
    topBrands: data.topBrands || [],
    averagePrices: data.averagePrices || [],
    peakHours: data.peakHours || [],
    peakDays: data.peakDays || [],
    conversionRates: data.conversionRates || { listingToContact: 0, contactToDeal: 0, userRetention: 0 },
    lastUpdated: data.lastUpdated?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

// ===== Stats Functions =====

/**
 * جلب الإحصائيات اليومية
 */
export async function getDailyStats(date: string): Promise<DailyStats | null> {
  try {
    const firestore = getFirebaseFirestore();
    const statsDoc = await getDoc(doc(firestore, 'daily-stats', date));
    
    if (!statsDoc.exists()) {
      return null;
    }
    
    return docToDailyStats(statsDoc);
  } catch (error: any) {
    console.error('Error fetching daily stats:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * جلب إحصائيات عدة أيام
 */
export async function getDateRangeStats(startDate: string, endDate: string): Promise<DailyStats[]> {
  try {
    const firestore = getFirebaseFirestore();
    const statsRef = collection(firestore, 'daily-stats');
    
    const q = query(
      statsRef,
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToDailyStats);
  } catch (error: any) {
    console.error('Error fetching date range stats:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * جلب ملخص المنصة
 */
export async function getPlatformSummary(): Promise<PlatformSummary | null> {
  try {
    const firestore = getFirebaseFirestore();
    const summaryDoc = await getDoc(doc(firestore, 'stats', 'platform-summary'));
    
    if (!summaryDoc.exists()) {
      return null;
    }
    
    return docToPlatformSummary(summaryDoc);
  } catch (error: any) {
    console.error('Error fetching platform summary:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * جلب إحصائيات الفئات
 */
export async function getCategoryStats(): Promise<CategoryStats[]> {
  try {
    const firestore = getFirebaseFirestore();
    const statsRef = collection(firestore, 'category-stats');
    
    const snapshot = await getDocs(statsRef);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...fields(docSnap.data()),
      lastUpdated: fields(docSnap.data()).lastUpdated?.toDate?.()?.toISOString() || new Date().toISOString(),
    })) as CategoryStats[];
  } catch (error: any) {
    console.error('Error fetching category stats:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * جلب إحصائيات الولايات
 */
export async function getWilayaStats(): Promise<WilayaStats[]> {
  try {
    const firestore = getFirebaseFirestore();
    const statsRef = collection(firestore, 'wilaya-stats');
    
    const q = query(statsRef, orderBy('totalListings', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...fields(docSnap.data()),
      lastUpdated: fields(docSnap.data()).lastUpdated?.toDate?.()?.toISOString() || new Date().toISOString(),
    })) as WilayaStats[];
  } catch (error: any) {
    console.error('Error fetching wilaya stats:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * جلب أحدث الإحصائيات (آخر 7 أيام)
 */
export async function getRecentStats(days = 7): Promise<DailyStats[]> {
  try {
    const firestore = getFirebaseFirestore();
    const statsRef = collection(firestore, 'daily-stats');
    
    const endDate = todayKey();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    const q = query(
      statsRef,
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc'),
      firestoreLimit(days)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToDailyStats);
  } catch (error: any) {
    console.error('Error fetching recent stats:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

// ===== Stats Recording Functions =====

/**
 * تسجيل مشاهدة إعلان
 */
export async function recordListingView(listingId: string, category: string, wilaya: string): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const today = todayKey();
    const statsRef = doc(firestore, 'daily-stats', today);
    
    // تحديث إحصائيات اليوم
    await updateDoc(statsRef, {
      totalViews: increment(1),
      updatedAt: serverTimestamp(),
    }).catch(async () => {
      // إنشاء إحصائيات جديدة إذا لم تكن موجودة
      await setDoc(statsRef, {
        date: today,
        totalViews: 1,
        newUsers: 0,
        newListings: 0,
        completedDeals: 0,
        totalContacts: 0,
        searchQueries: 0,
        favorites: 0,
        shares: 0,
        messages: 0,
        devices: { mobile: 0, desktop: 0, tablet: 0 },
        browsers: { chrome: 0, firefox: 0, safari: 0, edge: 0, other: 0 },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error: any) {
    console.error('Error recording listing view:', error);
    // لا نرمي خطأ هنا لأن تسجيل الإحصائيات ليس أساسياً
  }
}

/**
 * تسجيل اتصال جديد
 */
export async function recordContact(listingId: string): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const today = todayKey();
    const statsRef = doc(firestore, 'daily-stats', today);
    
    await updateDoc(statsRef, {
      totalContacts: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error recording contact:', error);
  }
}

/**
 * تسجيل بحث جديد
 */
export async function recordSearch(searchQuery: string): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const today = todayKey();
    const statsRef = doc(firestore, 'daily-stats', today);
    
    await updateDoc(statsRef, {
      searchQueries: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error recording search:', error);
  }
}

/**
 * تسجيل إضافة للمفضلة
 */
export async function recordFavorite(): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const today = todayKey();
    const statsRef = doc(firestore, 'daily-stats', today);
    
    await updateDoc(statsRef, {
      favorites: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error recording favorite:', error);
  }
}

/**
 * تسجيل مشاركة
 */
export async function recordShare(): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const today = todayKey();
    const statsRef = doc(firestore, 'daily-stats', today);
    
    await updateDoc(statsRef, {
      shares: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error recording share:', error);
  }
}

/**
 * تسجيل رسالة جديدة
 */
export async function recordMessage(): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const today = todayKey();
    const statsRef = doc(firestore, 'daily-stats', today);
    
    await updateDoc(statsRef, {
      messages: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error recording message:', error);
  }
}

/**
 * تسجيل مستخدم جديد
 */
export async function recordNewUser(): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const today = todayKey();
    const statsRef = doc(firestore, 'daily-stats', today);
    
    await updateDoc(statsRef, {
      newUsers: increment(1),
      totalUsers: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error recording new user:', error);
  }
}

/**
 * تسجيل إعلان جديد
 */
export async function recordNewListing(category: string): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const today = todayKey();
    const statsRef = doc(firestore, 'daily-stats', today);
    
    await updateDoc(statsRef, {
      newListings: increment(1),
      totalListings: increment(1),
      activeListings: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error recording new listing:', error);
  }
}

/**
 * تسجيل صفقة مكتملة
 */
export async function recordCompletedDeal(): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const today = todayKey();
    const statsRef = doc(firestore, 'daily-stats', today);
    
    await updateDoc(statsRef, {
      completedDeals: increment(1),
      activeListings: increment(-1), // تقليل الإعلانات النشطة
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error recording completed deal:', error);
  }
}