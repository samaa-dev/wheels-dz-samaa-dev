import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Eye, Heart, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/hooks/useApp";
import { CATEGORY_LABEL, CONDITION_LABEL, normalizeCondition, type ListingCondition } from "@/lib/data/catalog";
import { getSeller, type Listing } from "@/lib/data/mock";
import { formatListingPrice, formatNumber, timeAgo } from "@/lib/format";
import { callOrCopyPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

const conditionStyle: Record<ListingCondition, string> = {
  new: "bg-success/15 text-success-foreground border-success/30",
  like_new: "bg-primary/10 text-primary border-primary/25",
  used: "bg-warning/20 text-warning-foreground border-warning/40",
};

export function ListingCard({ listing, view = "grid" }: { listing: Listing; view?: "grid" | "list" }) {
  const { isFavorite, toggleFavorite, views, revealContact } = useApp();
  const [index, setIndex] = useState(0);
  const images = listing.imageUrls.length ? listing.imageUrls : listing.images;
  const fav = isFavorite(listing.id);
  const totalViews = listing.views + (views[listing.id] ?? 0);

  const step = (dir: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setIndex((i) => (i + dir + images.length) % images.length);
  };

  const onFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    const added = toggleFavorite(listing.id);
    toast[added ? "success" : "info"](added ? "تمت الإضافة إلى المفضلة" : "تمت الإزالة من المفضلة");
  };

  const onContact = async (e: React.MouseEvent) => {
    e.preventDefault();
    const allowed = revealContact(listing.id);
    if (!allowed) {
      toast.warning("لقد بلغت الحد اليومي لعرض أرقام الهواتف (5 إعلانات).");
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
        "group gap-0 overflow-hidden p-0 transition-shadow hover:shadow-md",
        view === "list" && "sm:grid sm:grid-cols-[260px_minmax(0,1fr)]",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Link to="/listing/$id" params={{ id: listing.id }}>
          <img
            src={images[index]}
            alt={listing.title}
            loading="lazy"
            width={800}
            height={600}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
        <button
          onClick={step(-1)}
          aria-label="الصورة السابقة"
          className="absolute start-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <ChevronRight className="size-4" />
        </button>
        <button
          onClick={step(1)}
          aria-label="الصورة التالية"
          className="absolute end-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
          {images.map((_: string, i: number) => (
            <span key={i} className={cn("size-1.5 rounded-full bg-background/60", i === index && "bg-primary")} />
          ))}
        </div>
        <button
          onClick={onFavorite}
          aria-label="أضف إلى المفضلة"
          className="absolute end-2 top-2 grid size-11 place-items-center rounded-full bg-background/85"
        >
          <Heart className={cn("size-5", fav ? "fill-destructive text-destructive" : "text-muted-foreground")} />
        </button>
        <Badge className="absolute start-2 top-2 border bg-background/90 text-foreground">
          {CATEGORY_LABEL[listing.category]}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 p-4">
        <Link to="/listing/$id" params={{ id: listing.id }} className="line-clamp-2-rtl font-bold leading-6 hover:text-primary">
          {listing.title}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {formatListingPrice(listing.price) && (
            <span className="text-lg font-extrabold text-primary">{formatListingPrice(listing.price)}</span>
          )}
          {listing.size && (
            <Badge variant="secondary" className="font-semibold">{listing.size}</Badge>
          )}
          <Badge variant="outline" className={conditionStyle[normalizeCondition(listing.condition)]}>
            {CONDITION_LABEL[listing.condition]}
          </Badge>
        </div>
        {view === "list" && <p className="line-clamp-2-rtl text-sm text-muted-foreground">{listing.description}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" /> {listing.wilaya} — {listing.commune}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="size-3.5" /> {formatNumber(totalViews)}
          </span>
          <span>{timeAgo(listing.createdAt)}</span>
        </div>
        <div className="mt-1 flex gap-2">
          <Button onClick={onContact} className="h-11 flex-1 gap-2">
            <Phone className="size-4" /> اتصل بالبائع
          </Button>
          <Button asChild variant="outline" className="h-11">
            <Link to="/listing/$id" params={{ id: listing.id }}>التفاصيل</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function ListingCardSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-11 w-full" />
      </div>
    </Card>
  );
}
