import heroImg from "@/assets/hero-wheels.jpg";
import rim1 from "@/assets/rim-1.jpg";
import rim2 from "@/assets/rim-2.jpg";
import tire1 from "@/assets/tire-1.jpg";
import tire2 from "@/assets/tire-2.jpg";
import set1 from "@/assets/set-1.jpg";
import { BRANDS, SIZES, type ListingCategory, type ListingCondition, type ListingStatus } from "./catalog";
import { WILAYAS } from "./wilayas";

export const IMAGE_POOL = {
  tire: [tire1, tire2, heroImg],
  rim: [rim1, rim2, heroImg],
  complete_set: [set1, rim2, tire1],
  accessories: [heroImg, rim1, tire1],
} satisfies Record<ListingCategory, string[]>;

// Legacy Seller interface - بقي للتوافق، يمكن حذفه لاحقاً
export interface Seller {
  id: string;
  name: string;
  phone: string;
  email: string;
  wilaya: string;
  rating: number;
  reviews: number;
  memberSince: string;
  avatarColor: string;
}

export interface Listing {
  // معرف الإعلان
  id: string; // auto-generated Firestore ID
  
  // معلومات المالك
  ownerId: string; // Firebase UID للمالك
  ownerName: string; // اسم المالك
  ownerPhone: string; // رقم هاتف المالك
  ownerEmail: string; // بريد المالك (اختياري)
  
  // معلومات أساسية
  title: string; // عنوان الإعلان
  description: string; // وصف مفصل
  category: ListingCategory; // "tire" | "rim" | "complete_set" | "accessories"
  
  // معلومات المنتج
  brand: string; // الماركة (Michelin, Continental, BMW, etc.)
  model: string; // الموديل
  year: number; // سنة الصنع
  condition: ListingCondition; // "new" | "excellent" | "good" | "fair" | "damaged"
  
  // المواصفات التقنية
  wheelType: string; // "tire" | "rim" | "complete_set"
  size: string; // المقاس (مثال: "205/55 R16")
  width: string; // العرض (205)
  profile: string; // الملف الجانبي (55)
  diameter: string; // القطر (16)
  loadIndex?: string; // مؤشر الحمولة (اختياري)
  speedRating?: string; // تصنيف السرعة (اختياري)
  
  // معلومات الجنوط (إذا كان rim أو complete_set)
  rimMaterial?: string; // "alloy" | "steel" | "carbon_fiber"
  rimColor?: string; // لون الجنوط
  boltPattern?: string; // نمط البراغي (5x114.3)
  offset?: string; // الإزاحة (ET45)
  
  // السعر والكمية  
  price: number; // السعر بالدينار الجزائري
  originalPrice?: number; // السعر الأصلي (اختياري)
  isNegotiable: boolean; // قابل للتفاوض
  quantity: number; // الكمية المتاحة
  
  // الموقع
  wilaya: string; // الولاية
  commune: string; // البلدية
  exactLocation?: string; // الموقع بالتفصيل (اختياري)
  coordinates?: { // إحداثيات GPS (اختياري)
    latitude: number;
    longitude: number;
  };
  
  // الصور
  imageUrls: string[]; // مصفوفة روابط الصور
  coverImageUrl: string; // الصورة الرئيسية
  
  // حالة الإعلان
  status: ListingStatus; // "active" | "sold" | "reserved" | "deleted" | "pending" | "blocked"
  visibility: 'public' | 'private' | 'limited'; // مستوى الرؤية
  isPromoted: boolean; // إعلان مدفوع/مميز
  promotionExpiresAt?: string; // انتهاء الترويج - ISO string
  
  // الإحصائيات
  views: number; // عدد المشاهدات
  contactClicks: number; // عدد نقرات الاتصال
  favorites: number; // عدد إضافات المفضلة
  shareCount: number; // عدد المشاركات
  
  // التواريخ
  createdAt: string; // تاريخ الإنشاء - ISO string
  publishedAt?: string; // تاريخ النشر - ISO string
  expiresAt?: string; // تاريخ انتهاء الإعلان - ISO string
  soldAt?: string; // تاريخ البيع (إذا تم البيع) - ISO string
  
