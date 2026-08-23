import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar, Copy, Eye, Facebook, Flag, MapPin, MessageCircle, Phone, Printer, Share2, Tag,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ListingCard } from "@/components/listings/ListingCard";
import { ReviewForm } from "@/components/listings/ReviewForm";
import { StarRating } from "@/components/listings/StarRating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAllListings, useApp } from "@/hooks/useApp";
import { CATEGORY_LABEL, CONDITION_LABEL, normalizeCondition } from "@/lib/data/catalog";
import { getSeller } from "@/lib/data/mock";
import { getSellerRatingSummary } from "@/lib/firebase/reviews";
import { formatDate, formatListingPrice, formatNumber, timeAgo } from "@/lib/format";
import { callOrCopyPhone, toTelNumber } from "@/lib/phone";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/listing/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `تفاصيل الإعلان ${params.id} | عجلات الجزائر` },
      { name: "description", content: "تفاصيل كاملة عن الإعلان: الصور، السعر، الحالة، المواصفات وبيانات البائع." },
      { property: "og:title", content: `تفاصيل الإعلان ${params.id} | عجلات الجزائر` },
      { property: "og:description", content: "الصور، السعر، الحالة، المواصفات وبيانات البائع." },
    ],
  }),
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();
  const all = useAllListings();
  const listing = all.find((l) => l.id === id);
  const { pushRecent, registerView, views, isFavorite, toggleFavorite, revealContact } = useApp();
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [phoneShown, setPhoneShown] = useState(false);
  const [sellerRating, setSellerRating] = useState({ rating: 0, count: 0 });

  const sellerId = listing?.ownerId || listing?.sellerId;

  useEffect(() => {
    if (!listing) return;
    pushRecent(listing.id);
    registerView(listing.id);
  }, [listing?.id]);

  useEffect(() => {
    if (!sellerId) return;
    getSellerRatingSummary(sellerId).then(setSellerRating);
  }, [sellerId]);

  const related = useMemo(
    () => all.filter((l) => l.id !== id && l.category === listing?.category).slice(0, 4),
    [all, id, listing?.category],
  );

  if (!listing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-black">الإعلان غير موجود</h1>
        <Button asChild className="mt-6 h-11"><Link to="/listings">العودة إلى الإعلانات</Link></Button>
      </div>
    );
  }

  const sellerIdResolved = listing.ownerId || listing.sellerId;
  const seller = getSeller(sellerIdResolved);
  const displayRating = sellerRating.count > 0 ? sellerRating.rating : seller.rating;
  const displayCount = sellerRating.count > 0 ? sellerRating.count : seller.reviews;
  const otherListings = all.filter((l) => (l.ownerId || l.sellerId) === seller.id).length;
  const images = listing.imageUrls.length ? listing.imageUrls : listing.images;
  const totalViews = listing.views + (views[listing.id] ?? 0);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const copyLink = async () => {
    await navigator.clipboard?.writeText(shareUrl);
    toast.success("تم نسخ رابط الإعلان");
  };

  const sellerPhone = listing.ownerPhone || seller.phone;

  const showPhone = async () => {
    if (!revealContact(listing.id)) {
      toast.warning("لقد بلغت الحد المسموح لعرض أرقام الهواتف.");
      return;
    }
    setPhoneShown(true);
    const result = await callOrCopyPhone(sellerPhone);
    if (result === "call") {
      toast.success("جاري فتح تطبيق الاتصال…");
    } else {
      toast.success(`تم نسخ الرقم: ${sellerPhone}`);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumb className="no-print mb-6">
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/">الرئيسية</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/listings">الإعلانات</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage className="max-w-60 truncate">{listing.title}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden p-0">
            <button className="block w-full" onClick={() => setLightbox(true)}>
              <img src={images[active]} alt={listing.title} width={800} height={600} className="aspect-[4/3] w-full object-cover" />
            </button>
            <div className="flex gap-2 p-3">
              {images.map((img: string, i: number) => (
                <button key={i} onClick={() => setActive(i)} className={cn("size-20 overflow-hidden rounded-md border-2", i === active ? "border-primary" : "border-transparent")}>
                  <img src={img} alt={`صورة ${i + 1}`} loading="lazy" width={160} height={120} className="size-full object-cover" />
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <CardTitle className="min-w-0 text-xl leading-8">{listing.title}</CardTitle>
                {formatListingPrice(listing.price) && (
                  <span className="shrink-0 text-2xl font-black text-primary">{formatListingPrice(listing.price)}</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary">{CATEGORY_LABEL[listing.category]}</Badge>
                <Badge variant="outline">الحالة: {CONDITION_LABEL[normalizeCondition(listing.condition)]}</Badge>
                <Badge variant="outline">الكمية: {listing.quantity}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["الماركة", listing.brand],
                  ["الموديل", listing.model],
                  ["سنة الصنع", listing.year ? String(listing.year) : "—"],
                  ["المقاس", listing.size],
                  ["العرض / النيم", `${listing.width} / ${listing.profile}`],
                  ["القطر", `R${listing.diameter}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>

              <div>
                <h2 className="mb-2 font-bold">الوصف</h2>
                <p className="text-sm leading-7 text-muted-foreground">{listing.description}</p>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="size-4" /> {listing.wilaya} — {listing.commune}</span>
                <span className="flex items-center gap-1"><Calendar className="size-4" /> {formatDate(listing.createdAt)} ({timeAgo(listing.createdAt)})</span>
                <span className="flex items-center gap-1"><Eye className="size-4" /> {formatNumber(totalViews)} مشاهدة</span>
                <span className="flex items-center gap-1"><Tag className="size-4" /> رقم الإعلان: {listing.id}</span>
              </div>

              <div className="no-print flex flex-wrap gap-2">
                <Button variant="outline" className="h-11 gap-2" onClick={copyLink}><Copy className="size-4" /> نسخ الرابط</Button>
                <Button asChild variant="outline" className="h-11 gap-2">
                  <a href={`https://wa.me/?text=${encodeURIComponent(`${listing.title} - ${shareUrl}`)}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="size-4" /> واتساب
                  </a>
                </Button>
                <Button asChild variant="outline" className="h-11 gap-2">
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer">
                    <Facebook className="size-4" /> فيسبوك
                  </a>
                </Button>
                <Button variant="outline" className="h-11 gap-2" onClick={() => window.print()}><Printer className="size-4" /> طباعة</Button>
                <Button variant="ghost" className="h-11 gap-2 text-destructive" onClick={() => toast.success("تم إرسال البلاغ، سيراجعه فريقنا.")}>
                  <Flag className="size-4" /> إبلاغ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="no-print space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">معلومات البائع</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-full text-lg font-bold text-white" style={{ backgroundColor: seller.avatarColor }}>
                  {seller.name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-bold">{seller.name}</div>
                  <StarRating value={displayRating} count={displayCount} />
                </div>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>عضو منذ {formatDate(seller.memberSince)}</div>
                <div>{otherListings} إعلان آخر · {seller.wilaya}</div>
              </div>
              <div className="space-y-2">
                <Button className="h-12 w-full gap-2" onClick={showPhone}>
                  <Phone className="size-4" /> {phoneShown ? sellerPhone : "اتصل بالبائع"}
                </Button>
                <Button asChild variant="outline" className="h-12 w-full gap-2 border-success text-success-foreground">
                  <a href={`https://wa.me/${toTelNumber(sellerPhone).replace("+", "")}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="size-4" /> مراسلة عبر واتساب
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  className="h-11 w-full gap-2"
                  onClick={() => toast.success(isFavorite(listing.id) ? "تمت الإزالة من المفضلة" : "تمت الإضافة إلى المفضلة", { id: "fav" }) && toggleFavorite(listing.id)}
                >
                  <Share2 className="size-4" /> {isFavorite(listing.id) ? "إزالة من المفضلة" : "أضف إلى المفضلة"}
                </Button>
              </div>
              <ReviewForm sellerId={sellerIdResolved} onSubmitted={() => getSellerRatingSummary(sellerIdResolved).then(setSellerRating)} />
            </CardContent>
          </Card>
        </aside>
      </div>

      <section className="mt-12">
        <h2 className="mb-5 text-xl font-black">إعلانات مشابهة</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      </section>

      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="text-start">{listing.title}</DialogTitle></DialogHeader>
          <img src={images[active]} alt={listing.title} width={800} height={600} className="w-full rounded-md object-contain" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
