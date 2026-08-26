import { createFileRoute } from "@tanstack/react-router";
import { Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StarRating } from "@/components/listings/StarRating";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPendingReviews, updateReviewStatus, type Review } from "@/lib/firebase/reviews";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({ meta: [{ title: "إدارة التقييمات | عجلات الجزائر" }] }),
  component: AdminReviewsPage,
});

function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const pending = await getPendingReviews();
      setReviews(pending);
    } catch {
      toast.error("تعذّر تحميل التقييمات");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      await updateReviewStatus(id, status);
      toast.success(status === "approved" ? "تم اعتماد التقييم" : "تم رفض التقييم");
      void load();
    } catch {
      toast.error("تعذّر تحديث التقييم");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">إدارة التقييمات</h2>
        <p className="text-sm text-muted-foreground">التقييمات المعلقة — اعتماد أو رفض قبل العرض</p>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">لا توجد تقييمات معلقة.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{r.reviewerName}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {formatDate(r.createdAt)} · بائع: {r.sellerId}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <StarRating value={r.rating} />
                <p className="text-sm leading-6">{r.comment}</p>
                <div className="flex gap-2">
                  <Button className="h-10 gap-2" onClick={() => handleStatus(r.id, "approved")}>
                    <Check className="size-4" /> اعتماد
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 gap-2 text-destructive"
                    onClick={() => handleStatus(r.id, "rejected")}
                  >
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
