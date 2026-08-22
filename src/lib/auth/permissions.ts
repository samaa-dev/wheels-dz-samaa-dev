/**
 * Permissions & Roles Management System
 * نظام إدارة الأذونات والأدوار
 */

import type { AuthUser } from '../firebase/auth';
import { isSellerAccount } from './account';

// ===== Types & Interfaces =====

export type UserRole = 'user' | 'moderator' | 'admin';

export type Permission = 
  // إدارة الإعلانات
  | 'listings:create'
  | 'listings:edit:own'
  | 'listings:edit:any' 
  | 'listings:delete:own'
  | 'listings:delete:any'
  | 'listings:approve'
  | 'listings:feature'
  | 'listings:view:all'
  | 'listings:view:pending'
  
  // إدارة المستخدمين
  | 'users:view:all'
  | 'users:edit:own'
  | 'users:edit:any'
  | 'users:suspend'
  | 'users:delete'
  | 'users:promote'
  | 'users:view:documents'
  
  // إدارة الرسائل
  | 'messages:send'
  | 'messages:view:own'
  | 'messages:view:all'
  | 'messages:moderate'
  | 'messages:delete'
  
  // إدارة الإحصائيات
  | 'stats:view:basic'
  | 'stats:view:detailed'
  | 'stats:export'
  
  // إدارة النظام
  | 'system:settings'
  | 'system:backups'
  | 'system:logs'
  | 'system:maintenance'
  
  // المفضلة والبحث
  | 'favorites:manage'
  | 'search:save'
  | 'search:history'
  
  // إدارة المحتوى
  | 'content:moderate'
  | 'content:reports'
  | 'content:announcements';

export interface RoleConfig {
  name: UserRole;
  displayName: string;
  permissions: Permission[];
  description: string;
  color: string;
  canAssign?: UserRole[]; // الأدوار التي يمكن لهذا الدور تعيينها
}

const BUYER_PERMISSIONS: Permission[] = [
  'users:edit:own',
  'messages:send',
  'messages:view:own',
  'stats:view:basic',
  'favorites:manage',
  'search:save',
  'search:history',
];

const SELLER_PERMISSIONS: Permission[] = [
  ...BUYER_PERMISSIONS,
  'listings:create',
  'listings:edit:own',
  'listings:delete:own',
];

const USER_PERMISSIONS: Permission[] = SELLER_PERMISSIONS;

const MODERATOR_PERMISSIONS: Permission[] = [
  ...USER_PERMISSIONS,
  'listings:edit:any',
  'listings:delete:any',
  'listings:approve',
  'listings:view:all',
  'listings:view:pending',
  'users:view:all',
  'users:suspend',
  'messages:view:all',
  'messages:moderate',
  'messages:delete',
  'stats:view:detailed',
  'content:moderate',
  'content:reports',
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...MODERATOR_PERMISSIONS,
  'listings:feature',
  'users:edit:any',
  'users:delete',
  'users:promote',
  'users:view:documents',
  'stats:export',
  'system:settings',
  'system:backups',
  'system:logs',
  'system:maintenance',
  'content:announcements',
];

// ===== Role Definitions =====

export const ROLES: Record<UserRole, RoleConfig> = {
  user: {
    name: 'user',
    displayName: 'مستخدم',
    description: 'مستخدم عادي يمكنه إنشاء الإعلانات والتفاعل مع المنصة',
    color: 'blue',
    permissions: USER_PERMISSIONS,
  },
  
  moderator: {
    name: 'moderator',
    displayName: 'مشرف',
    description: 'مشرف يمكنه مراجعة المحتوى ومراقبة المنصة',
    color: 'orange',
    canAssign: ['user'],
    permissions: MODERATOR_PERMISSIONS,
  },
  
  admin: {
    name: 'admin',
    displayName: 'مدير',
    description: 'مدير النظام مع صلاحيات كاملة',
    color: 'red',
    canAssign: ['user', 'moderator'],
    permissions: ADMIN_PERMISSIONS,
  },
};

// ===== Permission Check Functions =====

/**
 * فحص ما إذا كان للمستخدم دور معين
 */
export function hasRole(user: AuthUser | null, role: UserRole): boolean {
  if (!user) return false;
  return user.role === role;
}

/**
 * فحص ما إذا كان للمستخدم إذن معين
 */
export function hasPermission(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false;

  if (permission === 'listings:create') {
    if (user.role === 'admin' || user.role === 'moderator') return true;
    return isSellerAccount(user.accountType);
  }
  
  const userRole = ROLES[user.role];
  if (!userRole) return false;
  
  return userRole.permissions.includes(permission);
}

/**
 * فحص عدة أذونات (جميعها مطلوبة)
 */
