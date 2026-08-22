import { FirebaseError } from 'firebase/app';

/**
 * Maps Firebase Auth errors to Arabic messages
 */
export function mapAuthErrorToArabic(error: FirebaseError): string {
  switch (error.code) {
    case 'auth/user-not-found':
      return 'لم يتم العثور على حساب بهذا البريد الإلكتروني';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'كلمة المرور غير صحيحة';
    case 'auth/email-already-in-use':
      return 'البريد الإلكتروني مستخدم من قبل';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة، يجب أن تكون 6 أحرف على الأقل';
    case 'auth/invalid-email':
      return 'البريد الإلكتروني غير صحيح';
    case 'auth/user-disabled':
      return 'تم تعطيل هذا الحساب';
    case 'auth/too-many-requests':
      return 'تم تجاوز عدد المحاولات المسموحة، حاول لاحقاً';
    case 'auth/network-request-failed':
      return 'خطأ في الاتصال، تأكد من الإنترنت';
    case 'auth/popup-closed-by-user':
      return 'تم إغلاق نافذة تسجيل الدخول';
    case 'auth/popup-blocked':
      return 'تم حجب النافذة المنبثقة، تأكد من إعدادات المتصفح';
    case 'auth/cancelled-popup-request':
      return 'تم إلغاء طلب تسجيل الدخول';
    case 'auth/account-exists-with-different-credential':
      return 'يوجد حساب مسجل بطريقة مختلفة، جرب طريقة أخرى';
    case 'auth/requires-recent-login':
      return 'يتطلب تسجيل دخول حديث لإتمام هذه العملية';
    case 'auth/missing-password':
      return 'كلمة المرور مطلوبة';
    case 'auth/internal-error':
      return 'خطأ داخلي، حاول مرة أخرى';
    default:
      console.warn('Unmapped Firebase error:', error.code, error.message);
      return 'حدث خطأ غير متوقع، حاول مرة أخرى';
  }
}

/**
 * Maps general Firebase errors to Arabic messages
 */
export function mapFirebaseErrorToArabic(error: FirebaseError): string {
  switch (error.code) {
    case 'permission-denied':
      return 'لا تملك الصلاحية للوصول إلى هذه البيانات';
    case 'not-found':
      return 'البيانات المطلوبة غير موجودة';
    case 'already-exists':
      return 'البيانات موجودة مسبقاً';
    case 'resource-exhausted':
      return 'تم تجاوز الحد المسموح، حاول لاحقاً';
    case 'failed-precondition':
      return 'لا يمكن إتمام العملية في الوقت الحالي';
    case 'aborted':
      return 'تم إلغاء العملية بسبب تعارض';
    case 'out-of-range':
      return 'البيانات خارج النطاق المسموح';
    case 'unimplemented':
      return 'هذه الميزة غير متاحة حالياً';
    case 'internal':
      return 'خطأ داخلي في الخادم';
    case 'unavailable':
      return 'الخدمة غير متاحة حالياً، حاول لاحقاً';
    case 'data-loss':
      return 'فقدان في البيانات، اتصل بالدعم الفني';
    case 'unauthenticated':
      return 'يجب تسجيل الدخول أولاً';
    case 'invalid-argument':
      return 'البيانات المدخلة غير صحيحة';
    case 'deadline-exceeded':
      return 'انتهت مهلة العملية، حاول مرة أخرى';
    case 'cancelled':
      return 'تم إلغاء العملية';
    default:
      return mapAuthErrorToArabic(error);
  }
}