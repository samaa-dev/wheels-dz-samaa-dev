import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StarRating } from "@/components/listings/StarRating";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/hooks/useApp";
import { isModeratorOrAdmin } from "@/lib/auth/permissions";
import { getPendingReviews, updateReviewStatus, type Review } from "@/lib/firebase/reviews";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({ meta: [{ title: "إدارة التقييمات | عجلات الجزائر" }] }),
  component: AdminReviewsPage,
});

function AdminReviewsPage() {
  const { user, hydrated } = useApp();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const pending = await getPendingReviews();
    setReviews(pending);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (!hydrated) return null;

  if (!user || !isModeratorOrAdmin(user)) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-black">غير مصرّح</h1>
        <p className="mt-2 text-sm text-muted-foreground">هذه الصفحة للإدارة فقط.</p>
        <Button asChild className="mt-6 h-11"><Link to="/">الرئيسية</Link></Button>
      </div>
    );
  }

  const handleStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      await updateReviewStatus(id, status);
      toast.success(status === "approved" ? "تم اعتماد التقييم" : "تم رفض التقييم");
      load();
    } catch {
      toast.error("تعذّر تحديث التقييم");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-black">إدارة التقييمات</h1>
      <p className="mt-1 text-sm text-muted-foreground">التقييمات المعلقة — اعتماد أو رفض قبل العرض.</p>

      {loading ? (
        <div className="mt-10 grid place-items-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      ) : reviews.length === 0 ? (
        <p className="mt-10 text-center text-muted-foreground">لا توجد تقييمات معلقة.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{r.reviewerName}</CardTitle>
                <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)} · بائع: {r.sellerId}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <StarRating value={r.rating} />
                <p className="text-sm leading-6">{r.comment}</p>
                <div className="flex gap-2">
                  <Button className="h-10 gap-2" onClick={() => handleStatus(r.id, "approved")}>
                    <Check className="size-4" /> اعتماد
                  </Button>
                  <Button variant="outline" className="h-10 gap-2 text-destructive" onClick={() => handleStatus(r.id, "rejected")}>
                    <X className="size-4" /> رفض
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
