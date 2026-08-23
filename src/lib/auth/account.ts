import type { AuthUser } from "../firebase/auth";

export type AccountType = "buyer" | "seller_individual" | "seller_merchant";

export type AuthRedirect = {
  to: string;
  search?: Record<string, unknown>;
};

export const ACCOUNT_TYPES: {
  value: AccountType;
  label: string;
  description: string;
}[] = [
  {
    value: "buyer",
    label: "مشتري",
    description: "تصفح الإعلانات وتواصل مع البائعين",
  },
  {
    value: "seller_individual",
    label: "بائع عادي",
    description: "انشر إعلاناتك الشخصية للبيع",
  },
  {
    value: "seller_merchant",
    label: "تاجر",
    description: "حساب تجاري لنشر عدة إعلانات بانتظام",
  },
];

export const SELLER_ACCOUNT_TYPES = ACCOUNT_TYPES.filter(
  (t) => t.value === "seller_individual" || t.value === "seller_merchant",
);

export function isSellerAccount(accountType?: AccountType): boolean {
  return accountType === "seller_individual" || accountType === "seller_merchant";
}

export function isProfileComplete(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.profileComplete) return true;
  return Boolean(
    user.displayName?.trim() &&
      (user.phoneNumber || user.phone)?.trim() &&
      user.wilaya?.trim() &&
      user.accountType,
  );
}

export function getPostAuthRedirect(user: AuthUser | null, intended?: string): AuthRedirect {
  if (!user) return { to: "/login" };
  if (!isProfileComplete(user)) {
    return intended
      ? { to: "/complete-profile", search: { redirect: intended } }
      : { to: "/complete-profile" };
  }
  if (intended) return { to: intended };
  return { to: "/profile" };
}

/** Destination after completing profile, based on account type. */
export function getPostProfileRedirect(accountType: AccountType, intended?: string): AuthRedirect {
  if (isSellerAccount(accountType)) {
    return intended ? { to: intended } : { to: "/create-listing" };
  }
  if (intended && intended !== "/create-listing") {
    return { to: intended };
  }
  return { to: "/listings" };
}

export function getAccountTypeLabel(accountType?: AccountType): string {
  return ACCOUNT_TYPES.find((t) => t.value === accountType)?.label ?? "—";
}
