export type ListingCategory = "tire" | "rim" | "complete_set" | "accessories";
export type ListingCondition = "new" | "like_new" | "used";
/** @deprecated قيم قديمة — للتوافق مع البيانات السابقة */
export type LegacyListingCondition = "excellent" | "good" | "fair" | "damaged";
export type ListingStatus = "active" | "sold" | "reserved" | "deleted" | "pending" | "blocked" | "inactive";

export const DEFAULT_LISTING_CATEGORY: ListingCategory = "tire";

export const CATEGORIES: { value: ListingCategory; label: string; description: string }[] = [
  { value: "tire", label: "إطارات", description: "إطارات مطاطية بمختلف المقاسات" },
];

export const CATEGORY_LABEL: Record<ListingCategory, string> = {
  tire: "إطارات",
  rim: "جنوط",
  complete_set: "طقم كامل",
  accessories: "إكسسوارات",
};

export const CONDITIONS: {
  value: ListingCondition;
  label: string;
  description: string;
}[] = [
  { value: "new", label: "جديد", description: "لم يُستعمل من قبل، في حالة ممتازة أو بعلبته الأصلية" },
  { value: "like_new", label: "شبه جديد", description: "استعمال خفيف جداً دون عيوب واضحة" },
  { value: "used", label: "مستعمل", description: "استُعمل سابقاً ولا يزال صالحاً للاستخدام" },
];

export const CONDITION_LABEL: Record<ListingCondition | LegacyListingCondition, string> = {
  new: "جديد",
  like_new: "شبه جديد",
  used: "مستعمل",
  excellent: "شبه جديد",
  good: "مستعمل",
  fair: "مستعمل",
  damaged: "مستعمل",
};

export function normalizeCondition(condition: string): ListingCondition {
  if (condition === "new" || condition === "like_new" || condition === "used") return condition;
  if (condition === "excellent") return "like_new";
  return "used";
}

export const STATUS_LABEL: Record<ListingStatus, string> = {
  active: "نشط",
  sold: "تم البيع",
  reserved: "محجوز",
  deleted: "محذوف",
  pending: "قيد المراجعة",
  blocked: "محظور",
  inactive: "متوقف",
};

export const BRANDS = [
  "Michelin",
  "Continental",
  "Pirelli",
  "Bridgestone",
  "Goodyear",
  "Dunlop",
  "Hankook",
  "Kumho",
  "Nexen",
  "Yokohama",
  "أخرى",
];

export const BRAND_MODEL_EXAMPLES: Record<string, string> = {
  Michelin: "Pilot Sport 4",
  Continental: "PremiumContact 6",
  Pirelli: "P Zero",
  Bridgestone: "Turanza T005",
  Goodyear: "EfficientGrip",
  Dunlop: "Sport Maxx",
  Hankook: "Ventus Prime",
  Kumho: "Ecsta PS71",
  Nexen: "N'Fera SU1",
  Yokohama: "Advan Sport",
  أخرى: "اسم الموديل",
};

export const SIZE_EXAMPLE = "205/55 R16";

export const SIZE_HELP_TEXT =
  "المقاس يُكتب بالشكل: العرض/الملف Rالقطر. مثال 205/55 R16 يعني عرض 205 مم، ملف جانبي 55%، وقطر 16 بوصة.";

export const SIZES = [
  "165/70 R14",
  "175/65 R14",
  "185/65 R15",
  "195/65 R15",
  "205/55 R16",
  "215/60 R16",
  "225/45 R17",
  "235/45 R18",
  "245/40 R18",
  "255/35 R19",
  "265/50 R20",
];
