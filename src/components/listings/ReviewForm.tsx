import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { InteractiveStarRating } from "@/components/listings/InteractiveStarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/hooks/useApp";
import { hasUserReviewedSeller, submitReview } from "@/lib/firebase/reviews";
import { getModerationSettings } from "@/lib/firebase/settings";

type ReviewFormProps = {
  sellerId: string;
  onSubmitted?: () => void;
};

export function ReviewForm({ sellerId, onSubmitted }: ReviewFormProps) {
  const { user } = useApp();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [reviewsNeedApproval, setReviewsNeedApproval] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user || user.id === sellerId) {
      setChecking(false);
      return;
    }
    Promise.all([hasUserReviewedSeller(sellerId, user.id), getModerationSettings()]).then(
      ([exists, settings]) => {
        if (active) {
          setAlreadyReviewed(exists);
          setReviewsNeedApproval(settings.reviewsRequireApproval);
          setChecking(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [sellerId, user]);

  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">
        يجب تسجيل الدخول لتقييم البائع.
      </p>
    );
  }

  if (user.id === sellerId) {
    return null;
  }

  if (checking) {
    return <p className="text-sm text-muted-foreground">جارٍ التحقق...</p>;
  }

  if (alreadyReviewed) {
    return (
      <p className="text-sm text-muted-foreground">
        {reviewsNeedApproval
          ? "لقد أرسلت تقييماً لهذا البائع. سيظهر بعد موافقة الإدارة."
          : "لقد قيّمت هذا البائع مسبقاً."}
      </p>
    );
  }

  const handleSubmit = async () => {
    if (rating < 1) {
      toast.error("اختر عدد النجوم");
      return;
    }
    if (comment.trim().length > 500) {
      toast.error("الملاحظة طويلة جداً (500 حرف كحد أقصى)");
      return;
    }
    setSubmitting(true);
    try {
      const created = await submitReview({
        sellerId,
        reviewerId: user.id,
        reviewerName: user.displayName || user.name || "مستخدم",
        rating,
        comment,
      });
      setAlreadyReviewed(true);
      setReviewsNeedApproval(created.status === "pending");
      toast.success(
        created.status === "approved"
          ? "تم نشر تقييمك"
          : "تم إرسال تقييمك. سيظهر بعد موافقة الإدارة.",
      );
      onSubmitted?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "تعذّر إرسال التقييم");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <h3 className="font-bold">قيّم البائع</h3>
      <InteractiveStarRating value={rating} onChange={setRating} />
      <Textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="اكتب ملاحظتك عن تجربتك مع البائع... (اختياري)"
      />
      <Button className="h-11 w-full" disabled={submitting} onClick={handleSubmit}>
        {submitting && <Loader2 className="size-4 animate-spin" />}
        إرسال التقييم
      </Button>
    </div>
  );
}
