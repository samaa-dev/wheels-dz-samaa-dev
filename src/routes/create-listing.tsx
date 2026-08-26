import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, CircleAlert, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/hooks/useApp";
import { getPostAuthRedirect, isProfileComplete, isSellerAccount } from "@/lib/auth/account";
import { hasPermission } from "@/lib/auth/permissions";
import {
  BRAND_MODEL_EXAMPLES,
  BRANDS,
  CONDITIONS,
  SIZE_EXAMPLE,
  SIZE_HELP_TEXT,
  type ListingCondition,
} from "@/lib/data/catalog";
import { getCommunes, WILAYAS } from "@/lib/data/wilayas";
import { STORAGE_KEYS, readStore, writeStore } from "@/lib/storage";

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
  condition: ListingCondition | "";
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
  condition: "",
  description: "",
  size: "",
  quantity: 4,
  wilaya: "",
  commune: "",
  images: [],
  cover: 0,
};

function CreateListingPage() {
  const { createListing, loginWithGoogle, user, hydrated, loading } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  type Errs = Partial<Record<"title" | "description" | "wilaya" | "images" | "condition", string>>;
  const [errors, setErrors] = useState<Errs>({});
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
      if (draft.title.trim().length < 5) e.title = "العنوان يجب أن يحتوي 5 أحرف على الأقل";
    }
    if (step === 1) {
      if (!draft.condition) e.condition = "اختر حالة الإطار";
      if (draft.description.trim().split(/\s+/).filter(Boolean).length > 500) {
        e.description = "الوصف يتجاوز 500 كلمة";
      }
    }
    if (step === 2) {
      if (!draft.wilaya) e.wilaya = "اختر الولاية";
    }
    if (step === 3 && (draft.images.length === 0 || imageFiles.length === 0)) {
      e.images = "أضف صورة واحدة على الأقل من جهازك";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep((s) => Math.min(s + 1, 4)); };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const accepted: string[] = [];
    const newFiles: File[] = [];
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
      newFiles.push(f);
    });
    setImageFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    set("images", [...draft.images, ...accepted].slice(0, 5));
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, j) => j !== index));
    set("images", draft.images.filter((_, j) => j !== index));
  };

  const submit = async () => {
    if (!user) return;
    if (!draft.condition) {
      toast.error("اختر حالة الإطار");
      return;
    }
    if (imageFiles.length === 0) {
      toast.error("أضف صورة واحدة على الأقل من جهازك");
      return;
    }
    setSubmitting(true);
    try {
      const size = draft.size.trim() || SIZE_EXAMPLE;
      const [wp = "205/55", dia = "16"] = size.split(" R");
      const [width = "205", profile = "55"] = wp.split("/");
      const yearNum = draft.year.trim() ? Number(draft.year) : undefined;
      const listingData = {
        ownerId: user.id,
        ownerName: user.displayName || user.name || "مستخدم",
        ownerPhone: user.phoneNumber || user.phone || "",
        ownerEmail: user.email || "",
        title: draft.title,
        category: "tire" as const,
        brand: draft.brand || "غير محدد",
        model: draft.model.trim() || "—",
        year: yearNum ?? 0,
        condition: draft.condition,
        price: 0,
        description: draft.description.trim(),
        size,
        width,
        profile,
        diameter: dia,
        wheelType: "tire" as const,
        isNegotiable: false,
        quantity: draft.quantity || 1,
        wilaya: draft.wilaya,
        commune: draft.commune.trim() || "—",
        imageUrls: [] as string[],
        coverImageUrl: "",
        images: [] as string[],
        sellerId: user.id,
        status: "pending" as const,
        visibility: "public" as const,
        isPromoted: false,
        featured: false,
        tags: [] as string[],
        features: [] as string[],
        warranty: { hasWarranty: false },
        keywords: [] as string[],
      };
      await createListing(listingData, imageFiles);
      writeStore(STORAGE_KEYS.draft, EMPTY);
      setImageFiles([]);
      toast.success("تم إرسال إعلانك للمراجعة — سيظهر بعد موافقة الإدارة");
      navigate({ to: "/my-listings" });
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "تعذّر نشر الإعلان، حاول مرة أخرى");
      } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">جارٍ التحميل...</div>;
  }

  if (!user) {
    const handleGoogle = async () => {
      try {
        const authUser = await loginWithGoogle();
        toast.success("مرحباً بك!");
        const target = getPostAuthRedirect(authUser, "/create-listing");
        navigate({ to: target.to, search: target.search });
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "حدث خطأ");
      }
    };

    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Card className="border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">انشر إعلانك مجاناً</CardTitle>
            <p className="text-sm text-muted-foreground">
              سجّل الدخول بجوجل لنشر إعلانك — سريع وآمن.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button className="h-12 gap-2 font-bold" disabled={loading} onClick={handleGoogle}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : (
                <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              متابعة مع Google
            </Button>
            <Button asChild variant="outline" className="h-12">
              <Link to="/register" search={{ redirect: "/create-listing" }}>إنشاء حساب</Link>
            </Button>
            <Button asChild variant="ghost" className="h-11">
              <Link to="/login" search={{ redirect: "/create-listing" }}>لديك حساب؟ سجّل الدخول</Link>
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
              <F label="الموديل (اختياري)">
                <Input className="h-12" value={draft.model} onChange={(e) => set("model", e.target.value)} placeholder={modelPlaceholder} />
              </F>
              <F label="سنة الصنع (اختياري)">
                <Input type="number" className="h-12" value={draft.year} onChange={(e) => set("year", e.target.value)} placeholder="مثال: 2022" />
              </F>
            </>
          )}

          {step === 1 && (
            <>
              <F label="الحالة" error={errors.condition}>
                <RadioGroup
                  value={draft.condition || undefined}
                  onValueChange={(v) => set("condition", v as ListingCondition)}
                  className="gap-3"
                >
                  {CONDITIONS.map((c) => (
                    <label key={c.value} className="flex items-start gap-3 rounded-md border border-border p-4">
                      <RadioGroupItem value={c.value} className="mt-1" />
                      <span><span className="block font-semibold">{c.label}</span><span className="text-sm text-muted-foreground">{c.description}</span></span>
                    </label>
                  ))}
                </RadioGroup>
              </F>
              <F label="الكمية (اختياري)"><Input type="number" className="h-12" value={draft.quantity} onChange={(e) => set("quantity", Number(e.target.value))} /></F>
              <F label="المقاس (اختياري)">
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
              <F label="الوصف (اختياري)" error={errors.description}>
                <Textarea rows={6} value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="اذكر حالة الإطار، سبب البيع، وإمكانية التوصيل... (اختياري)" />
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
              <F label="البلدية (اختياري)">
                <SearchableSelect
                  value={draft.commune}
                  onValueChange={(v) => set("commune", v)}
                  options={communeOptions}
                  placeholder="اختر البلدية (اختياري)"
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
                </div>
              </div>
              {errors.images && <p className="text-sm text-destructive">{errors.images}</p>}
              <div className="grid grid-cols-3 gap-3">
                {draft.images.map((img, i) => (
                  <div key={i} className={`relative overflow-hidden rounded-md border-2 ${draft.cover === i ? "border-primary" : "border-transparent"}`}>
                    <img src={img} alt={`صورة ${i + 1}`} className="aspect-square w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-background/85 p-1">
                      <button type="button" className="text-xs font-semibold text-primary" onClick={() => set("cover", i)}>غلاف</button>
                      <button type="button" onClick={() => removeImage(i)} aria-label="حذف">
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
                  ["الموديل", draft.model || "—"],
                  ["السنة", draft.year || "—"],
                  ["الحالة", CONDITIONS.find((c) => c.value === draft.condition)?.label ?? ""],
                  ["المقاس", draft.size || "—"],
                  ["الموقع", `${draft.wilaya}${draft.commune ? ` - ${draft.commune}` : ""}`],
                  ["عدد الصور", String(draft.images.length)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between rounded-md bg-muted/60 px-4 py-2">
                    <span className="text-muted-foreground">{k}</span><span className="font-semibold">{v || "—"}</span>
                  </div>
                ))}
              </div>
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