  // معلومات إضافية
  tags: string[]; // علامات للبحث
  features: string[]; // ميزات إضافية
  warranty: {
    hasWarranty: boolean;
    duration?: string; // مدة الضمان
    details?: string; // تفاصيل الضمان
  };
  
  // معلومات SEO
  slug?: string; // URL slug
  metaDescription?: string; // وصف meta
  keywords: string[]; // كلمات مفتاحية

  /** توافق عكسي — استخدم ownerId */
  sellerId: string;
  /** توافق عكسي — استخدم imageUrls */
  images: string[];
  /** توافق عكسي — استخدم isPromoted */
  featured: boolean;
}

/** Deterministic PRNG so server and client render identical mock data. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20260817);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)] as T;
const between = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;

const FIRST_NAMES = [
  "محمد",
  "أحمد",
  "يوسف",
  "كريم",
  "سفيان",
  "بلال",
  "رياض",
  "عبد القادر",
  "ياسين",
  "أمين",
  "سمير",
  "نبيل",
  "فاطمة",
  "أمينة",
  "سارة",
  "نادية",
];
const LAST_NAMES = [
  "بن عمار",
  "زروقي",
  "بوعلام",
  "حمداني",
  "مرابط",
  "شريف",
  "بلقاسم",
  "قاسمي",
  "بوزيد",
  "لعروسي",
  "صحراوي",
  "بن ساسي",
];

export const SELLERS: Seller[] = Array.from({ length: 14 }, (_, i) => {
  const wilaya = pick(WILAYAS);
  return {
    id: `u${i + 1}`,
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    phone: `0${pick(["5", "6", "7"])}${between(10000000, 99999999)}`,
    email: `seller${i + 1}@djazair-wheels.dz`,
    wilaya: wilaya.name,
    rating: Math.round((3.5 + rnd() * 1.5) * 10) / 10,
    reviews: between(4, 180),
    memberSince: new Date(2019 + between(0, 5), between(0, 11), between(1, 28)).toISOString(),
    avatarColor: pick(["#2563eb", "#0f766e", "#7c3aed", "#b45309", "#be123c"]),
  };
});

const DESCRIPTIONS = [
  "المنتج في حالة ممتازة، تم استعماله لمسافة قصيرة فقط. البيع بسبب تغيير السيارة. إمكانية المعاينة قبل الشراء.",
  "سلعة أصلية مستوردة، مع ضمان الجودة. التسليم يد بيد في الولاية أو عبر شركة التوصيل على حساب المشتري.",
  "طقم نظيف جداً بدون أي ضربات أو تشققات، صالح للاستعمال مباشرة. السعر قابل للتفاوض بشكل بسيط.",
  "إطارات بمطاط طري وأداء ممتاز على الطرقات السريعة، مناسبة لفصلي الصيف والشتاء.",
  "جنوط ألمنيوم خفيفة الوزن تعطي مظهراً رياضياً للسيارة، مع أغطية البراغي الأصلية.",
  "متوفر بكميات، مناسب للمحلات وتجار قطع الغيار. أسعار خاصة عند شراء أكثر من طقم.",
];

const TITLE_PREFIX: Record<ListingCategory, string[]> = {
  tire: ["إطارات", "أربع إطارات", "طقم إطارات"],
  rim: ["جنوط", "طقم جنوط ألمنيوم", "جنوط رياضية"],
  complete_set: ["طقم كامل جنوط وإطارات", "أربع عجلات كاملة", "طقم عجلات"],
  accessories: ["إكسسوارات", "قطع غيار", "أغطية براغي"],
};

function buildListing(i: number): Listing {
  const category: ListingCategory = "tire";
  const brand = pick(BRANDS.filter((b) => b !== "أخرى"));
  const size = pick(SIZES);
  const [wp = "205/55", dia = "16"] = size.split(" R");
  const [widthNum = 205, profileNum = 55] = wp.split("/").map(Number) as number[];
  const wilaya = pick(WILAYAS);
  const condition = pick(["new", "like_new", "used"] as const);
  const base = 20000;
  const factor = { new: 1.6, like_new: 1.25, used: 0.85 }[condition];
  const price = Math.round((base * factor + between(0, 40000)) / 500) * 500;
  const seller = pick(SELLERS);
  const images = IMAGE_POOL[category];
  const daysAgo = between(0, 120);
  const createdAt = new Date(Date.UTC(2026, 7, 17) - daysAgo * 86400000).toISOString();
  
  return {
    id: `L${1000 + i}`,
    
    // معلومات المالك
    ownerId: seller.id,
    ownerName: seller.name,
    ownerPhone: seller.phone,
    ownerEmail: seller.email,
    
    // معلومات أساسية
    title: `${pick(TITLE_PREFIX[category])} ${brand} مقاس ${size}`,
    description: `${pick(DESCRIPTIONS)} ${pick(DESCRIPTIONS)}`,
    category,
    
    // معلومات المنتج
    brand,
    model: `${brand} ${pick(["Sport", "Eco", "Pro", "Line", "GT", "Classic"])} ${between(1, 9)}`,
    year: between(2015, 2025),
    condition,
    
    // المواصفات التقنية
    wheelType: "tire",
    size,
    width: widthNum.toString(),
    profile: profileNum.toString(),
    diameter: dia,
    loadIndex: between(80, 120).toString(),
    speedRating: pick(["H", "V", "W", "Y"]),
    
    // معلومات الجنوط (للجنوط والأطقم الكاملة)
    ...(category === "rim" || category === "complete_set" ? {
      rimMaterial: pick(["alloy", "steel"]),
      rimColor: pick(["silver", "black", "gunmetal", "white"]),
      boltPattern: pick(["5x114.3", "4x100", "5x120", "4x108"]),
      offset: `ET${between(30, 55)}`,
    } : {}),
    
    // السعر والكمية
    price,
    ...(condition === "new" ? {} : { originalPrice: price * 1.3 }),
    isNegotiable: i % 3 !== 0,
    quantity: pick([1, 2, 4, 4, 4]),
    
    // الموقع
    wilaya: wilaya.name,
    commune: pick(wilaya.communes),
    
    // الصور
    imageUrls: [images[0]!, images[1]!, images[2]!, images[(i % 2) + 1]!],
    coverImageUrl: images[0]!,
    
    // حالة الإعلان
    status: "active",
    visibility: "public" as const,
    isPromoted: i % 7 === 0,
    ...(i % 7 === 0 ? { promotionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() } : {}),
    
    // الإحصائيات
    views: between(20, 4200),
    contactClicks: between(1, 50),
    favorites: between(0, 25),
    shareCount: between(0, 10),
    
    // التواريخ
    createdAt,
    publishedAt: createdAt,
    
    // معلومات إضافية
    tags: [brand.toLowerCase(), category, condition, wilaya.name.toLowerCase()],
    features: category === "rim" ? ["أصلي", "خفيف الوزن"] : category === "tire" ? ["مقاوم للاهتراء", "آمن"] : [],
    warranty: condition === "new" && i % 4 === 0 
      ? {
          hasWarranty: true,
          duration: "6 أشهر",
          details: "ضمان ضد عيوب الصناعة",
        }
      : {
          hasWarranty: false,
        },
    
    // معلومات SEO
    keywords: [brand.toLowerCase(), category, size.toLowerCase()],
    
    // Legacy fields for backward compatibility
    sellerId: seller.id,
    images: [images[0]!, images[1]!, images[2]!, images[(i % 2) + 1]!],
    featured: i % 7 === 0,
  };
}

export const MOCK_LISTINGS: Listing[] = Array.from({ length: 56 }, (_, i) => buildListing(i));

export const getSeller = (id: string): Seller => SELLERS.find((s) => s.id === id) ?? SELLERS[0]!;

export const PLATFORM_STATS = {
  listings: MOCK_LISTINGS.length * 47,
  users: 8_940,
  deals: 3_215,
  wilayas: WILAYAS.length,
};