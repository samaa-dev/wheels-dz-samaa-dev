import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/hooks/useApp";
import { STATUS_LABEL, type ListingStatus } from "@/lib/data/catalog";
import { formatDZD, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/my-listings")({
  head: () => ({
    meta: [
      { title: "إعلاناتي | عجلات الجزائر" },
      { name: "description", content: "أدر إعلاناتك: تعديل، حذف، ترقية أو إيقاف النشر في أي وقت." },
      { property: "og:title", content: "إعلاناتي | عجلات الجزائر" },
      { property: "og:description", content: "تعديل، حذف، ترقية أو إيقاف نشر إعلاناتك." },
    ],
  }),
  component: MyListingsPage,
});

function MyListingsPage() {
  const { myListings, removeListing, updateListingStatus, hydrated } = useApp();
  const [status, setStatus] = useState<string>("all");
  const items = myListings.filter((l) => status === "all" || l.status === status);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black">إعلاناتي</h1>
          <p className="mt-1 text-sm text-muted-foreground">{myListings.length} إعلان</p>
        </div>
        <Button asChild className="h-11 shrink-0"><Link to="/create-listing">إعلان جديد</Link></Button>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-11 w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {(Object.keys(STATUS_LABEL) as ListingStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!hydrated ? null : items.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          لا توجد إعلانات بهذه الحالة.
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {items.map((l) => (
            <Card key={l.id} className="grid gap-4 p-4 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center">
              <img src={l.coverImageUrl || l.imageUrls[0] || l.images[0]} alt={l.title} loading="lazy" width={240} height={180} className="h-24 w-full rounded-md object-cover" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to="/listing/$id" params={{ id: l.id }} className="truncate font-bold hover:text-primary">{l.title}</Link>
                  <Badge variant="secondary">{STATUS_LABEL[l.status]}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{formatDZD(l.price)} · {l.wilaya} · {timeAgo(l.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="h-11" onClick={() => toast.info("تحرير الإعلان متاح من نموذج الإضافة.")}>تعديل</Button>
                <Button variant="outline" className="h-11" onClick={() => { updateListingStatus(l.id, "pending"); toast.success("تم إرسال طلب الترقية"); }}>ترقية</Button>
                <Button variant="outline" className="h-11" onClick={() => { updateListingStatus(l.id, l.status === "active" ? "inactive" : "active"); toast.success("تم تحديث حالة الإعلان"); }}>
                  {l.status === "active" ? "إيقاف" : "تفعيل"}
                </Button>
                <Button variant="ghost" className="h-11 text-destructive" onClick={() => { removeListing(l.id); toast.success("تم حذف الإعلان"); }}>حذف</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
