import type { AuthUser } from "../firebase/auth";

export type AccountType = "buyer" | "seller_individual" | "seller_merchant";

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

export function getPostAuthRedirect(user: AuthUser | null, intended?: string): string {
  if (!user) return "/login";
  if (!isProfileComplete(user)) return "/complete-profile";
  if (intended) return intended;
  return "/profile";
}

export function getAccountTypeLabel(accountType?: AccountType): string {
  return ACCOUNT_TYPES.find((t) => t.value === accountType)?.label ?? "—";
}
