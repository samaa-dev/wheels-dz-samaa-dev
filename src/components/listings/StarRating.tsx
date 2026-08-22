import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({ value, count, className }: { value: number; count?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)} aria-label={`التقييم ${value} من 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn("size-4", i <= Math.round(value) ? "fill-warning text-warning" : "text-muted-foreground/40")}
        />
      ))}
      <span className="ms-1 text-xs font-medium text-muted-foreground">
        {value.toFixed(1)}
        {count !== undefined ? ` (${count})` : ""}
      </span>
    </div>
  );
}
