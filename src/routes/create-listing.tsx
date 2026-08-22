import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, CircleAlert, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/hooks/useApp";
import { isProfileComplete, isSellerAccount } from "@/lib/auth/account";
import { hasPermission } from "@/lib/auth/permissions";
import {
  BRAND_MODEL_EXAMPLES,
  BRANDS,
  CONDITIONS,
  SIZE_EXAMPLE,
  SIZE_HELP_TEXT,
  type ListingCondition,
} from "@/lib/data/catalog";
import { IMAGE_POOL, type Listing } from "@/lib/data/mock";
import { getCommunes, WILAYAS } from "@/lib/data/wilayas";
import { STORAGE_KEYS, delay, readStore, writeStore } from "@/lib/storage";

export const Route = createFileRoute("/create-listing")({
  head: () => ({
    meta: [
      { title: "أضف إعلانك | عجلات الجزائر" },
      { name: "description", content: "انشر إعلان إطارات في 5 خطوات بسيطة مع حفظ تلقائي للمسودة." },
    ],
  }),
  component: CreateListingPage,
});

const STEPS = ["المعلومات الأساسية", "التفاصيل", "الموقع", "الصور", "المراجعة"];

const WILAYA_OPTIONS = WILAYAS.map((w) => ({
  value: w.name,
  label: `${w.code} - ${w.name}`,
  keywords: w.name,
}));

const BRAND_OPTIONS = BRANDS.map((b) => ({ value: b, label: b }));

interface Draft {
  title: string;
  brand: string;
  model: string;
  year: string;
  condition: ListingCondition;
  price: number;
  description: string;
  size: string;
  quantity: number;
  wilaya: string;
  commune: string;
  images: string[];
  cover: number;
}

const EMPTY: Draft = {
  title: "",
  brand: "",
  model: "",
  year: "",
  condition: "used",
  price: 0,
  description: "",
  size: "",
  quantity: 4,
  wilaya: "",
  commune: "",
  images: [],
  cover: 0,
};

