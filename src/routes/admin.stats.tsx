import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/hooks/useApp";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAdminStatsThunk, selectAdminStats, selectStatsLoading } from "@/store/slices/adminSlice";

export const Route = createFileRoute("/admin/stats")({
  head: () => ({ meta: [{ title: "إحصائيات الإدارة | عجلات الجزائر" }] }),
  component: AdminStatsPage,
});

function AdminStatsPage() {
  const { user } = useApp();
  const dispatch = useAppDispatch();
  const stats = useAppSelector(selectAdminStats);
  const loading = useAppSelector(selectStatsLoading);

  useEffect(() => {
    if (!user) return;
    void dispatch(fetchAdminStatsThunk(user));
  }, [dispatch, user]);

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
    {
      title: "الرسائل",
      items: [
        ["الإجمالي", stats.messages.total],
        ["اليوم", stats.messages.todayCount],
        ["مبلّغ عنها", stats.messages.reportedCount],
      ],
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">إحصائيات المنصة</h2>
        <p className="text-sm text-muted-foreground">أرقام مجمّعة من قاعدة البيانات</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
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
