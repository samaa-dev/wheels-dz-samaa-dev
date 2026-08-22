/**
 * نظام التحقق المركزي - Centralized Validation Rules
 * تطبيق VALIDATION_RULES من DATABASE_STRUCTURE.md
 */

import type { AuthUser } from '../firebase/auth';
import type { Listing } from '../data/mock';
import { WILAYAS } from '../data/wilayas';

// ===== User Validation Rules =====

export const USER_VALIDATION = {
  // المعلومات الأساسية
  displayName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFA-Za-z\s]+$/,
    errorMessage: 'يجب أن يكون الاسم بين 2-50 حرف ويحتوي على أحرف عربية أو إنجليزية فقط'
  },
  
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    errorMessage: 'يرجى إدخال بريد إلكتروني صحيح'
  },
  
  phoneNumber: {
    required: true,
    pattern: /^\+213[5-7]\d{8}$/,
    errorMessage: 'رقم الهاتف يجب أن يبدأ بـ +213 ويتبعه 9 أرقام (5xxxxxxxx أو 6xxxxxxxx أو 7xxxxxxxx)'
  },
  
  // المعلومات الشخصية
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 25,
    pattern: /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFA-Za-z]+$/,
    errorMessage: 'الاسم الأول يجب أن يكون بين 2-25 حرف ويحتوي على أحرف عربية أو إنجليزية فقط'
  },
  
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 25,
    pattern: /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFA-Za-z]+$/,
    errorMessage: 'اسم العائلة يجب أن يكون بين 2-25 حرف ويحتوي على أحرف عربية أو إنجليزية فقط'
  },
  
  dateOfBirth: {
    required: false,
    validate: (date: string) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 13 && age <= 120;
    },
    errorMessage: 'العمر يجب أن يكون بين 13-120 سنة'
  },
  
  // الموقع الجغرافي
  wilaya: {
    required: true,
    validate: (wilaya: string) => WILAYAS.some(w => w.name === wilaya),
    errorMessage: 'يرجى اختيار ولاية صحيحة'
  },
  
  commune: {
    required: true,
    minLength: 2,
    maxLength: 50,
    errorMessage: 'يرجى اختيار بلدية صحيحة'
  },
  
  // معلومات إضافية
  bio: {
    required: false,
    maxLength: 500,
    errorMessage: 'النبذة الشخصية يجب ألا تتجاوز 500 حرف'
  },
  
  website: {
    required: false,
    pattern: /^https?:\/\/.+/,
    errorMessage: 'رابط الموقع يجب أن يبدأ بـ http:// أو https://'
  },
};

// ===== Listing Validation Rules =====

export const LISTING_VALIDATION = {
  // معلومات أساسية
  title: {
    required: true,
    minLength: 10,
    maxLength: 100,
    errorMessage: 'عنوان الإعلان يجب أن يكون بين 10-100 حرف'
  },
  
  description: {
    required: true,
    minLength: 20,
    maxLength: 2000,
    errorMessage: 'وصف الإعلان يجب أن يكون بين 20-2000 حرف'
  },
  
  category: {
    required: true,
    allowedValues: ['tire', 'rim', 'complete_set', 'accessories'],
    errorMessage: 'يرجى اختيار نوع صحيح للإعلان'
  },
  
  // معلومات المنتج
  brand: {
    required: false,
    minLength: 0,
    maxLength: 30,
    errorMessage: 'اسم الماركة يجب ألا يتجاوز 30 حرف'
  },
  
  model: {
    required: true,
    minLength: 1,
    maxLength: 50,
    errorMessage: 'اسم الموديل يجب أن يكون بين 1-50 حرف'
  },
  
  year: {
    required: false,
    min: 1990,
    max: new Date().getFullYear() + 2,
    errorMessage: `سنة الصنع يجب أن تكون بين 1990 و ${new Date().getFullYear() + 2}`
  },
  
  condition: {
    required: true,
    allowedValues: ['new', 'like_new', 'used'],
    errorMessage: 'يرجى اختيار حالة صحيحة للمنتج'
  },
  
  // المواصفات التقنية
  size: {
    required: true,
    pattern: /^\d{3}\/\d{2}\s+R\d{2}$/, // مثال: 205/55 R16
    errorMessage: 'مقاس الإطار يجب أن يكون بالشكل: 205/55 R16'
  },
  
  width: {
    required: true,
    pattern: /^\d{3}$/,
    errorMessage: 'عرض الإطار يجب أن يكون 3 أرقام (مثال: 205)'
  },
  
  profile: {
    required: true,
    pattern: /^\d{2}$/,
    errorMessage: 'ملف الإطار الجانبي يجب أن يكون رقمين (مثال: 55)'
  },
  
  diameter: {
    required: true,
    pattern: /^\d{2}$/,
    errorMessage: 'قطر الإطار يجب أن يكون رقمين (مثال: 16)'
  },
  
  // السعر والكمية
  price: {
    required: true,
    min: 100,
    max: 2000000, // 2 مليون دينار
    errorMessage: 'السعر يجب أن يكون بين 100 و 2,000,000 دينار'
  },
  
  quantity: {
    required: true,
    min: 1,
    max: 100,
    errorMessage: 'الكمية يجب أن تكون بين 1 و 100'
  },
  
  // الصور
  imageUrls: {
    required: true,
    minLength: 1,
    maxLength: 10,
    errorMessage: 'يجب رفع صورة واحدة على الأقل وحد أقصى 10 صور'
  },
};

