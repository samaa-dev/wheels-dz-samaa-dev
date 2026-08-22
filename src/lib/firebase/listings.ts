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
  increment,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './config';
import { mapFirebaseErrorToArabic } from './mapAuthError';
import type { Listing } from '../data/mock';
import { fields, toIso, toIsoOrNow } from './docData';

/**
 * Fetch all active listings
 */
export async function fetchActiveListings(): Promise<Listing[]> {
  try {
    const firestore = getFirebaseFirestore();
    const listingsRef = collection(firestore, 'listings');
    
    // First try with composite index (status + createdAt)
    try {
      const q = query(
        listingsRef,
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docToListing);
    } catch (indexError: any) {
      // If composite index doesn't exist yet, fall back to simpler query
      console.warn('Composite index not found, falling back to simple query:', indexError.message);
      
      const simpleQuery = query(
        listingsRef,
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(simpleQuery);
      const listings = snapshot.docs.map(docToListing);
      
      // Sort client-side by creation date
      return listings.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  } catch (error: any) {
    console.error('Error fetching active listings:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * Fetch user's own listings
 */
export async function fetchUserListings(sellerId: string): Promise<Listing[]> {
  try {
    const firestore = getFirebaseFirestore();
    const listingsRef = collection(firestore, 'listings');
    
    try {
      // Try new ownerId field first
      const q = query(
        listingsRef,
        where('ownerId', '==', sellerId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const listings = snapshot.docs.map(docToListing);
      
      // If no results, try with legacy sellerId field for backward compatibility
      if (listings.length === 0) {
        const legacyQuery = query(
          listingsRef,
          where('sellerId', '==', sellerId),
          orderBy('createdAt', 'desc')
        );
        
        const legacySnapshot = await getDocs(legacyQuery);
        return legacySnapshot.docs.map(docToListing);
      }
      
      return listings;
    } catch (indexError: any) {
      // Fall back to simple query if index doesn't exist
      console.warn('Owner+createdAt index not found, falling back to simple query');
      
      let listings: Listing[] = [];
      
      // Try new field first
      try {
        const newQuery = query(listingsRef, where('ownerId', '==', sellerId));
        const newSnapshot = await getDocs(newQuery);
        listings = newSnapshot.docs.map(docToListing);
      } catch {
        // Fall back to legacy field
        const legacyQuery = query(listingsRef, where('sellerId', '==', sellerId));
        const legacySnapshot = await getDocs(legacyQuery);
        listings = legacySnapshot.docs.map(docToListing);
      }
      
      // Sort client-side
      return listings.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  } catch (error: any) {
    console.error('Error fetching user listings:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * Fetch single listing by ID
 */
export async function fetchListingById(listingId: string): Promise<Listing | null> {
  try {
    const firestore = getFirebaseFirestore();
    const listingDoc = await getDoc(doc(firestore, 'listings', listingId));
    
    if (!listingDoc.exists()) {
      return null;
    }
    
    return docToListing(listingDoc);
  } catch (error: any) {
    console.error('Error fetching listing:', error);
    return null;
  }
}

/**
 * Create new listing
 */
export async function createListing(listingData: Omit<Listing, 'id' | 'createdAt' | 'views' | 'contactClicks' | 'favorites' | 'shareCount' | 'publishedAt'>): Promise<string> {
  try {
    const firestore = getFirebaseFirestore();
    const listingsRef = collection(firestore, 'listings');
    
    const docRef = await addDoc(listingsRef, {
      ...listingData,
      // Initialize counters
      views: 0,
      contactClicks: 0,
      favorites: 0,
      shareCount: 0,
      // Timestamps
      createdAt: serverTimestamp(),
      publishedAt: listingData.status === 'active' ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
      // Legacy fields for backward compatibility
      sellerId: listingData.ownerId,
      images: listingData.imageUrls,
      featured: listingData.isPromoted,
    });
    
    return docRef.id;
  } catch (error: any) {
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * Update listing
 */
export async function updateListing(listingId: string, updates: Partial<Listing>): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const listingRef = doc(firestore, 'listings', listingId);
    
    await updateDoc(listingRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * Update listing status
 */
export async function updateListingStatus(
  listingId: string, 
  status: Listing['status'],
  sellerId?: string
): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const listingRef = doc(firestore, 'listings', listingId);
    
    // Verify ownership if sellerId provided
    if (sellerId) {
      const listingDoc = await getDoc(listingRef);
      if (!listingDoc.exists()) {
        throw new Error('الإعلان غير موجود');
      }
      
      const listing = docToListing(listingDoc);
      if (listing.ownerId !== sellerId) {
        throw new Error('لا تملك الصلاحية لتعديل هذا الإعلان');
      }
    }
    
    await updateDoc(listingRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * Delete listing
 */
export async function deleteListing(listingId: string, sellerId?: string): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const listingRef = doc(firestore, 'listings', listingId);
    
    // Verify ownership if sellerId provided
    if (sellerId) {
      const listingDoc = await getDoc(listingRef);
      if (!listingDoc.exists()) {
        throw new Error('الإعلان غير موجود');
      }
      
      const listing = docToListing(listingDoc);
      if (listing.ownerId !== sellerId) {
        throw new Error('لا تملك الصلاحية لحذف هذا الإعلان');
      }
    }
    
    await deleteDoc(listingRef);
  } catch (error: any) {
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * Increment listing views count
 */
export async function incrementListingViews(listingId: string): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const listingRef = doc(firestore, 'listings', listingId);
    
    await updateDoc(listingRef, {
      views: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    // Don't throw error for view increment failures, just log
    console.error('Error incrementing listing views:', error);
  }
}

/**
 * Fetch featured listings
 */
export async function fetchFeaturedListings(limitCount = 6): Promise<Listing[]> {
  try {
    const firestore = getFirebaseFirestore();
    const listingsRef = collection(firestore, 'listings');
    
    try {
      const q = query(
        listingsRef,
        where('status', '==', 'active'),
        where('featured', '==', true),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docToListing);
    } catch (indexError: any) {
      console.warn('Featured listings composite index not found, using fallback');
      
      // Fallback: get all active listings and filter for featured client-side
      const simpleQuery = query(
        listingsRef,
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(simpleQuery);
      const allListings = snapshot.docs.map(docToListing);
      
      return allListings
        .filter(listing => listing.isPromoted || listing.featured)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limitCount);
    }
  } catch (error: any) {
    console.error('Error fetching featured listings:', error);
    // Fallback to regular active listings if all else fails
    return fetchRecentListings(limitCount);
  }
}

/**
 * Fetch recent listings
 */
export async function fetchRecentListings(limitCount = 12): Promise<Listing[]> {
  try {
    const firestore = getFirebaseFirestore();
    const listingsRef = collection(firestore, 'listings');
    
    try {
      const q = query(
        listingsRef,
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docToListing);
    } catch (indexError: any) {
      console.warn('Recent listings index not found, using client-side sorting');
      
      const simpleQuery = query(
        listingsRef,
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(simpleQuery);
      const listings = snapshot.docs.map(docToListing);
      
      return listings
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limitCount);
    }
  } catch (error: any) {
    console.error('Error fetching recent listings:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * Convert Firestore document to Listing object
 */
function docToListing(snapshot: QueryDocumentSnapshot<DocumentData>): Listing {
  const data = fields(snapshot.data());
  const imageUrls: string[] = data['imageUrls'] || data['images'] || [];
  const ownerId = data['ownerId'] || data['sellerId'] || '';
  const isPromoted = Boolean(data['isPromoted'] || data['featured']);
  const createdAt = toIsoOrNow(data['createdAt']);
  const publishedAt = toIso(data['publishedAt']) || createdAt;

  const promotionExpiresAt = toIso(data['promotionExpiresAt']);
  const expiresAt = toIso(data['expiresAt']);
  const soldAt = toIso(data['soldAt']);
  const metaDescription = data['metaDescription'];
  const slug = data['slug'];

  return {
    id: snapshot.id,
    ownerId,
    ownerName: data['ownerName'] || data['sellerName'] || '',
    ownerPhone: data['ownerPhone'] || data['sellerPhone'] || '',
    ownerEmail: data['ownerEmail'] || '',
    title: data['title'] || '',
    description: data['description'] || '',
    category: data['category'] || 'tire',
    brand: data['brand'] || '',
    model: data['model'] || '',
    year: data['year'] || 0,
    condition: data['condition'] || 'good',
    wheelType: data['wheelType'] || data['category'] || 'tire',
    size: data['size'] || '',
    width: String(data['width'] ?? ''),
    profile: String(data['profile'] ?? ''),
    diameter: String(data['diameter'] ?? ''),
    ...(data['loadIndex'] ? { loadIndex: String(data['loadIndex']) } : {}),
    ...(data['speedRating'] ? { speedRating: String(data['speedRating']) } : {}),
    ...(data['rimMaterial'] ? { rimMaterial: data['rimMaterial'] } : {}),
    ...(data['rimColor'] ? { rimColor: data['rimColor'] } : {}),
    ...(data['boltPattern'] ? { boltPattern: data['boltPattern'] } : {}),
    ...(data['offset'] ? { offset: data['offset'] } : {}),
    price: data['price'] || 0,
    ...(data['originalPrice'] ? { originalPrice: data['originalPrice'] } : {}),
    isNegotiable: data['isNegotiable'] || false,
    quantity: data['quantity'] || 1,
    wilaya: data['wilaya'] || '',
    commune: data['commune'] || '',
    ...(data['exactLocation'] ? { exactLocation: data['exactLocation'] } : {}),
    ...(data['coordinates'] ? { coordinates: data['coordinates'] } : {}),
    imageUrls,
    coverImageUrl: data['coverImageUrl'] || imageUrls[0] || '',
    status: data['status'] || 'active',
    visibility: data['visibility'] || 'public',
    isPromoted,
    ...(promotionExpiresAt ? { promotionExpiresAt } : {}),
    views: data['views'] || 0,
    contactClicks: data['contactClicks'] || 0,
    favorites: data['favorites'] || 0,
    shareCount: data['shareCount'] || 0,
    createdAt,
    publishedAt,
    ...(expiresAt ? { expiresAt } : {}),
    ...(soldAt ? { soldAt } : {}),
    tags: data['tags'] || [],
    features: data['features'] || [],
    warranty: data['warranty'] || { hasWarranty: false },
    ...(slug ? { slug } : {}),
    ...(metaDescription ? { metaDescription } : {}),
    keywords: data['keywords'] || [],
    sellerId: ownerId,
    images: imageUrls,
    featured: isPromoted,
  };
}