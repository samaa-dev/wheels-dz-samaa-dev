import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useApp } from "@/hooks/useApp";
import { useAppDispatch } from "@/store/hooks";
import { updateProfileThunk } from "@/store/slices/authSlice";
import { ACCOUNT_TYPES, type AccountType } from "@/lib/auth/account";
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

function CompleteProfilePage() {
  const { user, loginWithGoogle, loading, hydrated } = useApp();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [form, setForm] = useState({
    name: user?.displayName || user?.name || "",
    phone: user?.phone || user?.phoneNumber || "",
    wilaya: user?.wilaya || "",
    accountType: (user?.accountType || "") as AccountType | "",
  });
  type Errs = Partial<Record<"name" | "phone" | "wilaya" | "accountType", string>>;
  const [errors, setErrors] = useState<Errs>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e: Errs = {};
    if (form.name.trim().length < 2) e.name = "الاسم مطلوب";
    if (!/^0[5-7][0-9]{8}$/.test(form.phone)) e.phone = "رقم هاتف جزائري غير صالح (مثال: 0555123456)";
    if (!form.wilaya) e.wilaya = "اختر ولايتك";
    if (!form.accountType) e.accountType = "اختر نوع الحساب";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;

    setSubmitting(true);
    try {
      const result = await dispatch(updateProfileThunk({
        displayName: form.name.trim(),
        name: form.name.trim(),
        phone: form.phone,
        phoneNumber: form.phone,
        wilaya: form.wilaya,
        accountType: form.accountType as AccountType,
        profileComplete: true,
      }));
      if (updateProfileThunk.fulfilled.match(result)) {
        toast.success("تم حفظ معلوماتك");
        navigate({ to: redirect || "/profile" });
      } else {
        toast.error("تعذّر حفظ المعلومات");
      }
    } finally {
      setSubmitting(false);
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
            <Button className="h-12 w-full" disabled={loading} onClick={async () => {
              try {
                await loginWithGoogle();
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "حدث خطأ");
              }
            }}>
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
          <p className="text-sm text-muted-foreground">بعد التسجيل بجوجل، أكمل هذه المعلومات للمتابعة.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Field label="الاسم" error={errors.name}>
              <Input className="h-12" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </Field>
            <Field label="رقم الهاتف" error={errors.phone}>
              <Input className="h-12" inputMode="tel" placeholder="0555123456" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
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
            <Field label="نوع الحساب" error={errors.accountType}>
              <RadioGroup
                value={form.accountType}
                onValueChange={(v) => setForm((p) => ({ ...p, accountType: v as AccountType }))}
                className="gap-3"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <label key={t.value} className="flex items-start gap-3 rounded-md border border-border p-4">
                    <RadioGroupItem value={t.value} className="mt-1" />
                    <span>
                      <span className="block font-semibold">{t.label}</span>
                      <span className="text-sm text-muted-foreground">{t.description}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </Field>
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
