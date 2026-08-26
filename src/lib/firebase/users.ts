import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './config';
import { mapFirebaseErrorToArabic } from './mapAuthError';
import { getUserProfile, type AuthUser } from './auth';
import { fields } from './docData';

/** Max distinct listing phones a user may reveal */
export const CONTACT_REVEAL_LIMIT = 20;

/**
 * Update user's favorites list
 */
export async function toggleUserFavorite(uid: string, listingId: string): Promise<{ added: boolean }> {
  try {
    const firestore = getFirebaseFirestore();
    const userRef = doc(firestore, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('المستخدم غير موجود');
    }
    
    const favorites: string[] = fields(userDoc.data())['favorites'] || [];
    const isCurrentlyFavorite = favorites.includes(listingId);
    
    if (isCurrentlyFavorite) {
      // Remove from favorites
      await updateDoc(userRef, {
        favorites: arrayRemove(listingId),
        updatedAt: serverTimestamp(),
      });
      return { added: false };
    } else {
      // Add to favorites
      await updateDoc(userRef, {
        favorites: arrayUnion(listingId),
        updatedAt: serverTimestamp(),
      });
      return { added: true };
    }
  } catch (error: any) {
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * Get user's favorites list
 */
export async function getUserFavorites(uid: string): Promise<string[]> {
  try {
    const firestore = getFirebaseFirestore();
    const userDoc = await getDoc(doc(firestore, 'users', uid));
    
    if (!userDoc.exists()) {
      return [];
    }
    
    return fields(userDoc.data())['favorites'] || [];
  } catch (error: any) {
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * Check if user can reveal more contacts
 */
export async function canRevealContact(uid: string, listingId: string): Promise<boolean> {
  try {
    const firestore = getFirebaseFirestore();
    const userDoc = await getDoc(doc(firestore, 'users', uid));
    
    if (!userDoc.exists()) {
      return false;
    }
    
    const revealedContacts: string[] = fields(userDoc.data())['revealedContacts'] || [];
    
    // If already revealed, allow
    if (revealedContacts.includes(listingId)) {
      return true;
    }
    
    return revealedContacts.length < CONTACT_REVEAL_LIMIT;
  } catch (error: any) {
    console.error('Error checking contact reveal limit:', error);
    return false;
  }
}

/**
 * Reveal a contact (add to revealed list)
 */
export async function revealContact(uid: string, listingId: string): Promise<{ allowed: boolean }> {
  try {
    const firestore = getFirebaseFirestore();
    const userRef = doc(firestore, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('المستخدم غير موجود');
    }
    
    const revealedContacts: string[] = fields(userDoc.data())['revealedContacts'] || [];
    
    // If already revealed, return true
    if (revealedContacts.includes(listingId)) {
      return { allowed: true };
    }
    
    // Check limit
    if (revealedContacts.length >= CONTACT_REVEAL_LIMIT) {
      return { allowed: false };
    }
    
    // Add to revealed contacts
    await updateDoc(userRef, {
      revealedContacts: arrayUnion(listingId),
      updatedAt: serverTimestamp(),
    });
    
    return { allowed: true };
  } catch (error: any) {
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * Get user's revealed contacts list
 */
export async function getUserRevealedContacts(uid: string): Promise<string[]> {
  try {
    const firestore = getFirebaseFirestore();
    const userDoc = await getDoc(doc(firestore, 'users', uid));
    
    if (!userDoc.exists()) {
      return [];
    }
    
    return fields(userDoc.data())['revealedContacts'] || [];
  } catch (error: any) {
    console.error('Error getting revealed contacts:', error);
    return [];
  }
}

/**
 * Update user profile
 */
export async function updateUser(uid: string, updates: Partial<AuthUser>): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    await updateDoc(doc(firestore, 'users', uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * Get user profile by ID (for displaying seller info)
 */
export async function getUserById(uid: string): Promise<AuthUser | null> {
  try {
    return await getUserProfile(uid, false);
  } catch (error: any) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}