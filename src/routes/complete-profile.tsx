import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, ShoppingBag, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useApp } from "@/hooks/useApp";
import { useAppDispatch } from "@/store/hooks";
import { updateProfileThunk } from "@/store/slices/authSlice";
import {
  getPostAuthRedirect,
  getPostProfileRedirect,
  SELLER_ACCOUNT_TYPES,
  type AccountType,
} from "@/lib/auth/account";
import { WILAYAS } from "@/lib/data/wilayas";

const WILAYA_OPTIONS = WILAYAS.map((w) => ({
  value: w.name,
  label: `${w.code} - ${w.name}`,
  keywords: w.name,
}));

export const Route = createFileRoute("/complete-profile")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [{ title: "إكمال الملف | عجلات الجزائر" }],
  }),
  component: CompleteProfilePage,
});

type RoleChoice = "" | "buyer" | "seller";

function CompleteProfilePage() {
  const { user, loginWithGoogle, loading, hydrated } = useApp();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [form, setForm] = useState({
    name: user?.displayName || user?.name || "",
    phone: user?.phone || user?.phoneNumber || "",
    wilaya: user?.wilaya || "",
  });
  const [roleChoice, setRoleChoice] = useState<RoleChoice>(() => {
    if (user?.accountType === "buyer") return "buyer";
    if (user?.accountType === "seller_individual" || user?.accountType === "seller_merchant") return "seller";
    return "";
  });
  const [sellerType, setSellerType] = useState<AccountType | "">(() => {
    if (user?.accountType === "seller_individual" || user?.accountType === "seller_merchant") {
      return user.accountType;
    }
    return "";
  });
  type Errs = Partial<Record<"name" | "phone" | "wilaya" | "role" | "sellerType", string>>;
  const [errors, setErrors] = useState<Errs>({});
  const [submitting, setSubmitting] = useState(false);

  const resolvedAccountType = (): AccountType | "" => {
    if (roleChoice === "buyer") return "buyer";
    if (roleChoice === "seller") return sellerType;
    return "";
  };

  const validate = () => {
    const e: Errs = {};
    if (form.name.trim().length < 2) e.name = "الاسم مطلوب";
    if (!/^0[5-7][0-9]{8}$/.test(form.phone)) e.phone = "رقم هاتف جزائري غير صالح (مثال: 0555123456)";
    if (!form.wilaya) e.wilaya = "اختر ولايتك";
    if (!roleChoice) e.role = "اختر: مشتري أم بائع";
    if (roleChoice === "seller" && !sellerType) e.sellerType = "اختر نوع حساب البائع";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;

    const accountType = resolvedAccountType();
    if (!accountType) return;

    setSubmitting(true);
    try {
      const result = await dispatch(
        updateProfileThunk({
          displayName: form.name.trim(),
          name: form.name.trim(),
          phone: form.phone,
          phoneNumber: form.phone,
          wilaya: form.wilaya,
          accountType,
          profileComplete: true,
        }),
      );
      if (updateProfileThunk.fulfilled.match(result)) {
        toast.success("تم حفظ معلوماتك");
        const target = getPostProfileRedirect(accountType, redirect);
        navigate({ to: target.to, search: target.search });
      } else {
        toast.error("تعذّر حفظ المعلومات");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const authUser = await loginWithGoogle();
      toast.success("مرحباً بك!");
      const target = getPostAuthRedirect(authUser, redirect);
      navigate({ to: target.to, search: target.search });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    }
  };

  if (!hydrated) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14 text-center">
        <Card>
          <CardHeader>
            <CardTitle>أكمل تسجيلك</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">سجّل الدخول بجوجل أولاً ثم أكمل معلوماتك.</p>
            <Button className="h-12 w-full" disabled={loading} onClick={handleGoogleLogin}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              متابعة مع Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">أكمل ملفك الشخصي</CardTitle>
          <p className="text-sm text-muted-foreground">
            بعد التسجيل بجوجل، أكمل هذه المعلومات للمتابعة.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5 select-text">
            <Field label="الاسم" error={errors.name}>
              <Input
                className="h-12 select-text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </Field>
            <Field label="رقم الهاتف" error={errors.phone}>
              <Input
                className="h-12 select-text"
                inputMode="tel"
                placeholder="0555123456"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </Field>
            <Field label="الولاية" error={errors.wilaya}>
              <SearchableSelect
                value={form.wilaya}
                onValueChange={(v) => setForm((p) => ({ ...p, wilaya: v }))}
                options={WILAYA_OPTIONS}
                placeholder="اختر الولاية"
                searchPlaceholder="ابحث عن ولاية..."
                triggerClassName="h-12"
              />
            </Field>

            <Field label="أنت" error={errors.role}>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setRoleChoice("buyer");
                    setSellerType("");
                  }}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-center transition-colors ${
                    roleChoice === "buyer"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <ShoppingBag className="size-8 text-primary" />
                  <span className="font-bold">مشتري</span>
                  <span className="text-xs text-muted-foreground">تصفح وتواصل مع البائعين</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoleChoice("seller")}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-center transition-colors ${
                    roleChoice === "seller"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <Store className="size-8 text-primary" />
                  <span className="font-bold">بائع</span>
                  <span className="text-xs text-muted-foreground">أريد نشر إعلانات للبيع</span>
                </button>
              </div>
            </Field>

            {roleChoice === "seller" && (
              <Field label="نوع حساب البائع" error={errors.sellerType}>
                <div className="grid gap-3">
                  {SELLER_ACCOUNT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setSellerType(t.value)}
                      className={`flex items-start gap-3 rounded-md border-2 p-4 text-start transition-colors ${
                        sellerType === t.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span
                        className={`mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                          sellerType === t.value ? "border-primary" : "border-muted-foreground"
                        }`}
                        aria-hidden
                      >
                        {sellerType === t.value ? (
                          <span className="size-2 rounded-full bg-primary" />
                        ) : null}
                      </span>
                      <span>
                        <span className="block font-semibold">{t.label}</span>
                        <span className="text-sm text-muted-foreground">{t.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <Button type="submit" disabled={loading || submitting} className="h-12 w-full">
              {(loading || submitting) && <Loader2 className="size-4 animate-spin" />}
              حفظ والمتابعة
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
