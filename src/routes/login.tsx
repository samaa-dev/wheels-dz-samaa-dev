import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/hooks/useApp";
import { getPostAuthRedirect } from "@/lib/auth/account";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | عجلات الجزائر" },
      { name: "description", content: "سجّل دخولك بجوجل لإدارة إعلاناتك ومفضلتك على سوق عجلات الجزائر." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { loginWithGoogle, loading, user, hydrated } = useApp();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  const handleGoogleLogin = async () => {
    try {
      const authUser = await loginWithGoogle();
      toast.success("مرحباً بك!");
      navigate({ to: getPostAuthRedirect(authUser, redirect) });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    }
  };

  useEffect(() => {
    if (hydrated && user?.profileComplete) {
      navigate({ to: redirect || "/profile" });
    }
  }, [hydrated, user, redirect, navigate]);

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
          <p className="text-sm text-muted-foreground">استخدم حساب Google للدخول بسرعة وأمان.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGoogleLogin} disabled={loading} className="h-12 w-full gap-2 text-base font-bold">
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
          <p className="text-center text-sm text-muted-foreground">
            ليس لديك حساب؟ <Link to="/register" search={redirect ? { redirect } : undefined} className="font-semibold text-primary">أنشئ حساباً</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
