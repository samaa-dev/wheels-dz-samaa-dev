/**
 * Firebase Admin Functions
 * وظائف إدارة النظام والمستخدمين
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './config';
import { mapFirebaseErrorToArabic } from './mapAuthError';
import type { AuthUser } from './auth';
import type { Listing } from '../data/mock';
import { docToListing } from './listings';
import type { UserRole } from '../auth/permissions';
import { hasPermission, canAssignRole } from '../auth/permissions';
import { fields, toIso, toIsoOrNow } from './docData';

// ===== Types & Interfaces =====

export interface AdminUser extends AuthUser {
  // إضافة معلومات إدارية
  lastLoginAt?: string;
  loginCount: number;
  ipAddress?: string;
  userAgent?: string;
  isVerified: boolean;
  verificationDate?: string;
  suspensionReason?: string;
  suspendedBy?: string;
  suspendedAt?: string;
  
  // إحصائيات
  totalListings: number;
  totalMessages: number;
  totalReports: number;
  warningsCount: number;
}

export interface UserActivity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface SystemLog {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  category: 'auth' | 'listings' | 'messages' | 'system' | 'security';
  message: string;
  details?: any;
  userId?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface AdminStats {
  users: {
    total: number;
    active: number;
    suspended: number;
    newThisMonth: number;
    admins: number;
    moderators: number;
  };
  listings: {
    total: number;
    active: number;
    pending: number;
    reported: number;
    featuredCount: number;
  };
  messages: {
    total: number;
    todayCount: number;
    reportedCount: number;
  };
  system: {
    uptime: number;
    lastBackup?: string;
    storageUsed: number;
    databaseSize: number;
  };
}

// ===== Helper Functions =====

/**
 * تحويل Firestore document إلى AdminUser object
 */
function docToAdminUser(doc: QueryDocumentSnapshot<DocumentData>): AdminUser {
  const data = fields(doc.data());
  const dateOfBirth = data.dateOfBirth;
  const address = data.address;
  const profileImageUrl = data.profileImageUrl;
  const lastLoginAt = toIso(data.lastLoginAt);
  const bio = data.bio;
  const website = data.website;
  const ipAddress = data.ipAddress;
  const userAgent = data.userAgent;
  const verificationDate = toIso(data.verificationDate);
  const suspensionReason = data.suspensionReason;
  const suspendedBy = data.suspendedBy;
  const suspendedAt = toIso(data.suspendedAt);
  
  return {
    // AuthUser fields
    id: data.id,
    email: data.email,
    displayName: data.displayName || data.name || '',
    phoneNumber: data.phoneNumber || data.phone || '',
    name: data.displayName || data.name || '',
    phone: data.phoneNumber || data.phone || '',
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    ...(dateOfBirth ? { dateOfBirth } : {}),
    gender: data.gender || 'not_specified',
    wilaya: data.wilaya || '',
    commune: data.commune || '',
    ...(address ? { address } : {}),
    ...(profileImageUrl ? { profileImageUrl } : {}),
    isEmailVerified: data.isEmailVerified || false,
    isPhoneVerified: data.isPhoneVerified || false,
    listingsCount: data.listingsCount || 0,
    totalViews: data.totalViews || 0,
    totalContactClicks: data.totalContactClicks || 0,
    rating: data.rating || 0,
    reviewsCount: data.reviewsCount || 0,
    accountStatus: data.accountStatus || 'active',
    role: data.role || 'user',
    isSubscribedToNewsletter: data.isSubscribedToNewsletter || false,
    memberSince: toIsoOrNow(data.memberSince),
    ...(lastLoginAt ? { lastLoginAt } : {}),
    ...(bio ? { bio } : {}),
    ...(website ? { website } : {}),
    socialLinks: data.socialLinks || {},
    preferences: data.preferences || {
      language: 'ar',
      notifications: { email: true, sms: true, push: true },
      privacy: { showPhone: true, showEmail: false, showLastSeen: true },
    },
    
    // Admin fields
    loginCount: data.loginCount || 0,
    ...(ipAddress ? { ipAddress } : {}),
    ...(userAgent ? { userAgent } : {}),
    isVerified: data.isVerified || false,
    ...(verificationDate ? { verificationDate } : {}),
    ...(suspensionReason ? { suspensionReason } : {}),
    ...(suspendedBy ? { suspendedBy } : {}),
    ...(suspendedAt ? { suspendedAt } : {}),
    totalListings: data.totalListings || 0,
    totalMessages: data.totalMessages || 0,
    totalReports: data.totalReports || 0,
    warningsCount: data.warningsCount || 0,
  };
}

