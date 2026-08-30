import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseFirestore } from "./config";
import { mapFirebaseErrorToArabic } from "./mapAuthError";
import { fields } from "./docData";

export const MODERATION_SETTINGS_ID = "moderation";

export type ModerationSettings = {
  listingsRequireApproval: boolean;
  reviewsRequireApproval: boolean;
};

export const DEFAULT_MODERATION_SETTINGS: ModerationSettings = {
  listingsRequireApproval: true,
  reviewsRequireApproval: true,
};

function parseModeration(data: Record<string, unknown> | undefined): ModerationSettings {
  if (!data) return { ...DEFAULT_MODERATION_SETTINGS };
  return {
    listingsRequireApproval: data["listingsRequireApproval"] !== false,
    reviewsRequireApproval: data["reviewsRequireApproval"] !== false,
  };
}

export async function getModerationSettings(): Promise<ModerationSettings> {
  try {
    const firestore = getFirebaseFirestore();
    const snap = await getDoc(doc(firestore, "settings", MODERATION_SETTINGS_ID));
    if (!snap.exists()) return { ...DEFAULT_MODERATION_SETTINGS };
    return parseModeration(fields(snap.data()));
  } catch (error: unknown) {
    console.error("Error fetching moderation settings:", error);
    return { ...DEFAULT_MODERATION_SETTINGS };
  }
}

export async function updateModerationSettings(
  next: ModerationSettings,
): Promise<ModerationSettings> {
  const auth = getFirebaseAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("يجب تسجيل الدخول أولاً");
  }

  try {
    const firestore = getFirebaseFirestore();
    const payload = {
      listingsRequireApproval: next.listingsRequireApproval,
      reviewsRequireApproval: next.reviewsRequireApproval,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    };
    await setDoc(doc(firestore, "settings", MODERATION_SETTINGS_ID), payload, { merge: true });
    return {
      listingsRequireApproval: next.listingsRequireApproval,
      reviewsRequireApproval: next.reviewsRequireApproval,
    };
  } catch (error: unknown) {
    throw new Error(mapFirebaseErrorToArabic(error as import("firebase/app").FirebaseError));
  }
}
