import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  uploadBytesResumable,
  getMetadata,
  type StorageReference,
  type UploadTask,
} from 'firebase/storage';
import { getFirebaseStorage } from './config';
import { mapFirebaseErrorToArabic } from './mapAuthError';

// ===== Types & Interfaces =====

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0-100
  state: 'running' | 'paused' | 'success' | 'error' | 'canceled';
}

export interface UploadResult {
  url: string;
  path: string;
  filename: string;
  size: number;
  metadata: {
    contentType: string;
    uploadedAt: string;
    uploadedBy: string;
  };
}

export type StorageFolder = 
  | 'listings' 
  | 'users' 
  | 'temp' 
  | 'documents' 
  | 'thumbnails';

// ===== Storage Path Helpers =====

/**
 * إنشاء مسار تخزين موحد
 */
function createStoragePath(folder: StorageFolder, userId: string, ...segments: string[]): string {
  const basePaths = {
    listings: `listings/${userId}`,
    users: `users/${userId}`,
    temp: `temp/${userId}`,
    documents: `documents/${userId}`,
    thumbnails: `thumbnails/${userId}`,
  };
  
  return [basePaths[folder], ...segments].filter(Boolean).join('/');
}

/**
 * إنشاء اسم ملف آمن ومميز
 */
function createSafeFilename(originalName: string, prefix?: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const extension = sanitizedName.split('.').pop()?.toLowerCase() || '';
  const baseName = sanitizedName.replace(/\.[^/.]+$/, '');
  
  return prefix 
    ? `${prefix}_${timestamp}_${randomId}_${baseName}.${extension}`
    : `${timestamp}_${randomId}_${baseName}.${extension}`;
}

// ===== Listing Images Functions =====

/**
 * رفع صور الإعلانات مع هيكل محسّن
 */
