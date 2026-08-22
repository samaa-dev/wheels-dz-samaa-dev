import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type InteractiveStarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
  className?: string;
};

export function InteractiveStarRating({ value, onChange, size = "md", className }: InteractiveStarRatingProps) {
  const starSize = size === "sm" ? "size-5" : "size-7";
  return (
    <div className={cn("flex items-center gap-1", className)} role="group" aria-label="اختر التقييم">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i)}
          className="rounded-sm transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`${i} نجوم`}
        >
          <Star
            className={cn(
              starSize,
              i <= value ? "fill-warning text-warning" : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}
