export type ReviewStatus = "pending" | "approved" | "rejected";

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

const STORAGE_KEY = "seller_reviews";

function readReviews(): Review[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Review[];
  } catch {
    return [];
  }
}

function writeReviews(reviews: Review[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}

export async function submitReview(input: {
  sellerId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  const review: Review = {
    id: `rev_${Date.now()}`,
    sellerId: input.sellerId,
    reviewerId: input.reviewerId,
    reviewerName: input.reviewerName,
    rating: input.rating,
    comment: input.comment.trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  const all = readReviews();
  all.push(review);
  writeReviews(all);
  return review;
}

export async function getReviewsForSeller(sellerId: string, approvedOnly = true): Promise<Review[]> {
  const all = readReviews().filter((r) => r.sellerId === sellerId);
  return approvedOnly ? all.filter((r) => r.status === "approved") : all;
}

export async function getPendingReviews(): Promise<Review[]> {
  return readReviews().filter((r) => r.status === "pending");
}

export async function getAllReviews(): Promise<Review[]> {
  return readReviews();
}

export async function updateReviewStatus(reviewId: string, status: ReviewStatus): Promise<void> {
  const all = readReviews();
  const idx = all.findIndex((r) => r.id === reviewId);
  if (idx === -1) throw new Error("التقييم غير موجود");
  all[idx]!.status = status;
  writeReviews(all);
}

export function computeSellerRating(reviews: Review[]): { rating: number; count: number } {
  const approved = reviews.filter((r) => r.status === "approved");
  if (approved.length === 0) return { rating: 0, count: 0 };
  const sum = approved.reduce((acc, r) => acc + r.rating, 0);
  return { rating: Math.round((sum / approved.length) * 10) / 10, count: approved.length };
}

export async function getSellerRatingSummary(sellerId: string): Promise<{ rating: number; count: number }> {
  const reviews = await getReviewsForSeller(sellerId, true);
  return computeSellerRating(reviews);
}

export function hasUserReviewedSeller(sellerId: string, reviewerId: string): boolean {
  return readReviews().some((r) => r.sellerId === sellerId && r.reviewerId === reviewerId);
}
