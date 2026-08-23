import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './config';
import { mapFirebaseErrorToArabic } from './mapAuthError';
import { fields, toIso } from './docData';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  sellerId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  createdAt: string;
}

function docToReview(snap: QueryDocumentSnapshot<DocumentData>): Review {
  const d = fields(snap.data());
  return {
    id: snap.id,
    sellerId: String(d['sellerId'] ?? ''),
    reviewerId: String(d['reviewerId'] ?? ''),
    reviewerName: String(d['reviewerName'] ?? ''),
    rating: Number(d['rating'] ?? 0),
    comment: String(d['comment'] ?? ''),
    status: (d['status'] as ReviewStatus) || 'pending',
    createdAt: toIso(d['createdAt']) || new Date().toISOString(),
  };
}

export async function submitReview(input: {
  sellerId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  try {
    const firestore = getFirebaseFirestore();
    const existing = await hasUserReviewedSeller(input.sellerId, input.reviewerId);
    if (existing) {
      throw new Error('لقد قيّمت هذا البائع مسبقاً');
    }

    const docRef = await addDoc(collection(firestore, 'reviews'), {
      sellerId: input.sellerId,
      reviewerId: input.reviewerId,
      reviewerName: input.reviewerName,
      rating: input.rating,
      comment: input.comment.trim(),
      status: 'pending' as ReviewStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      sellerId: input.sellerId,
      reviewerId: input.reviewerId,
      reviewerName: input.reviewerName,
      rating: input.rating,
      comment: input.comment.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('قيّمت')) throw error;
    throw new Error(mapFirebaseErrorToArabic(error as import('firebase/app').FirebaseError));
  }
}

export async function getReviewsForSeller(sellerId: string, approvedOnly = true): Promise<Review[]> {
  try {
    const firestore = getFirebaseFirestore();
    const constraints = approvedOnly
      ? [where('sellerId', '==', sellerId), where('status', '==', 'approved')]
      : [where('sellerId', '==', sellerId)];
    const snap = await getDocs(query(collection(firestore, 'reviews'), ...constraints));
    return snap.docs.map(docToReview);
  } catch (error: unknown) {
    console.error('Error fetching seller reviews:', error);
    return [];
  }
}

export async function getPendingReviews(): Promise<Review[]> {
  try {
    const firestore = getFirebaseFirestore();
    const snap = await getDocs(
      query(collection(firestore, 'reviews'), where('status', '==', 'pending')),
    );
    return snap.docs
      .map(docToReview)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  } catch (error: unknown) {
    throw new Error(mapFirebaseErrorToArabic(error as import('firebase/app').FirebaseError));
  }
}

export async function getAllReviews(): Promise<Review[]> {
  try {
    const firestore = getFirebaseFirestore();
    const snap = await getDocs(collection(firestore, 'reviews'));
    return snap.docs.map(docToReview);
  } catch (error: unknown) {
    throw new Error(mapFirebaseErrorToArabic(error as import('firebase/app').FirebaseError));
  }
}

export async function updateReviewStatus(reviewId: string, status: ReviewStatus): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    await updateDoc(doc(firestore, 'reviews', reviewId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error: unknown) {
    throw new Error(mapFirebaseErrorToArabic(error as import('firebase/app').FirebaseError));
  }
}

export function computeSellerRating(reviews: Review[]): { rating: number; count: number } {
  const approved = reviews.filter((r) => r.status === 'approved');
  if (approved.length === 0) return { rating: 0, count: 0 };
  const sum = approved.reduce((acc, r) => acc + r.rating, 0);
  return { rating: Math.round((sum / approved.length) * 10) / 10, count: approved.length };
}

export async function getSellerRatingSummary(sellerId: string): Promise<{ rating: number; count: number }> {
  const reviews = await getReviewsForSeller(sellerId, true);
  return computeSellerRating(reviews);
}

export async function hasUserReviewedSeller(sellerId: string, reviewerId: string): Promise<boolean> {
  try {
    const firestore = getFirebaseFirestore();
    const snap = await getDocs(
      query(
        collection(firestore, 'reviews'),
        where('sellerId', '==', sellerId),
        where('reviewerId', '==', reviewerId),
      ),
    );
    return !snap.empty;
  } catch {
    return false;
  }
}
