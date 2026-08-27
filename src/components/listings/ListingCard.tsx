import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Eye, Heart, MapPin, Phone } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp, CONTACT_LIMIT } from "@/hooks/useApp";
import { CATEGORY_LABEL, CONDITION_LABEL, normalizeCondition, type ListingCondition } from "@/lib/data/catalog";
import { getSeller, type Listing } from "@/lib/data/mock";
import { formatNumber, timeAgo } from "@/lib/format";
import { callOrCopyPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

const conditionStyle: Record<ListingCondition, string> = {
  new: "bg-success/15 text-success-foreground border-success/30",
  like_new: "bg-primary/10 text-primary border-primary/25",
  used: "bg-warning/20 text-warning-foreground border-warning/40",
};

const SWIPE_THRESHOLD = 40;

export function ListingCard({
  listing,
  view = "grid",
  compact = false,
}: {
  listing: Listing;
  view?: "grid" | "list";
  /** Dense 2-up tiles (home mobile) */
  compact?: boolean;
}) {
  const { isFavorite, toggleFavorite, revealContact } = useApp();
  const [index, setIndex] = useState(0);
  const images = listing.imageUrls.length ? listing.imageUrls : listing.images;
  const fav = isFavorite(listing.id);
  const totalViews = listing.views;
  const multi = images.length > 1;

  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const didSwipe = useRef(false);

  const go = (dir: number) => {
    if (!multi) return;
    setIndex((i) => (i + dir + images.length) % images.length);
  };

  const onStep = (dir: number) => (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    go(dir);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!multi || e.button !== 0) return;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    didSwipe.current = false;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointerStart.current || !multi) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    pointerStart.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    didSwipe.current = true;
    go(dx < 0 ? 1 : -1);
  };

  const onImageActivate = (e: React.MouseEvent) => {
    if (didSwipe.current) {
      e.preventDefault();
      didSwipe.current = false;
    }
  };

  const onFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleFavorite(listing.id);
    toast[added ? "success" : "info"](added ? "تمت الإضافة إلى المفضلة" : "تمت الإزالة من المفضلة");
  };

  const onContact = async (e: React.MouseEvent) => {
    e.preventDefault();
    const allowed = revealContact(listing.id);
    if (!allowed) {
      toast.warning(`لقد بلغت الحد اليومي لعرض أرقام الهواتف (${CONTACT_LIMIT} إعلانات).`);
      return;
    }
    const phone = listing.ownerPhone || getSeller(listing.sellerId || listing.ownerId).phone;
    const result = await callOrCopyPhone(phone);
    if (result === "call") {
      toast.success("جاري فتح تطبيق الاتصال…");
    } else {
      toast.success(`تم نسخ رقم البائع: ${phone}`);
    }
  };

  return (
    <Card
      className={cn(
        "group flex h-full flex-col gap-0 overflow-hidden p-0 transition-shadow hover:shadow-md",
        view === "list" && "sm:grid sm:grid-cols-[260px_minmax(0,1fr)]",
      )}
    >
      <div
        className={cn(
          "relative touch-pan-y overflow-hidden bg-muted",
          compact ? "aspect-square" : "aspect-[4/3]",
        )}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          pointerStart.current = null;
        }}
      >
        <Link
          to="/listing/$id"
          params={{ id: listing.id }}
          onClick={onImageActivate}
          className="absolute inset-0 block"
          draggable={false}
        >
          <img
            src={images[index]}
            alt={listing.title}
            loading="lazy"
            width={800}
            height={600}
            draggable={false}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Link>

        {multi && (
          <>
            <button
              type="button"
              onClick={onStep(-1)}
              aria-label="الصورة السابقة"
              className={cn(
                "absolute start-1.5 top-1/2 z-10 grid -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow-sm opacity-90 md:opacity-0 md:transition-opacity md:group-hover:opacity-100",
                compact ? "size-8" : "size-10 start-2",
              )}
            >
              <ChevronRight className={cn(compact ? "size-3.5" : "size-4")} />
            </button>
            <button
              type="button"
              onClick={onStep(1)}
              aria-label="الصورة التالية"
              className={cn(
                "absolute end-1.5 top-1/2 z-10 grid -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow-sm opacity-90 md:opacity-0 md:transition-opacity md:group-hover:opacity-100",
                compact ? "size-8" : "size-10 end-2",
              )}
            >
              <ChevronLeft className={cn(compact ? "size-3.5" : "size-4")} />
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1">
              {images.map((_: string, i: number) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all",
                    i === index ? "w-3 bg-primary" : "w-1 bg-background/70",
                  )}
                />
              ))}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onFavorite}
          aria-label="أضف إلى المفضلة"
          className={cn(
            "absolute end-1.5 top-1.5 z-10 grid place-items-center rounded-full bg-background/85",
            compact ? "size-8" : "size-11 end-2 top-2",
          )}
        >
          <Heart className={cn(compact ? "size-3.5" : "size-5", fav ? "fill-destructive text-destructive" : "text-muted-foreground")} />
        </button>
        {!compact && (
          <Badge className="absolute start-2 top-2 z-10 border bg-background/90 text-foreground">
            {CATEGORY_LABEL[listing.category]}
          </Badge>
        )}
      </div>

      <div className={cn("flex min-h-0 flex-1 flex-col", compact ? "gap-1 p-2.5" : "gap-2 p-4")}>
        <Link
          to="/listing/$id"
          params={{ id: listing.id }}
          className={cn(
            "line-clamp-2-rtl font-bold hover:text-primary",
            compact ? "min-h-[2.5rem] text-xs leading-5" : "leading-6",
          )}
        >
          {listing.title}
        </Link>
        <div className={cn("flex flex-wrap items-center", compact ? "gap-1" : "gap-2")}>
          {listing.size && (
            <Badge variant="secondary" className={cn("font-semibold", compact && "px-1.5 py-0 text-[10px]")}>
              {listing.size}
            </Badge>
          )}
          {!compact && (
            <Badge variant="outline" className={conditionStyle[normalizeCondition(listing.condition)]}>
              {CONDITION_LABEL[listing.condition]}
            </Badge>
          )}
        </div>
        {view === "list" && <p className="line-clamp-2-rtl text-sm text-muted-foreground">{listing.description}</p>}
        <div
          className={cn(
            "mt-auto flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground",
            compact ? "text-[10px]" : "gap-x-4 gap-y-1 text-xs",
          )}
        >
          <span className="flex min-w-0 items-center gap-0.5 truncate">
            <MapPin className={cn(compact ? "size-3" : "size-3.5")} />
            <span className="truncate">{compact ? listing.wilaya : `${listing.wilaya} — ${listing.commune}`}</span>
          </span>
          {!compact && (
            <>
              <span className="flex items-center gap-1">
                <Eye className="size-3.5" /> {formatNumber(totalViews)}
              </span>
              <span>{timeAgo(listing.createdAt)}</span>
            </>
          )}
        </div>
        {!compact && (
          <div className="mt-1 flex gap-2">
            <Button onClick={onContact} className="h-11 flex-1 gap-2">
              <Phone className="size-4" /> اتصل بالبائع
            </Button>
            <Button asChild variant="outline" className="h-11">
              <Link to="/listing/$id" params={{ id: listing.id }}>التفاصيل</Link>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export function ListingCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden p-0">
      <Skeleton className={cn("w-full rounded-none", compact ? "aspect-square" : "aspect-[4/3]")} />
      <div className={cn("space-y-2", compact ? "p-2.5" : "space-y-3 p-4")}>
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        {!compact && <Skeleton className="h-11 w-full" />}
      </div>
    </Card>
  );
}
