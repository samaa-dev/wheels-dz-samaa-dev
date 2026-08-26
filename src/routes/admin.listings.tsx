import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/hooks/useApp";
import { STATUS_LABEL, type ListingStatus } from "@/lib/data/catalog";
import { hasPermission } from "@/lib/auth/permissions";
import { timeAgo } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  approveListingThunk,
  fetchAdminListingsThunk,
  rejectListingThunk,
  selectAdminListings,
  selectAdminListingsLoading,
  setListingsStatusFilter,
} from "@/store/slices/adminSlice";

export const Route = createFileRoute("/admin/listings")({
  head: () => ({ meta: [{ title: "إدارة الإعلانات | عجلات الجزائر" }] }),
  component: AdminListingsPage,
});

function AdminListingsPage() {
  const { user } = useApp();
  const dispatch = useAppDispatch();
  const listings = useAppSelector(selectAdminListings);
  const loading = useAppSelector(selectAdminListingsLoading);
  const statusFilter = useAppSelector((s) => s.admin.listingsStatusFilter);
  const moderating = useAppSelector((s) => s.admin.moderatingListing);
  const [q, setQ] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const canApprove = user ? hasPermission(user, "listings:approve") : false;
  const canFeature = user ? hasPermission(user, "listings:feature") : false;

  const load = () => {
    if (!user) return;
    void dispatch(
      fetchAdminListingsThunk({
        currentUser: user,
        status: statusFilter,
        searchQuery: q || undefined,
      }),
    );
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on filter/user
  }, [user, statusFilter]);

  const onApprove = async (listingId: string, feature = false) => {
    if (!user) return;
    const result = await dispatch(
      approveListingThunk({ currentUser: user, listingId, shouldFeature: feature }),
    );
    if (approveListingThunk.fulfilled.match(result)) {
      toast.success(feature ? "تم الاعتماد والترقية" : "تم اعتماد الإعلان");
    } else {
      toast.error(result.error.message || "تعذّر الاعتماد");
    }
  };

  const onReject = async () => {
    if (!user || !rejectId || !rejectReason.trim()) {
      toast.error("أدخل سبب الرفض");
      return;
    }
    const result = await dispatch(
      rejectListingThunk({ currentUser: user, listingId: rejectId, reason: rejectReason.trim() }),
    );
    if (rejectListingThunk.fulfilled.match(result)) {
      toast.success("تم رفض الإعلان");
      setRejectId(null);
      setRejectReason("");
    } else {
      toast.error(result.error.message || "تعذّر الرفض");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">إدارة الإعلانات</h2>
        <p className="text-sm text-muted-foreground">قبول أو رفض الإعلانات المعلقة ومراجعة الحالات الأخرى</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => dispatch(setListingsStatusFilter(v))}
        >
          <SelectTrigger className="h-11 w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">قيد المراجعة</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="blocked">مرفوض</SelectItem>
            <SelectItem value="deleted">محذوف</SelectItem>
            <SelectItem value="all">الكل</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="h-11 max-w-xs"
          placeholder="بحث: عنوان، بائع، ولاية..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <Button className="h-11" variant="outline" onClick={load}>
          بحث
        </Button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : listings.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">لا توجد إعلانات بهذه الحالة.</p>
      ) : (
        <div className="grid gap-4">
          {listings.map((l) => (
            <Card key={l.id} className="grid gap-4 p-4 sm:grid-cols-[100px_minmax(0,1fr)_auto] sm:items-center">
              <img
                src={l.coverImageUrl || l.imageUrls[0] || l.images[0]}
                alt={l.title}
                className="h-24 w-full rounded-md object-cover"
                loading="lazy"
              />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to="/listing/$id" params={{ id: l.id }} className="truncate font-bold hover:text-primary">
                    {l.title}
                  </Link>
                  <Badge variant="secondary">{STATUS_LABEL[l.status as ListingStatus] ?? l.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {l.ownerName} · {l.wilaya}
                  {l.size ? ` · ${l.size}` : ""} · {timeAgo(l.createdAt)}
                </p>
              </div>
              {canApprove && l.status === "pending" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="h-10 gap-1"
                    disabled={moderating}
                    onClick={() => onApprove(l.id, false)}
                  >
                    <Check className="size-4" /> اعتماد
                  </Button>
                  {canFeature && (
                    <Button
                      variant="outline"
                      className="h-10"
                      disabled={moderating}
                      onClick={() => onApprove(l.id, true)}
                    >
                      اعتماد + تمييز
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="h-10 gap-1 text-destructive"
                    disabled={moderating}
                    onClick={() => {
                      setRejectId(l.id);
                      setRejectReason("");
                    }}
                  >
                    <X className="size-4" /> رفض
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <Card className="w-full max-w-md space-y-4 p-6">
            <h3 className="text-lg font-bold">سبب رفض الإعلان</h3>
            <Input
              className="h-11"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="مثال: صور غير واضحة / معلومات ناقصة"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectId(null)}>
                إلغاء
              </Button>
              <Button className="bg-destructive text-destructive-foreground" disabled={moderating} onClick={onReject}>
                تأكيد الرفض
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