export async function uploadListingImages(
  uid: string,
  listingId: string,
  files: File[]
): Promise<UploadResult[]> {
  try {
    const storage = getFirebaseStorage();
    const uploadPromises = files.map(async (file, index) => {
      // إنشاء مسار محسّن: listings/{userId}/{listingId}/images/{filename}
      const fileName = createSafeFilename(file.name, `img_${index + 1}`);
      const filePath = createStoragePath('listings', uid, listingId, 'images', fileName);
      
      const storageRef = ref(storage, filePath);
      
      // رفع الملف مع metadata محسّن
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: uid,
          listingId: listingId,
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          fileType: 'listing-image',
          imageIndex: index.toString(),
        },
      });
      
      // الحصول على رابط التحميل
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        url: downloadURL,
        path: filePath,
        filename: fileName,
        size: file.size,
        metadata: {
          contentType: file.type,
          uploadedAt: new Date().toISOString(),
          uploadedBy: uid,
        },
      };
    });
    
    const results = await Promise.all(uploadPromises);
    console.log(`✅ Uploaded ${results.length} images for listing ${listingId}`);
    return results;
  } catch (error: any) {
    console.error('Error uploading listing images:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * رفع صورة واحدة للإعلان
 */
export async function uploadSingleListingImage(
  uid: string,
  listingId: string,
  file: File
): Promise<UploadResult> {
  const results = await uploadListingImages(uid, listingId, [file]);
  const first = results[0];
  if (!first) {
    throw new Error('فشل رفع الصورة');
  }
  return first;
}

// ===== User Images Functions =====

/**
 * رفع صورة الملف الشخصي للمستخدم
 */
export async function uploadUserProfileImage(
  uid: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    const storage = getFirebaseStorage();
    
    // إنشاء مسار: users/{userId}/profile/avatar.{ext}
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `avatar.${extension}`;
    const filePath = createStoragePath('users', uid, 'profile', fileName);
    
    const storageRef = ref(storage, filePath);
    
    // رفع مع تتبع التقدم
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: uid,
          uploadedAt: new Date().toISOString(),
          fileType: 'profile-image',
          originalName: file.name,
        },
      });
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress({
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              progress: Math.round(progress),
              state: snapshot.state as any,
            });
          },
          (error) => {
            console.error('Error uploading profile image:', error);
            reject(new Error(mapFirebaseErrorToArabic(error)));
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                url: downloadURL,
                path: filePath,
                filename: fileName,
                size: file.size,
                metadata: {
                  contentType: file.type,
                  uploadedAt: new Date().toISOString(),
                  uploadedBy: uid,
                },
              });
            } catch (urlError: any) {
              reject(new Error(mapFirebaseErrorToArabic(urlError)));
            }
          }
        );
      });
    } else {
      // رفع مباشر بدون تتبع التقدم
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: uid,
          uploadedAt: new Date().toISOString(),
          fileType: 'profile-image',
          originalName: file.name,
        },
      });
      
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        url: downloadURL,
        path: filePath,
        filename: fileName,
        size: file.size,
        metadata: {
          contentType: file.type,
          uploadedAt: new Date().toISOString(),
          uploadedBy: uid,
        },
      };
    }
  } catch (error: any) {
    console.error('Error uploading user profile image:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * رفع مستندات المستخدم (هوية، رخصة تجارية، إلخ)
 */
export async function uploadUserDocument(
  uid: string,
  file: File,
  documentType: 'id' | 'business_license' | 'address_proof' | 'other',
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    const storage = getFirebaseStorage();
    
    // إنشاء مسار: documents/{userId}/{documentType}/{filename}
    const fileName = createSafeFilename(file.name, documentType);
    const filePath = createStoragePath('documents', uid, documentType, fileName);
    
    const storageRef = ref(storage, filePath);
    
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: uid,
        uploadedAt: new Date().toISOString(),
        fileType: 'user-document',
        documentType: documentType,
        originalName: file.name,
      },
    };
    
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress({
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              progress: Math.round(progress),
              state: snapshot.state as any,
            });
          },
          (error) => {
            console.error('Error uploading document:', error);
            reject(new Error(mapFirebaseErrorToArabic(error)));
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                url: downloadURL,
                path: filePath,
                filename: fileName,
                size: file.size,
                metadata: {
                  contentType: file.type,
                  uploadedAt: new Date().toISOString(),
                  uploadedBy: uid,
                },
              });
            } catch (urlError: any) {
              reject(new Error(mapFirebaseErrorToArabic(urlError)));
            }
          }
        );
      });
    } else {
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        url: downloadURL,
        path: filePath,
        filename: fileName,
        size: file.size,
        metadata: {
          contentType: file.type,
          uploadedAt: new Date().toISOString(),
          uploadedBy: uid,
        },
      };
    }
  } catch (error: any) {
    console.error('Error uploading user document:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

// ===== Temporary Uploads Functions =====

/**
 * رفع مؤقت للملفات قبل إنشاء الإعلان
 */
export async function uploadTempFile(
  uid: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    const storage = getFirebaseStorage();
    
    // إنشاء مسار: temp/{userId}/temp_uploads/{filename}
    const fileName = createSafeFilename(file.name, 'temp');
    const filePath = createStoragePath('temp', uid, 'temp_uploads', fileName);
    
    const storageRef = ref(storage, filePath);
    
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: uid,
        uploadedAt: new Date().toISOString(),
        fileType: 'temp-file',
        originalName: file.name,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 ساعة
      },
    };
    
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress({
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              progress: Math.round(progress),
              state: snapshot.state as any,
            });
          },
          (error) => {
            console.error('Error uploading temp file:', error);
            reject(new Error(mapFirebaseErrorToArabic(error)));
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                url: downloadURL,
                path: filePath,
                filename: fileName,
                size: file.size,
                metadata: {
                  contentType: file.type,
                  uploadedAt: new Date().toISOString(),
                  uploadedBy: uid,
                },
              });
            } catch (urlError: any) {
              reject(new Error(mapFirebaseErrorToArabic(urlError)));
            }
          }
        );
      });
    } else {
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        url: downloadURL,
        path: filePath,
        filename: fileName,
        size: file.size,
        metadata: {
          contentType: file.type,
          uploadedAt: new Date().toISOString(),
          uploadedBy: uid,
        },
      };
    }
  } catch (error: any) {
    console.error('Error uploading temp file:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

// ===== Delete Functions =====

/**
 * حذف جميع صور الإعلان
 */
export async function deleteListingImages(uid: string, listingId: string): Promise<void> {
  try {
    const storage = getFirebaseStorage();
    const listingImagesRef = ref(storage, createStoragePath('listings', uid, listingId, 'images'));
    
    // جلب جميع الملفات في مجلد الصور
    const listResult = await listAll(listingImagesRef);
    
    // حذف جميع الملفات
    const deletePromises = listResult.items.map(itemRef => deleteObject(itemRef));
    await Promise.all(deletePromises);
    
    console.log(`✅ Deleted all images for listing ${listingId}`);
  } catch (error: any) {
    console.error('Error deleting listing images:', error);
    // لا نرمي خطأ في حالة فشل حذف الصور لأنها قد تكون غير موجودة
  }
}

/**
 * حذف صورة الملف الشخصي للمستخدم
 */
export async function deleteUserProfileImage(uid: string): Promise<void> {
  try {
    const storage = getFirebaseStorage();
    const profileFolderRef = ref(storage, createStoragePath('users', uid, 'profile'));
    
    // البحث عن جميع ملفات الصورة الشخصية
    const listResult = await listAll(profileFolderRef);
    
    // حذف جميع الصور الشخصية
    const deletePromises = listResult.items.map(itemRef => deleteObject(itemRef));
    await Promise.all(deletePromises);
    
    console.log(`✅ Deleted profile image for user ${uid}`);
  } catch (error: any) {
    console.error('Error deleting user profile image:', error);
  }
}

/**
 * حذف مستند مستخدم معين
 */
export async function deleteUserDocument(uid: string, documentPath: string): Promise<void> {
  try {
    const storage = getFirebaseStorage();
    const documentRef = ref(storage, documentPath);
    
    await deleteObject(documentRef);
    console.log(`✅ Deleted user document: ${documentPath}`);
  } catch (error: any) {
    console.error('Error deleting user document:', error);
  }
}

/**
 * حذف جميع مستندات المستخدم
 */
export async function deleteAllUserDocuments(uid: string): Promise<void> {
  try {
    const storage = getFirebaseStorage();
    const documentsFolderRef = ref(storage, createStoragePath('documents', uid));
    
    // جلب جميع المستندات
    const listResult = await listAll(documentsFolderRef);
    
    // حذف جميع المستندات والمجلدات الفرعية
    const deletePromises = [
      ...listResult.items.map(itemRef => deleteObject(itemRef)),
      ...listResult.prefixes.map(async (folderRef) => {
        const folderList = await listAll(folderRef);
        return Promise.all(folderList.items.map(itemRef => deleteObject(itemRef)));
      }),
    ];
    
    await Promise.all(deletePromises);
    console.log(`✅ Deleted all documents for user ${uid}`);
  } catch (error: any) {
    console.error('Error deleting user documents:', error);
  }
}

/**
 * مسح الملفات المؤقتة للمستخدم
 */
export async function clearUserTempFiles(uid: string): Promise<void> {
  try {
    const storage = getFirebaseStorage();
    const tempFolderRef = ref(storage, createStoragePath('temp', uid));
    
    // جلب جميع الملفات المؤقتة
    const listResult = await listAll(tempFolderRef);
    
    // حذف جميع الملفات المؤقتة
    const deletePromises = listResult.items.map(itemRef => deleteObject(itemRef));
    await Promise.all(deletePromises);
    
    console.log(`✅ Cleared temp files for user ${uid}`);
  } catch (error: any) {
    console.error('Error clearing temp files:', error);
  }
}

/**
 * مسح الملفات المؤقتة المنتهية الصلاحية
 */
export async function clearExpiredTempFiles(): Promise<void> {
  try {
    const storage = getFirebaseStorage();
    const tempRootRef = ref(storage, 'temp');
    
    // جلب جميع مجلدات المستخدمين
    const userFolders = await listAll(tempRootRef);
    
    for (const userFolder of userFolders.prefixes) {
      const userFiles = await listAll(userFolder);
      
      for (const fileRef of userFiles.items) {
        try {
          const metadata = await getMetadata(fileRef);
          const expiresAt = metadata.customMetadata?.['expiresAt'];
          
          if (expiresAt && new Date(expiresAt) < new Date()) {
            await deleteObject(fileRef);
            console.log(`✅ Deleted expired temp file: ${fileRef.fullPath}`);
          } else if (!expiresAt) {
            const createdTime = new Date(metadata.timeCreated);
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            if (createdTime < oneDayAgo) {
              await deleteObject(fileRef);
              console.log(`✅ Deleted old temp file: ${fileRef.fullPath}`);
            }
          }
        } catch (metaError) {
          console.error('Error deleting temp file:', metaError);
        }
      }
    }
  } catch (error: any) {
    console.error('Error clearing expired temp files:', error);
  }
}

/**
 * حذف صورة محددة بالرابط
 */
export async function deleteImageByUrl(imageUrl: string): Promise<void> {
  try {
    const storage = getFirebaseStorage();
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
    console.log('✅ Deleted image:', imageUrl);
  } catch (error: any) {
    console.error('Error deleting image by URL:', error);
    // لا نرمي خطأ في حالة فشل حذف صورة منفردة
  }
}

// ===== Get Functions =====

/**
 * جلب جميع روابط صور الإعلان
 */
export async function getListingImageUrls(uid: string, listingId: string): Promise<string[]> {
  try {
    const storage = getFirebaseStorage();
    const listingImagesRef = ref(storage, createStoragePath('listings', uid, listingId, 'images'));
    
    const listResult = await listAll(listingImagesRef);
    
    const urlPromises = listResult.items.map(itemRef => getDownloadURL(itemRef));
    const urls = await Promise.all(urlPromises);
    
    return urls;
  } catch (error: any) {
    console.error('Error getting listing image URLs:', error);
    return [];
  }
}

/**
 * جلب رابط صورة الملف الشخصي
 */
export async function getUserProfileImageUrl(uid: string): Promise<string | null> {
  try {
    const storage = getFirebaseStorage();
    const profileFolderRef = ref(storage, createStoragePath('users', uid, 'profile'));
    
    const listResult = await listAll(profileFolderRef);
    
    // البحث عن صورة الملف الشخصي (avatar.*)
    const avatarFile = listResult.items.find(item => 
      item.name.startsWith('avatar.')
    );
    
    if (avatarFile) {
      return await getDownloadURL(avatarFile);
    }
    
    return null;
  } catch (error: any) {
    console.error('Error getting user profile image URL:', error);
    return null;
  }
}

/**
 * جلب جميع مستندات المستخدم
 */
export async function getUserDocuments(uid: string): Promise<{
  type: string;
  url: string;
  filename: string;
  uploadedAt?: string;
}[]> {
  try {
    const storage = getFirebaseStorage();
    const documentsFolderRef = ref(storage, createStoragePath('documents', uid));
    
    const listResult = await listAll(documentsFolderRef);
    const documents: {
      type: string;
      url: string;
      filename: string;
      uploadedAt?: string;
    }[] = [];
    
    // جلب المستندات من المجلدات الفرعية
    for (const folderRef of listResult.prefixes) {
      const folderName = folderRef.name; // نوع المستند
      const folderList = await listAll(folderRef);
      
      for (const fileRef of folderList.items) {
        try {
          const url = await getDownloadURL(fileRef);
          const metadata = await getMetadata(fileRef);
          
          const uploadedAt = metadata.customMetadata?.['uploadedAt'];
          documents.push({
            type: folderName,
            url,
            filename: fileRef.name,
            ...(uploadedAt ? { uploadedAt } : {}),
          });
        } catch (fileError) {
          console.error(`Error processing document ${fileRef.name}:`, fileError);
        }
      }
    }
    
    return documents;
  } catch (error: any) {
    console.error('Error getting user documents:', error);
    return [];
  }
}

/**
 * جلب إحصائيات استخدام التخزين للمستخدم
 */
export async function getUserStorageStats(uid: string): Promise<{
  totalFiles: number;
  totalSizeBytes: number;
  breakdown: {
    listings: { files: number; sizeBytes: number };
    profile: { files: number; sizeBytes: number };
    documents: { files: number; sizeBytes: number };
    temp: { files: number; sizeBytes: number };
  };
}> {
  try {
    const storage = getFirebaseStorage();
    const stats = {
      totalFiles: 0,
      totalSizeBytes: 0,
      breakdown: {
        listings: { files: 0, sizeBytes: 0 },
        profile: { files: 0, sizeBytes: 0 },
        documents: { files: 0, sizeBytes: 0 },
        temp: { files: 0, sizeBytes: 0 },
      },
    };
    
    // حساب الإحصائيات لكل نوع
    const folders: (keyof typeof stats.breakdown)[] = ['listings', 'profile', 'documents', 'temp'];
    
    for (const folder of folders) {
      try {
        const folderPath = folder === 'profile' 
          ? createStoragePath('users', uid, 'profile')
          : createStoragePath(folder as StorageFolder, uid);
          
        const folderRef = ref(storage, folderPath);
        const listResult = await listAll(folderRef);
        
        // حساب الملفات والمجلدات الفرعية
        const allItems = [...listResult.items];
        
        for (const subFolder of listResult.prefixes) {
          const subList = await listAll(subFolder);
          allItems.push(...subList.items);
        }
        
        for (const item of allItems) {
          try {
            const metadata = await getMetadata(item);
            stats.breakdown[folder].files++;
            stats.breakdown[folder].sizeBytes += metadata.size || 0;
          } catch (metaError) {
            // تجاهل أخطاء metadata
            stats.breakdown[folder].files++;
          }
        }
      } catch (folderError) {
        console.error(`Error processing ${folder} folder:`, folderError);
      }
    }
    
    // حساب الإجمالي
    stats.totalFiles = Object.values(stats.breakdown).reduce((sum, folder) => sum + folder.files, 0);
    stats.totalSizeBytes = Object.values(stats.breakdown).reduce((sum, folder) => sum + folder.sizeBytes, 0);
    
    return stats;
  } catch (error: any) {
    console.error('Error getting user storage stats:', error);
    return {
      totalFiles: 0,
      totalSizeBytes: 0,
      breakdown: {
        listings: { files: 0, sizeBytes: 0 },
        profile: { files: 0, sizeBytes: 0 },
        documents: { files: 0, sizeBytes: 0 },
        temp: { files: 0, sizeBytes: 0 },
      },
    };
  }
}

// ===== Validation Functions =====

/**
 * التحقق من صحة ملف الصورة
 */
export function validateImageFile(
  file: File,
  options: {
    maxSize?: number; // بالبايت
    allowedTypes?: string[];
    minWidth?: number;
    minHeight?: number;
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB افتراضي
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  } = options;
  
  // فحص نوع الملف
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `نوع الملف غير مدعوم. الأنواع المدعومة: ${allowedTypes.map(type => (type.split('/')[1] || type).toUpperCase()).join(', ')}`,
    };
  }
  
  // فحص حجم الملف
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `حجم الملف كبير جداً. الحد الأقصى ${maxSizeMB} ميجابايت`,
    };
  }
  
  // فحص الحد الأدنى للحجم
  if (file.size < 1024) { // أقل من 1KB
    return {
      valid: false,
      error: 'حجم الملف صغير جداً. يجب أن يكون الملف أكبر من 1 كيلوبايت',
    };
  }
  
  return { valid: true };
}

