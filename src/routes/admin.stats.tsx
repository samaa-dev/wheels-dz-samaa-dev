import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/hooks/useApp";
import { getViewsInPeriod, type ViewsPeriod } from "@/lib/firebase/admin";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAdminStatsThunk, selectAdminStats, selectStatsLoading } from "@/store/slices/adminSlice";

export const Route = createFileRoute("/admin/stats")({
  head: () => ({ meta: [{ title: "إحصائيات الإدارة | عجلات الجزائر" }] }),
  component: AdminStatsPage,
});

const PERIOD_LABEL: Record<ViewsPeriod, string> = {
  today: "اليوم",
  "7d": "آخر 7 أيام",
  "30d": "آخر 30 يوماً",
  all: "كل الوقت",
};

function AdminStatsPage() {
  const { user } = useApp();
  const dispatch = useAppDispatch();
  const stats = useAppSelector(selectAdminStats);
  const loading = useAppSelector(selectStatsLoading);
  const [period, setPeriod] = useState<ViewsPeriod>("7d");
  const [periodViews, setPeriodViews] = useState<{ total: number; byDay: { date: string; count: number }[] } | null>(null);
  const [viewsLoading, setViewsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    void dispatch(fetchAdminStatsThunk(user));
  }, [dispatch, user]);

  useEffect(() => {
    if (!user) return;
    setViewsLoading(true);
    void getViewsInPeriod(user, period)
      .then(setPeriodViews)
      .catch(() => setPeriodViews({ total: 0, byDay: [] }))
      .finally(() => setViewsLoading(false));
  }, [user, period]);

  const periodTotal = useMemo(() => {
    if (periodViews) return periodViews.total;
    if (!stats) return 0;
    if (period === "today") return stats.views.today;
    if (period === "7d") return stats.views.last7Days;
    if (period === "30d") return stats.views.last30Days;
    return stats.views.allTime;
  }, [period, periodViews, stats]);

  if (loading && !stats) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return <p className="py-12 text-center text-muted-foreground">تعذّر تحميل الإحصائيات.</p>;
  }

  const blocks = [
    {
      title: "المستخدمون",
      items: [
        ["الإجمالي", stats.users.total],
        ["نشطون", stats.users.active],
        ["معلّقون / محذوفون", stats.users.suspended],
        ["مدراء", stats.users.admins],
        ["جدد هذا الشهر", stats.users.newThisMonth],
      ],
    },
    {
      title: "الإعلانات",
      items: [
        ["الإجمالي", stats.listings.total],
        ["نشطة", stats.listings.active],
        ["قيد المراجعة", stats.listings.pending],
        ["مبلّغ عنها", stats.listings.reported],
        ["مميّزة", stats.listings.featuredCount],
      ],
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">إحصائيات المنصة</h2>
        <p className="text-sm text-muted-foreground">أرقام مجمّعة من قاعدة البيانات والزيارات</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">الزيارات</CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as ViewsPeriod)}>
            <SelectTrigger className="h-10 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABEL) as ViewsPeriod[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PERIOD_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">عدد الزيارات — {PERIOD_LABEL[period]}</p>
              {viewsLoading ? (
                <Loader2 className="mt-2 size-6 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-3xl font-black tabular-nums">{periodTotal}</p>
              )}
            </div>
            <div className="text-end text-sm text-muted-foreground">
              <div>اليوم: <span className="font-semibold text-foreground">{stats.views.today}</span></div>
              <div>7 أيام: <span className="font-semibold text-foreground">{stats.views.last7Days}</span></div>
              <div>30 يوماً: <span className="font-semibold text-foreground">{stats.views.last30Days}</span></div>
              <div>الإجمالي: <span className="font-semibold text-foreground">{stats.views.allTime}</span></div>
            </div>
          </div>
          {period !== "all" && periodViews && periodViews.byDay.length > 0 && (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-3 text-sm">
              {periodViews.byDay.map((d) => (
                <div key={d.date} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{d.date}</span>
                  <span className="font-semibold tabular-nums">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {blocks.map((block) => (
          <Card key={block.title}>
            <CardHeader>
              <CardTitle className="text-base">{block.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {block.items.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-bold tabular-nums">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
