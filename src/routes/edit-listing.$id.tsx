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
import { useAppDispatch } from "@/store/hooks";
import { updateListingThunk } from "@/store/slices/listingsSlice";
import { isProfileComplete, isSellerAccount } from "@/lib/auth/account";
import { hasPermission } from "@/lib/auth/permissions";
import {
  BRAND_MODEL_EXAMPLES,
  BRANDS,
  CONDITIONS,
  SIZE_EXAMPLE,
  SIZE_HELP_TEXT,
  normalizeCondition,
  type ListingCondition,
} from "@/lib/data/catalog";
import { fetchListingById } from "@/lib/firebase/listings";
import { getCommunes, WILAYAS } from "@/lib/data/wilayas";

export const Route = createFileRoute("/edit-listing/$id")({
  head: () => ({
    meta: [{ title: "تعديل الإعلان | عجلات الجزائر" }],
  }),
  component: EditListingPage,
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
  description: string;
  size: string;
  quantity: number;
  wilaya: string;
  commune: string;
  images: string[];
  cover: number;
}

function EditListingPage() {
  const { id } = Route.useParams();
  const { user, hydrated } = useApp();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [loadingListing, setLoadingListing] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  type Errs = Partial<Record<"title" | "description" | "wilaya" | "images", string>>;
  const [errors, setErrors] = useState<Errs>({});
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!hydrated || !user) {
        setLoadingListing(false);
        return;
      }
      const listing = await fetchListingById(id);
      if (!active) return;
      if (!listing || (listing.ownerId !== user.id && listing.sellerId !== user.id)) {
        setForbidden(true);
        setLoadingListing(false);
        return;
      }
      const urls = listing.imageUrls?.length ? listing.imageUrls : listing.images || [];
      setExistingUrls(urls);
      setDraft({
        title: listing.title,
        brand: listing.brand === "غير محدد" ? "" : listing.brand,
        model: listing.model === "—" ? "" : listing.model,
        year: listing.year ? String(listing.year) : "",
        condition: normalizeCondition(listing.condition),
        description: listing.description || "",
        size: listing.size || "",
        quantity: listing.quantity || 1,
        wilaya: listing.wilaya,
        commune: listing.commune === "—" ? "" : listing.commune,
        images: urls,
        cover: 0,
      });
      setLoadingListing(false);
    })();
    return () => {
      active = false;
    };
  }, [id, hydrated, user]);

  if (!hydrated || loadingListing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">
        جارٍ التحميل...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Card>
          <CardHeader>
            <CardTitle>سجّل الدخول لتعديل الإعلان</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild className="h-12 w-full">
              <Link to="/login" search={{ redirect: `/edit-listing/${id}` }}>تسجيل الدخول</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (forbidden || !draft) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Card>
          <CardHeader>
            <CardTitle>تعذّر تعديل هذا الإعلان</CardTitle>
            <p className="text-sm text-muted-foreground">الإعلان غير موجود أو لا تملك صلاحية تعديله.</p>
          </CardHeader>
          <CardContent>
            <Button asChild className="h-12 w-full">
              <Link to="/my-listings">العودة إلى إعلاناتي</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isProfileComplete(user) || (!hasPermission(user, "listings:create") && !isSellerAccount(user.accountType))) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Card>
          <CardHeader>
            <CardTitle>أكمل ملف البائع أولاً</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild className="h-12 w-full">
              <Link to="/complete-profile" search={{ redirect: `/edit-listing/${id}` }}>إكمال الملف</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((p) => (p ? { ...p, [k]: v } : p));

  const modelPlaceholder = draft.brand
    ? BRAND_MODEL_EXAMPLES[draft.brand] ?? "اسم الموديل"
    : "مثال: Pilot Sport 4";

  const communeOptions = getCommunes(draft.wilaya).map((c) => ({ value: c, label: c }));

  const validateStep = () => {
    const e: Errs = {};
    if (step === 0 && draft.title.trim().length < 5) {
      e.title = "العنوان يجب أن يحتوي 5 أحرف على الأقل";
    }
    if (step === 1 && draft.description.trim().split(/\s+/).filter(Boolean).length > 500) {
      e.description = "الوصف يتجاوز 500 كلمة";
    }
    if (step === 2 && !draft.wilaya) e.wilaya = "اختر الولاية";
    if (step === 3 && draft.images.length === 0 && imageFiles.length === 0) {
      e.images = "أبقِ صورة واحدة على الأقل أو أضف صوراً جديدة";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, 4));
  };

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
    const nextImages = [...draft.images, ...accepted].slice(0, 5);
    setImageFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    set("images", nextImages);
  };

  const removeImage = (index: number) => {
    const url = draft.images[index];
    const isExisting = url && existingUrls.includes(url);
    if (!isExisting) {
      const newFileIndex = draft.images.slice(0, index + 1).filter((u) => !existingUrls.includes(u)).length - 1;
      if (newFileIndex >= 0) {
        setImageFiles((prev) => prev.filter((_, j) => j !== newFileIndex));
      }
    }
    set("images", draft.images.filter((_, j) => j !== index));
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const size = draft.size.trim() || SIZE_EXAMPLE;
      const [wp = "205/55", dia = "16"] = size.split(" R");
      const [width = "205", profile = "55"] = wp.split("/");
      const keptExisting = draft.images.filter((u) => existingUrls.includes(u));
      const yearNum = draft.year.trim() ? Number(draft.year) : 0;

      const result = await dispatch(
        updateListingThunk({
          listingId: id,
          ownerId: user.id,
          images: imageFiles,
          updates: {
            title: draft.title,
            brand: draft.brand || "غير محدد",
            model: draft.model.trim() || "—",
            year: yearNum,
            condition: draft.condition,
            description: draft.description.trim(),
            size,
            width,
            profile,
            diameter: dia,
            quantity: draft.quantity || 1,
            wilaya: draft.wilaya,
            commune: draft.commune.trim() || "—",
            imageUrls: keptExisting,
            images: keptExisting,
            coverImageUrl: keptExisting[0] || "",
          },
        }),
      );

      if (!updateListingThunk.fulfilled.match(result)) {
        throw new Error(result.error?.message || "تعذّر حفظ التعديلات");
      }

      toast.success("تم تحديث الإعلان");
      navigate({ to: "/my-listings" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "تعذّر حفظ التعديلات");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-black">تعديل الإعلان</h1>
      <p className="mt-1 text-sm text-muted-foreground">حدّث بيانات إعلانك واحفظ التغييرات.</p>

      <div className="mt-6">
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-2" />
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`rounded-full px-3 py-1 ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-success/20 text-success-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {i + 1}. {s}
            </span>
          ))}
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <F label="عنوان الإعلان" error={errors.title}>
                <Input className="h-12" value={draft.title} onChange={(e) => set("title", e.target.value)} />
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
                <Input type="number" className="h-12" value={draft.year} onChange={(e) => set("year", e.target.value)} />
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
                      <span>
                        <span className="block font-semibold">{c.label}</span>
                        <span className="text-sm text-muted-foreground">{c.description}</span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </F>
              <F label="الكمية (اختياري)">
                <Input type="number" className="h-12" value={draft.quantity} onChange={(e) => set("quantity", Number(e.target.value))} />
              </F>
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
                <Textarea rows={6} value={draft.description} onChange={(e) => set("description", e.target.value)} />
              </F>
            </>
          )}

          {step === 2 && (
            <>
              <F label="الولاية" error={errors.wilaya}>
                <SearchableSelect
                  value={draft.wilaya}
                  onValueChange={(v) => {
                    set("wilaya", v);
                    set("commune", "");
                  }}
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
                onDrop={(e) => {
                  e.preventDefault();
                  addFiles(e.dataTransfer.files);
                }}
                className="grid place-items-center gap-3 rounded-lg border-2 border-dashed border-border p-10 text-center"
              >
                <ImagePlus className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">أضف صوراً جديدة أو احذف الحالية (5 كحد أقصى)</p>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
                <Button type="button" className="h-11" onClick={() => fileRef.current?.click()}>
                  اختر الصور
                </Button>
              </div>
              {errors.images && <p className="text-sm text-destructive">{errors.images}</p>}
              <div className="grid grid-cols-3 gap-3">
                {draft.images.map((img, i) => (
                  <div key={`${img}-${i}`} className="relative overflow-hidden rounded-md border-2 border-transparent">
                    <img src={img} alt={`صورة ${i + 1}`} className="aspect-square w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex justify-end bg-background/85 p-1">
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
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-semibold">{v || "—"}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between gap-2 pt-2">
            <Button variant="outline" className="h-12" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              السابق
            </Button>
            {step < 4 ? (
              <Button className="h-12" onClick={next}>
                التالي
              </Button>
            ) : (
              <Button className="h-12 gap-2" disabled={submitting} onClick={submit}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                حفظ التعديلات
              </Button>
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
