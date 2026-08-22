import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { InteractiveStarRating } from "@/components/listings/InteractiveStarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/hooks/useApp";
import { hasUserReviewedSeller, submitReview } from "@/lib/firebase/reviews";

type ReviewFormProps = {
  sellerId: string;
  onSubmitted?: () => void;
};

export function ReviewForm({ sellerId, onSubmitted }: ReviewFormProps) {
  const { user } = useApp();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  if (hasUserReviewedSeller(sellerId, user.id)) {
    return (
      <p className="text-sm text-muted-foreground">
        لقد أرسلت تقييماً لهذا البائع. سيظهر بعد موافقة الإدارة.
      </p>
    );
  }

  const handleSubmit = async () => {
    if (rating < 1) {
      toast.error("اختر عدد النجوم");
      return;
    }
    if (comment.trim().length < 5) {
      toast.error("اكتب ملاحظة تقييمية (5 أحرف على الأقل)");
      return;
    }
    setSubmitting(true);
    try {
      await submitReview({
        sellerId,
        reviewerId: user.id,
        reviewerName: user.displayName || user.name,
        rating,
        comment,
      });
      toast.success("تم إرسال تقييمك. سيظهر بعد موافقة الإدارة.");
      onSubmitted?.();
    } catch {
      toast.error("تعذّر إرسال التقييم");
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
        placeholder="اكتب ملاحظتك عن تجربتك مع البائع..."
      />
      <Button className="h-11 w-full" disabled={submitting} onClick={handleSubmit}>
        {submitting && <Loader2 className="size-4 animate-spin" />}
        إرسال التقييم
      </Button>
    </div>
  );
}
