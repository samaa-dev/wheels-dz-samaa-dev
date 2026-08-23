import { Globe, LayoutGrid } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchFeaturedListingsThunk, fetchListingsThunk } from "@/store/slices/listingsSlice";
import { setLiveListings } from "@/store/slices/uiSlice";
import { cn } from "@/lib/utils";

export function LiveListingsToggle({
  className,
  showLabels = "responsive",
}: {
  className?: string;
  showLabels?: "always" | "responsive";
}) {
  const dispatch = useAppDispatch();
  const live = useAppSelector((state) => state.ui.liveListings);

  // Hide demo/live toggle in production builds
  if (import.meta.env.PROD) {
    return null;
  }

  const onToggle = (checked: boolean) => {
    dispatch(setLiveListings(checked));
    if (checked) {
      dispatch(fetchListingsThunk());
      dispatch(fetchFeaturedListingsThunk(6));
    }
  };

  const labelClass = showLabels === "always" ? "" : "hidden sm:inline";

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium",
        className,
      )}
    >
      <LayoutGrid className={cn("size-3.5", !live && "text-primary")} />
      <span className={cn(labelClass, !live && "text-foreground", live && "text-muted-foreground")}>وهمية</span>
      <Switch
        checked={live}
        onCheckedChange={onToggle}
        aria-label={live ? "عرض الإعلانات من الإنترنت" : "عرض الإعلانات الوهمية"}
      />
      <span className={cn(labelClass, live && "text-foreground", !live && "text-muted-foreground")}>الإنترنت</span>
      <Globe className={cn("size-3.5", live && "text-primary")} />
    </label>
  );
}