export function hasAllPermissions(user: AuthUser | null, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * فحص عدة أذونات (إذن واحد على الأقل مطلوب)
 */
export function hasAnyPermission(user: AuthUser | null, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * فحص ما إذا كان المستخدم يملك الإعلان
 */
export function canEditListing(user: AuthUser | null, listingOwnerId: string): boolean {
  if (!user) return false;
  
  // يمكن للمالك تعديل إعلاناته
  if (user.id === listingOwnerId && hasPermission(user, 'listings:edit:own')) {
    return true;
  }
  
  // يمكن للمشرفين والمدراء تعديل أي إعلان
  return hasPermission(user, 'listings:edit:any');
}

/**
 * فحص ما إذا كان المستخدم يمكنه حذف الإعلان
 */
export function canDeleteListing(user: AuthUser | null, listingOwnerId: string): boolean {
  if (!user) return false;
  
  // يمكن للمالك حذف إعلاناته
  if (user.id === listingOwnerId && hasPermission(user, 'listings:delete:own')) {
    return true;
  }
  
  // يمكن للمشرفين والمدراء حذف أي إعلان
  return hasPermission(user, 'listings:delete:any');
}

/**
 * فحص ما إذا كان المستخدم يمكنه تعديل ملف المستخدم الآخر
 */
export function canEditUser(currentUser: AuthUser | null, targetUserId: string): boolean {
  if (!currentUser) return false;
  
  // يمكن للمستخدم تعديل ملفه الشخصي
  if (currentUser.id === targetUserId && hasPermission(currentUser, 'users:edit:own')) {
    return true;
  }
  
  // يمكن للمدراء تعديل أي مستخدم
  return hasPermission(currentUser, 'users:edit:any');
}

/**
 * فحص ما إذا كان المستخدم يمكنه تعيين دور معين
 */
export function canAssignRole(currentUser: AuthUser | null, targetRole: UserRole): boolean {
  if (!currentUser) return false;
  
  const currentRole = ROLES[currentUser.role];
  if (!currentRole || !currentRole.canAssign) return false;
  
  return currentRole.canAssign.includes(targetRole);
}

/**
 * فحص ما إذا كان المستخدم مشرف أو مدير
 */
export function isModeratorOrAdmin(user: AuthUser | null): boolean {
  return hasRole(user, 'moderator') || hasRole(user, 'admin');
}

/**
 * فحص ما إذا كان المستخدم مدير
 */
export function isAdmin(user: AuthUser | null): boolean {
  return hasRole(user, 'admin');
}

// ===== Permission Groups =====

/**
 * تجميع الأذونات حسب الفئة للعرض في واجهة الإدارة
 */
export const PERMISSION_GROUPS = {
  listings: {
    name: 'إدارة الإعلانات',
    permissions: [
      'listings:create',
      'listings:edit:own',
      'listings:edit:any',
      'listings:delete:own', 
      'listings:delete:any',
      'listings:approve',
      'listings:feature',
      'listings:view:all',
      'listings:view:pending',
    ] as Permission[],
  },
  
  users: {
    name: 'إدارة المستخدمين',
    permissions: [
      'users:view:all',
      'users:edit:own',
      'users:edit:any',
      'users:suspend',
      'users:delete',
      'users:promote',
      'users:view:documents',
    ] as Permission[],
  },
  
  messages: {
    name: 'إدارة الرسائل',
    permissions: [
      'messages:send',
      'messages:view:own',
      'messages:view:all',
      'messages:moderate',
      'messages:delete',
    ] as Permission[],
  },
  
  stats: {
    name: 'الإحصائيات',
    permissions: [
      'stats:view:basic',
      'stats:view:detailed', 
      'stats:export',
    ] as Permission[],
  },
  
  system: {
    name: 'إدارة النظام',
    permissions: [
      'system:settings',
      'system:backups',
      'system:logs',
      'system:maintenance',
    ] as Permission[],
  },
  
  content: {
    name: 'إدارة المحتوى',
    permissions: [
      'content:moderate',
      'content:reports',
      'content:announcements',
      'favorites:manage',
      'search:save',
      'search:history',
    ] as Permission[],
  },
};

// ===== Utility Functions =====

/**
 * الحصول على جميع الأذونات المتاحة للدور
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLES[role]?.permissions || [];
}

/**
 * الحصول على معلومات الدور
 */
export function getRoleInfo(role: UserRole): RoleConfig | null {
  return ROLES[role] || null;
}

/**
 * الحصول على جميع الأدوار التي يمكن للمستخدم الحالي تعيينها
 */
export function getAssignableRoles(currentUser: AuthUser | null): UserRole[] {
  if (!currentUser) return [];
  
  const currentRole = ROLES[currentUser.role];
  return currentRole?.canAssign || [];
}

/**
 * فحص ما إذا كان الدور أعلى من دور آخر
 */
export function isHigherRole(role1: UserRole, role2: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    user: 1,
    moderator: 2,
    admin: 3,
  };
  
  return hierarchy[role1] > hierarchy[role2];
}

/**
 * تصفية العناصر حسب الأذونات
 */
export function filterByPermission<T>(
  items: T[],
  user: AuthUser | null,
  permission: Permission,
  getOwnerId?: (item: T) => string
): T[] {
  if (!user) return [];
  
  return items.filter(item => {
    // فحص الإذن العام
    if (hasPermission(user, permission)) return true;
    
    // فحص الملكية إذا توفرت دالة الحصول على المالك
    if (getOwnerId) {
      const ownPermission = permission.replace(':any', ':own') as Permission;
      const ownerId = getOwnerId(item);
      return user.id === ownerId && hasPermission(user, ownPermission);
    }
    
    return false;
  });
}

/**
 * إنشاء middleware للتحقق من الأذونات
 */
export function requirePermission(permission: Permission) {
  return (user: AuthUser | null) => {
    if (!hasPermission(user, permission)) {
      throw new Error(`إذن مطلوب: ${permission}`);
    }
  };
}

/**
 * إنشاء middleware للتحقق من الدور
 */
export function requireRole(role: UserRole) {
  return (user: AuthUser | null) => {
    if (!hasRole(user, role)) {
      throw new Error(`دور مطلوب: ${ROLES[role].displayName}`);
    }
  };
}