/**
 * التحقق من صحة ملف المستند
 */
export function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'نوع الملف غير مدعوم. الأنواع المدعومة: PDF, JPG, PNG, DOC, DOCX',
    };
  }
  
  // حجم أكبر للمستندات (10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت',
    };
  }
  
  return { valid: true };
}

/**
 * التحقق من عدة ملفات صور
 */
export function validateImageFiles(
  files: File[],
  options: {
    maxFiles?: number;
    minFiles?: number;
    maxSize?: number;
    allowedTypes?: string[];
  } = {}
): { valid: boolean; errors: string[] } {
  const {
    maxFiles = 8,
    minFiles = 1,
    maxSize = 5 * 1024 * 1024,
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  } = options;
  
  if (files.length < minFiles) {
    return {
      valid: false,
      errors: [`يجب إضافة ${minFiles === 1 ? 'صورة واحدة' : `${minFiles} صور`} على الأقل`],
    };
  }
  
  if (files.length > maxFiles) {
    return {
      valid: false,
      errors: [`عدد الصور أكثر من المسموح (${maxFiles} صور كحد أقصى)`],
    };
  }
  
  const errors: string[] = [];
  
  files.forEach((file, index) => {
    const validation = validateImageFile(file, { maxSize, allowedTypes });
    if (!validation.valid) {
      errors.push(`الصورة ${index + 1}: ${validation.error}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ===== Helper Functions =====

/**
 * إنشاء رابط معاينة للملف (جانب العميل فقط)
 */
export function createImagePreview(file: File): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return URL.createObjectURL(file);
}

/**
 * إلغاء رابط المعاينة لتحرير الذاكرة
 */
export function revokeImagePreview(url: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  URL.revokeObjectURL(url);
}

/**
 * تحويل حجم الملف إلى تنسيق قابل للقراءة
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 بايت';
  
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * ضغط الصورة قبل الرفع
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0-1
  } = {}
): Promise<File> {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.8 } = options;
  
  if (typeof window === 'undefined') {
    return file; // لا ضغط في جانب الخادم
  }
  
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // حساب الأبعاد الجديدة
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      // رسم الصورة المضغوطة
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      // تحويل إلى ملف
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: file.lastModified,
            });
            resolve(compressedFile);
          } else {
            resolve(file); // فشل الضغط، إرجاع الملف الأصلي
          }
        },
        file.type,
        quality
      );
    };
    
    img.onerror = () => resolve(file); // فشل التحميل، إرجاع الملف الأصلي
    img.src = createImagePreview(file);
  });
}

/**
 * إنشاء صورة مصغرة
 */
export async function createThumbnail(
  file: File,
  size: number = 200
): Promise<File> {
  return compressImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
  });
}

// ===== Compatibility Functions =====

/**
 * للتوافق العكسي - رفع صورة واحدة وإرجاع الرابط فقط
 */
export async function uploadSingleImage(
  uid: string,
  listingId: string,
  file: File
): Promise<string> {
  const result = await uploadSingleListingImage(uid, listingId, file);
  return result.url;
}