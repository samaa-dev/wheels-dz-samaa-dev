import { Link, createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Loader2, Megaphone, Star, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/hooks/useApp";
import { getPendingReviews } from "@/lib/firebase/reviews";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAdminStatsThunk, selectAdminStats, selectStatsLoading } from "@/store/slices/adminSlice";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "لوحة الملخص | إدارة عجلات الجزائر" }] }),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const { user } = useApp();
  const dispatch = useAppDispatch();
  const stats = useAppSelector(selectAdminStats);
  const loading = useAppSelector(selectStatsLoading);
  const [pendingReviews, setPendingReviews] = useState(0);

  useEffect(() => {
    if (!user) return;
    void dispatch(fetchAdminStatsThunk(user));
    void getPendingReviews()
      .then((list) => setPendingReviews(list.length))
      .catch(() => setPendingReviews(0));
  }, [dispatch, user]);

  const cards = [
    {
      label: "مستخدمون نشطون",
      value: stats?.users.active ?? "—",
      icon: Users,
      to: "/admin/users" as const,
    },
    {
      label: "إعلانات بانتظار القبول",
      value: stats?.listings.pending ?? "—",
      icon: Megaphone,
      to: "/admin/listings" as const,
    },
    {
      label: "تقييمات معلّقة",
      value: pendingReviews,
      icon: Star,
      to: "/admin/reviews" as const,
    },
    {
      label: "إعلانات نشطة",
      value: stats?.listings.active ?? "—",
      icon: ClipboardList,
      to: "/admin/stats" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">ملخص سريع</h2>
        <p className="text-sm text-muted-foreground">نظرة عامة على المنصة والطوابير المعلقة</p>
      </div>

      {loading && !stats ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <c.icon className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black">{c.value}</div>
                <Button asChild variant="link" className="mt-2 h-auto px-0">
                  <Link to={c.to}>عرض التفاصيل</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button asChild className="h-11 font-bold">
          <Link to="/admin/listings">مراجعة الإعلانات</Link>
        </Button>
        <Button asChild variant="outline" className="h-11">
          <Link to="/admin/reviews">مراجعة التقييمات</Link>
        </Button>
        <Button asChild variant="outline" className="h-11">
          <Link to="/admin/users">إدارة المستخدمين</Link>
        </Button>
      </div>
    </div>
  );
}