function CreateListingPage() {
  const { saveListing, user, hydrated } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  type Errs = Partial<Record<"title" | "model" | "price" | "description" | "size" | "wilaya" | "commune" | "images", string>>;
  const [errors, setErrors] = useState<Errs>({});
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(readStore<Draft>(STORAGE_KEYS.draft, EMPTY)); }, []);
  useEffect(() => { writeStore(STORAGE_KEYS.draft, draft); }, [draft]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((p) => ({ ...p, [k]: v }));

  const modelPlaceholder = draft.brand
    ? BRAND_MODEL_EXAMPLES[draft.brand] ?? "اسم الموديل"
    : "مثال: Pilot Sport 4";

  const communeOptions = getCommunes(draft.wilaya).map((c) => ({ value: c, label: c }));

  const validateStep = () => {
    const e: Errs = {};
    if (step === 0) {
      if (draft.title.trim().length < 10) e.title = "العنوان يجب أن يحتوي 10 أحرف على الأقل";
      if (!draft.model.trim()) e.model = "أدخل اسم الموديل";
    }
    if (step === 1) {
      if (draft.price <= 0) e.price = "أدخل سعراً صحيحاً";
      if (!draft.size.trim()) e.size = "أدخل المقاس";
      if (draft.description.trim().split(/\s+/).filter(Boolean).length > 500) e.description = "الوصف يتجاوز 500 كلمة";
      if (draft.description.trim().length < 20) e.description = "الوصف قصير جداً";
    }
    if (step === 2) {
      if (!draft.wilaya) e.wilaya = "اختر الولاية";
      if (!draft.commune) e.commune = "اختر البلدية";
    }
    if (step === 3 && draft.images.length === 0) e.images = "أضف صورة واحدة على الأقل";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep((s) => Math.min(s + 1, 4)); };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const accepted: string[] = [];
    Array.from(files).forEach((f) => {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name}: صيغة غير مدعومة`);
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name}: الحجم يتجاوز 5 ميغابايت`);
        return;
      }
      accepted.push(URL.createObjectURL(f));
    });
    set("images", [...draft.images, ...accepted].slice(0, 5));
  };

  const usePlaceholder = () => set("images", IMAGE_POOL.tire.slice(0, 3));

  const submit = async () => {
    if (!terms) {
      toast.error("يجب الموافقة على الشروط");
      return;
    }
    if (!user) return;
    setSubmitting(true);
    await delay(800);
    const size = draft.size.trim() || SIZE_EXAMPLE;
    const [wp = "205/55", dia = "16"] = size.split(" R");
    const [width = "205", profile = "55"] = wp.split("/");
    const imageUrls = draft.images.length ? draft.images : IMAGE_POOL.tire;
    const yearNum = draft.year.trim() ? Number(draft.year) : undefined;
    const listing: Listing = {
      id: `MY${Date.now()}`,
      ownerId: user.id,
      ownerName: user.displayName || user.name || "مستخدم",
      ownerPhone: user.phoneNumber || user.phone || "",
      ownerEmail: user.email || "",
      title: draft.title,
      category: "tire",
      brand: draft.brand || "غير محدد",
      model: draft.model,
      year: yearNum ?? 0,
      condition: draft.condition,
      price: draft.price,
      description: draft.description,
      size,
      width,
      profile,
      diameter: dia,
      wheelType: "tire",
      isNegotiable: false,
      quantity: draft.quantity,
      wilaya: draft.wilaya,
      commune: draft.commune,
      createdAt: new Date().toISOString(),
      views: 0,
      contactClicks: 0,
      favorites: 0,
      shareCount: 0,
      imageUrls,
      coverImageUrl: imageUrls[0] || "",
      images: imageUrls,
      sellerId: user.id,
      status: "active",
      visibility: "public",
      isPromoted: false,
      featured: false,
      tags: [],
      features: [],
      warranty: { hasWarranty: false },
      keywords: [],
    };
    saveListing(listing);
    writeStore(STORAGE_KEYS.draft, EMPTY);
    setSubmitting(false);
    toast.success("تم نشر إعلانك بنجاح");
    navigate({ to: "/my-listings" });
  };

  if (!hydrated) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">جارٍ التحميل...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">سجّل الدخول لنشر إعلان</CardTitle>
            <p className="text-sm text-muted-foreground">يجب إنشاء حساب أو تسجيل الدخول قبل إضافة إعلان.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild className="h-12 font-bold">
              <Link to="/register" search={{ redirect: "/create-listing" }}>إنشاء حساب</Link>
            </Button>
            <Button asChild variant="outline" className="h-12">
              <Link to="/login" search={{ redirect: "/create-listing" }}>تسجيل الدخول</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isProfileComplete(user)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">أكمل ملفك أولاً</CardTitle>
            <p className="text-sm text-muted-foreground">أكمل اسمك، هاتفك، ولايتك ونوع حسابك قبل نشر إعلان.</p>
          </CardHeader>
          <CardContent>
            <Button asChild className="h-12 w-full font-bold">
              <Link to="/complete-profile" search={{ redirect: "/create-listing" }}>إكمال الملف</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasPermission(user, "listings:create") && !isSellerAccount(user.accountType)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">حساب مشتري</CardTitle>
            <p className="text-sm text-muted-foreground">لنشر إعلانات، غيّر نوع حسابك إلى بائع عادي أو تاجر من ملفك الشخصي.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild className="h-12 font-bold">
              <Link to="/complete-profile" search={{ redirect: "/create-listing" }}>تفعيل حساب بائع</Link>
            </Button>
            <Button asChild variant="outline" className="h-12">
              <Link to="/profile">الملف الشخصي</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-black">أضف إعلاناً جديداً</h1>
      <p className="mt-1 text-sm text-muted-foreground">يتم حفظ مسودتك تلقائياً على هذا الجهاز.</p>

      <div className="mt-6">
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-2" />
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {STEPS.map((s, i) => (
            <span key={s} className={`rounded-full px-3 py-1 ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-success/20 text-success-foreground" : "bg-muted text-muted-foreground"}`}>
              {i + 1}. {s}
            </span>
          ))}
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">{STEPS[step]}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <F label="عنوان الإعلان" error={errors.title}>
                <Input className="h-12" value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="مثال: أربع إطارات Michelin مقاس 205/55 R16" />
              </F>
              <F label="الشركة المصنعة (اختياري)">
                <SearchableSelect
                  value={draft.brand}
                  onValueChange={(v) => set("brand", v)}
                  options={BRAND_OPTIONS}
                  placeholder="اختر الماركة (اختياري)"
                  searchPlaceholder="ابحث عن ماركة..."
                  triggerClassName="h-12"
                />
              </F>
              <F label="الموديل" error={errors.model}>
                <Input className="h-12" value={draft.model} onChange={(e) => set("model", e.target.value)} placeholder={modelPlaceholder} />
              </F>
              <F label="سنة الصنع (اختياري)">
                <Input type="number" className="h-12" value={draft.year} onChange={(e) => set("year", e.target.value)} placeholder="مثال: 2022" />
              </F>
            </>
          )}

          {step === 1 && (
            <>
              <F label="الحالة">
                <RadioGroup value={draft.condition} onValueChange={(v) => set("condition", v as ListingCondition)} className="gap-3">
                  {CONDITIONS.map((c) => (
                    <label key={c.value} className="flex items-start gap-3 rounded-md border border-border p-4">
                      <RadioGroupItem value={c.value} className="mt-1" />
                      <span><span className="block font-semibold">{c.label}</span><span className="text-sm text-muted-foreground">{c.description}</span></span>
                    </label>
                  ))}
                </RadioGroup>
              </F>
              <F label="السعر (دج)" error={errors.price}><Input type="number" className="h-12" value={draft.price} onChange={(e) => set("price", Number(e.target.value))} /></F>
              <F label="الكمية"><Input type="number" className="h-12" value={draft.quantity} onChange={(e) => set("quantity", Number(e.target.value))} /></F>
              <F label="المقاس" error={errors.size}>
                <div className="flex items-center gap-2">
                  <Input className="h-12 flex-1" value={draft.size} onChange={(e) => set("size", e.target.value)} placeholder={`مثال: ${SIZE_EXAMPLE}`} />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="icon" className="size-12 shrink-0" aria-label="شرح المقاس">
                        <CircleAlert className="size-5 text-primary" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="max-w-xs text-sm leading-6" align="end">
                      {SIZE_HELP_TEXT}
                    </PopoverContent>
                  </Popover>
                </div>
              </F>
              <F label="الوصف" error={errors.description}>
                <Textarea rows={6} value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="اذكر حالة الإطار، سبب البيع، وإمكانية التوصيل..." />
                <p className="mt-1 text-xs text-muted-foreground">{draft.description.trim().split(/\s+/).filter(Boolean).length} / 500 كلمة</p>
              </F>
            </>
          )}

          {step === 2 && (
            <>
              <F label="الولاية" error={errors.wilaya}>
                <SearchableSelect
                  value={draft.wilaya}
                  onValueChange={(v) => { set("wilaya", v); set("commune", ""); }}
                  options={WILAYA_OPTIONS}
                  placeholder="اختر الولاية"
                  searchPlaceholder="ابحث عن ولاية..."
                  triggerClassName="h-12"
                />
              </F>
              <F label="البلدية" error={errors.commune}>
                <SearchableSelect
                  value={draft.commune}
                  onValueChange={(v) => set("commune", v)}
                  options={communeOptions}
                  placeholder="اختر البلدية"
                  searchPlaceholder="ابحث عن بلدية..."
                  disabled={!draft.wilaya}
                  triggerClassName="h-12"
                />
              </F>
            </>
          )}

          {step === 3 && (
            <>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                className="grid place-items-center gap-3 rounded-lg border-2 border-dashed border-border p-10 text-center"
              >
                <ImagePlus className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">اسحب الصور هنا أو اخترها (5 صور كحد أقصى، 5 ميغابايت لكل صورة)</p>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
                <div className="flex gap-2">
                  <Button type="button" className="h-11" onClick={() => fileRef.current?.click()}>اختر الصور</Button>
                  <Button type="button" variant="outline" className="h-11" onClick={usePlaceholder}>استخدم صوراً نموذجية</Button>
                </div>
              </div>
              {errors.images && <p className="text-sm text-destructive">{errors.images}</p>}
              <div className="grid grid-cols-3 gap-3">
                {draft.images.map((img, i) => (
                  <div key={i} className={`relative overflow-hidden rounded-md border-2 ${draft.cover === i ? "border-primary" : "border-transparent"}`}>
                    <img src={img} alt={`صورة ${i + 1}`} className="aspect-square w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-background/85 p-1">
                      <button type="button" className="text-xs font-semibold text-primary" onClick={() => set("cover", i)}>غلاف</button>
                      <button type="button" onClick={() => set("images", draft.images.filter((_, j) => j !== i))} aria-label="حذف">
                        <Trash2 className="size-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="space-y-2 text-sm">
                {[
                  ["العنوان", draft.title],
                  ["الشركة المصنعة", draft.brand || "—"],
                  ["الموديل", draft.model],
                  ["السنة", draft.year || "—"],
                  ["الحالة", CONDITIONS.find((c) => c.value === draft.condition)?.label ?? ""],
                  ["السعر", `${draft.price} دج`],
                  ["المقاس", draft.size || SIZE_EXAMPLE],
                  ["الموقع", `${draft.wilaya} - ${draft.commune}`],
                  ["عدد الصور", String(draft.images.length)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between rounded-md bg-muted/60 px-4 py-2">
                    <span className="text-muted-foreground">{k}</span><span className="font-semibold">{v || "—"}</span>
                  </div>
                ))}
              </div>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox checked={terms} onCheckedChange={(v) => setTerms(Boolean(v))} />
                <span>أقر بأن المعلومات صحيحة وأوافق على شروط النشر.</span>
              </label>
            </>
          )}

          <div className="flex justify-between gap-2 pt-2">
            <Button variant="outline" className="h-12" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>السابق</Button>
            {step < 4 ? (
              <Button className="h-12" onClick={next}>التالي</Button>
            ) : (
              <Button className="h-12 gap-2" disabled={submitting} onClick={submit}><Check className="size-4" /> نشر الإعلان</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