// ===== Validation Functions =====

/**
 * تحقق من صحة بيانات المستخدم
 */
export function validateUser(user: Partial<AuthUser>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // التحقق من المعلومات الأساسية
  if (!user.displayName) {
    errors.push(USER_VALIDATION.displayName.errorMessage);
  } else if (
    user.displayName.length < USER_VALIDATION.displayName.minLength ||
    user.displayName.length > USER_VALIDATION.displayName.maxLength ||
    !USER_VALIDATION.displayName.pattern.test(user.displayName)
  ) {
    errors.push(USER_VALIDATION.displayName.errorMessage);
  }
  
  if (!user.email) {
    errors.push(USER_VALIDATION.email.errorMessage);
  } else if (!USER_VALIDATION.email.pattern.test(user.email)) {
    errors.push(USER_VALIDATION.email.errorMessage);
  }
  
  if (!user.phoneNumber) {
    errors.push(USER_VALIDATION.phoneNumber.errorMessage);
  } else if (!USER_VALIDATION.phoneNumber.pattern.test(user.phoneNumber)) {
    errors.push(USER_VALIDATION.phoneNumber.errorMessage);
  }
  
  // التحقق من الاسم الأول واسم العائلة
  if (!user.firstName) {
    errors.push(USER_VALIDATION.firstName.errorMessage);
  } else if (
    user.firstName.length < USER_VALIDATION.firstName.minLength ||
    user.firstName.length > USER_VALIDATION.firstName.maxLength ||
    !USER_VALIDATION.firstName.pattern.test(user.firstName)
  ) {
    errors.push(USER_VALIDATION.firstName.errorMessage);
  }
  
  if (!user.lastName) {
    errors.push(USER_VALIDATION.lastName.errorMessage);
  } else if (
    user.lastName.length < USER_VALIDATION.lastName.minLength ||
    user.lastName.length > USER_VALIDATION.lastName.maxLength ||
    !USER_VALIDATION.lastName.pattern.test(user.lastName)
  ) {
    errors.push(USER_VALIDATION.lastName.errorMessage);
  }
  
  // التحقق من الموقع الجغرافي
  if (!user.wilaya) {
    errors.push(USER_VALIDATION.wilaya.errorMessage);
  } else if (!USER_VALIDATION.wilaya.validate(user.wilaya)) {
    errors.push(USER_VALIDATION.wilaya.errorMessage);
  }
  
  if (!user.commune) {
    errors.push(USER_VALIDATION.commune.errorMessage);
  } else if (user.commune.length < USER_VALIDATION.commune.minLength || user.commune.length > USER_VALIDATION.commune.maxLength) {
    errors.push(USER_VALIDATION.commune.errorMessage);
  }
  
  // التحقق من تاريخ الميلاد (إذا تم تقديمه)
  if (user.dateOfBirth && !USER_VALIDATION.dateOfBirth.validate(user.dateOfBirth)) {
    errors.push(USER_VALIDATION.dateOfBirth.errorMessage);
  }
  
  // التحقق من النبذة الشخصية (إذا تم تقديمها)
  if (user.bio && user.bio.length > USER_VALIDATION.bio.maxLength) {
    errors.push(USER_VALIDATION.bio.errorMessage);
  }
  
  // التحقق من الموقع الإلكتروني (إذا تم تقديمه)
  if (user.website && !USER_VALIDATION.website.pattern.test(user.website)) {
    errors.push(USER_VALIDATION.website.errorMessage);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * تحقق من صحة بيانات الإعلان
 */
export function validateListing(listing: Partial<Listing>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // التحقق من المعلومات الأساسية
  if (!listing.title) {
    errors.push(LISTING_VALIDATION.title.errorMessage);
  } else if (
    listing.title.length < LISTING_VALIDATION.title.minLength ||
    listing.title.length > LISTING_VALIDATION.title.maxLength
  ) {
    errors.push(LISTING_VALIDATION.title.errorMessage);
  }
  
  if (!listing.description) {
    errors.push(LISTING_VALIDATION.description.errorMessage);
  } else if (
    listing.description.length < LISTING_VALIDATION.description.minLength ||
    listing.description.length > LISTING_VALIDATION.description.maxLength
  ) {
    errors.push(LISTING_VALIDATION.description.errorMessage);
  }
  
  if (!listing.category) {
    errors.push(LISTING_VALIDATION.category.errorMessage);
  } else if (!LISTING_VALIDATION.category.allowedValues.includes(listing.category)) {
    errors.push(LISTING_VALIDATION.category.errorMessage);
  }
  
  // التحقق من معلومات المنتج
  if (listing.brand && (
    listing.brand.length > LISTING_VALIDATION.brand.maxLength
  )) {
    errors.push(LISTING_VALIDATION.brand.errorMessage);
  }
  
  if (!listing.model) {
    errors.push(LISTING_VALIDATION.model.errorMessage);
  } else if (
    listing.model.length < LISTING_VALIDATION.model.minLength ||
    listing.model.length > LISTING_VALIDATION.model.maxLength
  ) {
    errors.push(LISTING_VALIDATION.model.errorMessage);
  }
  
  if (listing.year && (
    listing.year < LISTING_VALIDATION.year.min ||
    listing.year > LISTING_VALIDATION.year.max
  )) {
    errors.push(LISTING_VALIDATION.year.errorMessage);
  }
  
  if (!listing.condition) {
    errors.push(LISTING_VALIDATION.condition.errorMessage);
  } else if (!LISTING_VALIDATION.condition.allowedValues.includes(listing.condition)) {
    errors.push(LISTING_VALIDATION.condition.errorMessage);
  }
  
  // التحقق من المواصفات التقنية
  if (!listing.size) {
    errors.push(LISTING_VALIDATION.size.errorMessage);
  } else if (!LISTING_VALIDATION.size.pattern.test(listing.size)) {
    errors.push(LISTING_VALIDATION.size.errorMessage);
  }
  
  if (!listing.width) {
    errors.push(LISTING_VALIDATION.width.errorMessage);
  } else if (!LISTING_VALIDATION.width.pattern.test(listing.width)) {
    errors.push(LISTING_VALIDATION.width.errorMessage);
  }
  
  if (!listing.profile) {
    errors.push(LISTING_VALIDATION.profile.errorMessage);
  } else if (!LISTING_VALIDATION.profile.pattern.test(listing.profile)) {
    errors.push(LISTING_VALIDATION.profile.errorMessage);
  }
  
  if (!listing.diameter) {
    errors.push(LISTING_VALIDATION.diameter.errorMessage);
  } else if (!LISTING_VALIDATION.diameter.pattern.test(listing.diameter)) {
    errors.push(LISTING_VALIDATION.diameter.errorMessage);
  }
  
  // التحقق من السعر والكمية
  if (!listing.price) {
    errors.push(LISTING_VALIDATION.price.errorMessage);
  } else if (
    listing.price < LISTING_VALIDATION.price.min ||
    listing.price > LISTING_VALIDATION.price.max
  ) {
    errors.push(LISTING_VALIDATION.price.errorMessage);
  }
  
  if (!listing.quantity) {
    errors.push(LISTING_VALIDATION.quantity.errorMessage);
  } else if (
    listing.quantity < LISTING_VALIDATION.quantity.min ||
    listing.quantity > LISTING_VALIDATION.quantity.max
  ) {
    errors.push(LISTING_VALIDATION.quantity.errorMessage);
  }
  
  // التحقق من الصور
  if (!listing.imageUrls || listing.imageUrls.length === 0) {
    errors.push(LISTING_VALIDATION.imageUrls.errorMessage);
  } else if (
    listing.imageUrls.length < LISTING_VALIDATION.imageUrls.minLength ||
    listing.imageUrls.length > LISTING_VALIDATION.imageUrls.maxLength
  ) {
    errors.push(LISTING_VALIDATION.imageUrls.errorMessage);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * تحقق سريع من صحة البريد الإلكتروني
 */
export function isValidEmail(email: string): boolean {
  return USER_VALIDATION.email.pattern.test(email);
}

/**
 * تحقق سريع من صحة رقم الهاتف الجزائري
 */
export function isValidAlgerianPhone(phone: string): boolean {
  return USER_VALIDATION.phoneNumber.pattern.test(phone);
}

/**
 * تحقق سريع من صحة السعر
 */
export function isValidPrice(price: number): boolean {
  return price >= LISTING_VALIDATION.price.min && price <= LISTING_VALIDATION.price.max;
}

/**
 * تنظيف وتنسيق رقم الهاتف الجزائري
 */
export function formatAlgerianPhone(phone: string): string {
  // إزالة جميع الرموز غير الرقمية
  const digits = phone.replace(/\D/g, '');
  
  // إذا بدأ بـ 213، أضف علامة +
  if (digits.startsWith('213')) {
    return '+' + digits;
  }
  
  // إذا بدأ بـ 0، استبدله بـ +213
  if (digits.startsWith('0') && digits.length === 10) {
    return '+213' + digits.slice(1);
  }
  
  // إذا كان 9 أرقام فقط، أضف +213
  if (digits.length === 9 && /^[5-7]/.test(digits)) {
    return '+213' + digits;
  }
  
  return phone; // إرجاع الرقم كما هو إذا لم تنطبق القواعد
}