// ===== User Management Functions =====

/**
 * جلب جميع المستخدمين مع فلترة وترقيم
 */
export async function getAllUsers(
  currentUser: AuthUser,
  options: {
    limit?: number;
    lastDoc?: any;
    role?: UserRole;
    status?: string;
    searchQuery?: string;
    sortBy?: 'memberSince' | 'lastLoginAt' | 'listingsCount';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<{ users: AdminUser[]; lastDoc: any; hasMore: boolean }> {
  try {
    // فحص الأذونات
    if (!hasPermission(currentUser, 'users:view:all')) {
      throw new Error('ليس لديك صلاحية لعرض جميع المستخدمين');
    }
    
    const firestore = getFirebaseFirestore();
    const usersRef = collection(firestore, 'users');
    
    let q = query(usersRef);
    
    // تطبيق الفلاتر
    if (options.role) {
      q = query(q, where('role', '==', options.role));
    }
    
    if (options.status) {
      q = query(q, where('accountStatus', '==', options.status));
    }
    
    // الترتيب
    const sortField = options.sortBy || 'memberSince';
    const sortDirection = options.sortOrder || 'desc';
    q = query(q, orderBy(sortField, sortDirection));
    
    // الترقيم
    if (options.lastDoc) {
      q = query(q, startAfter(options.lastDoc));
    }
    
    q = query(q, firestoreLimit(options.limit || 20));
    
    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(docToAdminUser);
    
    // تطبيق البحث النصي (بعد جلب البيانات)
    let filteredUsers = users;
    if (options.searchQuery) {
      const searchTerm = options.searchQuery.toLowerCase();
      filteredUsers = users.filter(user =>
        user.displayName.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.phoneNumber.includes(searchTerm) ||
        user.wilaya.toLowerCase().includes(searchTerm)
      );
    }
    
    return {
      users: filteredUsers,
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
      hasMore: snapshot.docs.length === (options.limit || 20),
    };
  } catch (error: any) {
    console.error('Error fetching all users:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * تعديل دور المستخدم
 */
export async function changeUserRole(
  currentUser: AuthUser,
  targetUserId: string,
  newRole: UserRole,
  reason?: string
): Promise<void> {
  try {
    // فحص الأذونات
    if (!hasPermission(currentUser, 'users:promote')) {
      throw new Error('ليس لديك صلاحية لتعديل أدوار المستخدمين');
    }
    
    // فحص إمكانية تعيين هذا الدور
    if (!canAssignRole(currentUser, newRole)) {
      throw new Error(`ليس لديك صلاحية لتعيين دور: ${newRole}`);
    }
    
    const firestore = getFirebaseFirestore();
    const userRef = doc(firestore, 'users', targetUserId);
    
    // التحقق من وجود المستخدم
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error('المستخدم غير موجود');
    }
    
    // تحديث الدور
    await updateDoc(userRef, {
      role: newRole,
      roleChangedBy: currentUser.id,
      roleChangedAt: serverTimestamp(),
      roleChangeReason: reason || '',
      updatedAt: serverTimestamp(),
    });
    
    // تسجيل النشاط
    await logUserActivity({
      userId: currentUser.id,
      userName: currentUser.displayName,
      action: 'role_changed',
      details: `Changed role of user ${targetUserId} to ${newRole}${reason ? `: ${reason}` : ''}`,
    });
    
    console.log(`✅ User role changed: ${targetUserId} -> ${newRole}`);
  } catch (error: any) {
    console.error('Error changing user role:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * تعليق المستخدم
 */
export async function suspendUser(
  currentUser: AuthUser,
  targetUserId: string,
  reason: string,
  duration?: number // بالأيام
): Promise<void> {
  try {
    // فحص الأذونات
    if (!hasPermission(currentUser, 'users:suspend')) {
      throw new Error('ليس لديك صلاحية لتعليق المستخدمين');
    }

    if (targetUserId === currentUser.id) {
      throw new Error('لا يمكنك تعليق حسابك أنت');
    }
    
    const firestore = getFirebaseFirestore();
    const userRef = doc(firestore, 'users', targetUserId);
    
    // التحقق من وجود المستخدم
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error('المستخدم غير موجود');
    }

    const targetRole = fields(userDoc.data())['role'] as string | undefined;
    if (targetRole === 'admin') {
      throw new Error('لا يمكن تعليق حساب إداري');
    }
    
    const suspensionData: any = {
      accountStatus: 'suspended',
      suspensionReason: reason,
      suspendedBy: currentUser.id,
      suspendedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    if (duration) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + duration);
      suspensionData.suspensionExpiresAt = expirationDate;
    }
    
    await updateDoc(userRef, suspensionData);
    
    // تسجيل النشاط
    await logUserActivity({
      userId: currentUser.id,
      userName: currentUser.displayName,
      action: 'user_suspended',
      details: `Suspended user ${targetUserId} for: ${reason}${duration ? ` (${duration} days)` : ''}`,
    });
    
    console.log(`✅ User suspended: ${targetUserId}`);
  } catch (error: any) {
    console.error('Error suspending user:', error);
    if (error instanceof Error && !('code' in error)) throw error;
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * إلغاء تعليق المستخدم
 */
export async function unsuspendUser(
  currentUser: AuthUser,
  targetUserId: string
): Promise<void> {
  try {
    // فحص الأذونات
    if (!hasPermission(currentUser, 'users:suspend')) {
      throw new Error('ليس لديك صلاحية لإلغاء تعليق المستخدمين');
    }
    
    const firestore = getFirebaseFirestore();
    const userRef = doc(firestore, 'users', targetUserId);
    
    await updateDoc(userRef, {
      accountStatus: 'active',
      suspensionReason: null,
      suspendedBy: null,
      suspendedAt: null,
      suspensionExpiresAt: null,
      deletionReason: null,
      deletedBy: null,
      deletedAt: null,
      unsuspendedBy: currentUser.id,
      unsuspendedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // تسجيل النشاط
    await logUserActivity({
      userId: currentUser.id,
      userName: currentUser.displayName,
      action: 'user_unsuspended',
      details: `Restored user ${targetUserId}`,
    });
    
    console.log(`✅ User restored: ${targetUserId}`);
  } catch (error: any) {
    console.error('Error unsuspending user:', error);
    if (error instanceof Error && !('code' in error)) throw error;
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * إيقاف حساب المستخدم (حذف ناعم) — لا يحذف Auth ولا يمس دور الإدارة.
 * الحذف الصلب لملف Firestore مع بقاء تسجيل الدخول بالإيميل/جوجل كان يسبب:
 * - فشل الدخول: «ملف المستخدم غير موجود»
 * - أو إعادة إنشاء ملف بدون صلاحيات الإدارة
 */
export async function deleteUser(
  currentUser: AuthUser,
  targetUserId: string,
  reason: string
): Promise<void> {
  try {
    if (!hasPermission(currentUser, 'users:delete')) {
      throw new Error('ليس لديك صلاحية لحذف المستخدمين');
    }

    if (targetUserId === currentUser.id) {
      throw new Error('لا يمكنك حذف حسابك الإداري — اطلب من مدير آخر إن لزم');
    }

    const firestore = getFirebaseFirestore();
    const userRef = doc(firestore, 'users', targetUserId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('المستخدم غير موجود');
    }

    const targetRole = fields(userDoc.data())['role'] as string | undefined;
    if (targetRole === 'admin') {
      throw new Error('لا يمكن حذف حساب إداري. غيّر الدور إلى مستخدم أولاً أو علّق الحساب فقط');
    }

    // Soft-delete: keep profile + Auth so email/Google login does not recreate a blank user
    await updateDoc(userRef, {
      accountStatus: 'deleted',
      deletionReason: reason,
      deletedBy: currentUser.id,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Hide listings without destroying history
    const listingsQuery = query(
      collection(firestore, 'listings'),
      where('ownerId', '==', targetUserId)
    );
    const listingsSnapshot = await getDocs(listingsQuery);
    const batch = writeBatch(firestore);
    listingsSnapshot.docs.forEach((listingDoc) => {
      batch.update(listingDoc.ref, {
        status: 'deleted',
        visibility: 'private',
        updatedAt: serverTimestamp(),
      });
    });
    if (!listingsSnapshot.empty) {
      await batch.commit();
    }

    await logUserActivity({
      userId: currentUser.id,
      userName: currentUser.displayName,
      action: 'user_deleted',
      details: `Soft-deleted user ${targetUserId}: ${reason}`,
    });

    console.log(`✅ User soft-deleted: ${targetUserId}`);
  } catch (error: any) {
    console.error('Error deleting user:', error);
    if (error instanceof Error && !('code' in error)) throw error;
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

// ===== Listing Management Functions =====

/**
 * الموافقة على إعلان
 */
export async function approveListing(
  currentUser: AuthUser,
  listingId: string,
  shouldFeature = false
): Promise<void> {
  try {
    if (!hasPermission(currentUser, 'listings:approve')) {
      throw new Error('ليس لديك صلاحية للموافقة على الإعلانات');
    }
    
    const firestore = getFirebaseFirestore();
    const listingRef = doc(firestore, 'listings', listingId);
    
    const updates: any = {
      status: 'active',
      approvedBy: currentUser.id,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    if (shouldFeature && hasPermission(currentUser, 'listings:feature')) {
      updates.isPromoted = true;
      updates.promotionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 يوم
    }
    
    await updateDoc(listingRef, updates);
    
    await logUserActivity({
      userId: currentUser.id,
      userName: currentUser.displayName,
      action: 'listing_approved',
      details: `Approved listing ${listingId}${shouldFeature ? ' and featured it' : ''}`,
    });
  } catch (error: any) {
    console.error('Error approving listing:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * رفض إعلان
 */
export async function rejectListing(
  currentUser: AuthUser,
  listingId: string,
  reason: string
): Promise<void> {
  try {
    if (!hasPermission(currentUser, 'listings:approve')) {
      throw new Error('ليس لديك صلاحية لرفض الإعلانات');
    }
    
    const firestore = getFirebaseFirestore();
    const listingRef = doc(firestore, 'listings', listingId);
    
    await updateDoc(listingRef, {
      status: 'blocked',
      rejectionReason: reason,
      rejectedBy: currentUser.id,
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    await logUserActivity({
      userId: currentUser.id,
      userName: currentUser.displayName,
      action: 'listing_rejected',
      details: `Rejected listing ${listingId}: ${reason}`,
    });
  } catch (error: any) {
    console.error('Error rejecting listing:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * جلب إعلانات للإدارة (طابور القبول أو حسب الحالة)
 */
export async function getAdminListings(
  currentUser: AuthUser,
  options: {
    status?: string;
    searchQuery?: string;
    limit?: number;
  } = {}
): Promise<Listing[]> {
  try {
    if (!hasPermission(currentUser, 'listings:view:all') && !hasPermission(currentUser, 'listings:view:pending')) {
      throw new Error('ليس لديك صلاحية لعرض إعلانات الإدارة');
    }

    const firestore = getFirebaseFirestore();
    const listingsRef = collection(firestore, 'listings');
    const limitCount = options.limit ?? 100;
    const status = options.status && options.status !== 'all' ? options.status : undefined;

    let snapshot;
    try {
      if (status) {
        snapshot = await getDocs(
          query(listingsRef, where('status', '==', status), orderBy('createdAt', 'desc'), firestoreLimit(limitCount)),
        );
      } else {
        snapshot = await getDocs(
          query(listingsRef, orderBy('createdAt', 'desc'), firestoreLimit(limitCount)),
        );
      }
    } catch {
      // Fallback without composite index
      if (status) {
        snapshot = await getDocs(query(listingsRef, where('status', '==', status), firestoreLimit(limitCount)));
      } else {
        snapshot = await getDocs(query(listingsRef, firestoreLimit(limitCount)));
      }
    }

    let listings = snapshot.docs.map(docToListing);
    listings = listings.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    const q = options.searchQuery?.trim().toLowerCase();
    if (q) {
      listings = listings.filter((l) =>
        `${l.title} ${l.brand} ${l.ownerName} ${l.wilaya} ${l.size}`.toLowerCase().includes(q),
      );
    }

    return listings;
  } catch (error: any) {
    console.error('Error fetching admin listings:', error);
    if (error instanceof Error && !('code' in error)) throw error;
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

// ===== Activity & Logging Functions =====

/**
 * تسجيل نشاط المستخدم
 */
export async function logUserActivity(activity: {
  userId: string;
  userName: string;
  action: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const activitiesRef = collection(firestore, 'user-activities');
    
    await addDoc(activitiesRef, {
      ...activity,
      timestamp: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error logging user activity:', error);
  }
}

/**
 * تسجيل سجل النظام
 */
export async function logSystemEvent(log: {
  level: SystemLog['level'];
  category: SystemLog['category'];
  message: string;
  details?: any;
  userId?: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const logsRef = collection(firestore, 'system-logs');
    
    await addDoc(logsRef, {
      ...log,
      timestamp: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error logging system event:', error);
  }
}

/**
 * جلب إحصائيات الإدارة
 */
export async function getAdminStats(currentUser: AuthUser): Promise<AdminStats> {
  try {
    if (!hasPermission(currentUser, 'stats:view:detailed')) {
      throw new Error('ليس لديك صلاحية لعرض إحصائيات الإدارة');
    }
    
    const firestore = getFirebaseFirestore();
    
    // عد المستخدمين
    const usersSnapshot = await getDocs(collection(firestore, 'users'));
    const users = usersSnapshot.docs.map(docSnap => fields(docSnap.data()));
    
    const userStats = {
      total: users.length,
      active: users.filter(u => u.accountStatus === 'active').length,
      suspended: users.filter(u => u.accountStatus === 'suspended' || u.accountStatus === 'deleted').length,
      newThisMonth: users.filter(u => {
        const memberDate = new Date(u.memberSince);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return memberDate > monthAgo;
      }).length,
      admins: users.filter(u => u.role === 'admin').length,
      moderators: users.filter(u => u.role === 'moderator').length,
    };
    
    // عد الإعلانات
    const listingsSnapshot = await getDocs(collection(firestore, 'listings'));
    const listings = listingsSnapshot.docs.map(docSnap => fields(docSnap.data()));
    
    const listingStats = {
      total: listings.length,
      active: listings.filter(l => l.status === 'active').length,
      pending: listings.filter(l => l.status === 'pending').length,
      reported: listings.filter(l => l.reportCount > 0).length,
      featuredCount: listings.filter(l => l.isPromoted).length,
    };
    
    // عد الرسائل
    const messagesSnapshot = await getDocs(collection(firestore, 'messages'));
    const messages = messagesSnapshot.docs.map(docSnap => fields(docSnap.data()));
    
    const today = new Date().toDateString();
    const messageStats = {
      total: messages.length,
      todayCount: messages.filter(m => {
        const messageDate = m.createdAt?.toDate?.()?.toDateString();
        return messageDate === today;
      }).length,
      reportedCount: messages.filter(m => m.isReported).length,
    };
    
    return {
      users: userStats,
      listings: listingStats,
      messages: messageStats,
      system: {
        uptime: 0, // يتم حسابه من مصادر أخرى
        storageUsed: 0, // يتم حسابه من Firebase Storage
        databaseSize: 0, // يتم حسابه من Firestore
      },
    };
  } catch (error: any) {
    console.error('Error getting admin stats:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}