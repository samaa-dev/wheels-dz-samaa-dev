import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useApp } from "@/hooks/useApp";
import { getPostAuthRedirect } from "@/lib/auth/account";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "إنشاء حساب | عجلات الجزائر" },
      { name: "description", content: "أنشئ حسابك المجاني عبر Google وابدأ بتصفح أو نشر إعلانات الإطارات." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { loginWithGoogle, loading } = useApp();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState("");

  const handleGoogleRegister = async () => {
    if (!terms) {
      setTermsError("يجب الموافقة على الشروط");
      return;
    }
    setTermsError("");
    try {
      const authUser = await loginWithGoogle();
      toast.success("مرحباً بك!");
      const target = getPostAuthRedirect(authUser, redirect);
      navigate({ to: target.to, search: target.search });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <div className="mb-8 flex justify-center">
        <Link to="/" aria-label="عجلات الجزائر — الرئيسية">
          <BrandLogo size="xl" stacked />
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">إنشاء حساب جديد</CardTitle>
          <p className="text-sm text-muted-foreground">التسجيل عبر Google — ثم أكمل اسمك، هاتفك، ولايتك ونوع حسابك.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <Checkbox checked={terms} onCheckedChange={(v) => setTerms(Boolean(v))} />
            <span>أوافق على شروط الاستخدام وسياسة الخصوصية</span>
          </label>
          {termsError && <p className="text-sm text-destructive">{termsError}</p>}

          <Button onClick={handleGoogleRegister} disabled={loading} className="h-12 w-full gap-2 text-base font-bold">
            {loading ? <Loader2 className="size-4 animate-spin" /> : (
              <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            التسجيل بجوجل
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            لديك حساب؟ <Link to="/login" search={redirect ? { redirect } : undefined} className="font-semibold text-primary">سجّل الدخول</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
