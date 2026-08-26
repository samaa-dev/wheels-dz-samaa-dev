import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, Heart, LayoutList, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAllListings, useApp, CONTACT_LIMIT } from "@/hooks/useApp";
import { getAccountTypeLabel, isProfileComplete } from "@/lib/auth/account";
import { isModeratorOrAdmin } from "@/lib/auth/permissions";
import { WILAYAS } from "@/lib/data/wilayas";
import { formatDate, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "الملف الشخصي | عجلات الجزائر" },
      { name: "description", content: "أدر بياناتك الشخصية، إعلاناتك، مفضلتك وإعداداتك في مكان واحد." },
      { property: "og:title", content: "الملف الشخصي | عجلات الجزائر" },
      { property: "og:description", content: "أدر بياناتك، إعلاناتك ومفضلتك." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, updateUser, myListings, favorites, views, hydrated } = useApp();
  const navigate = useNavigate();
  const all = useAllListings();
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "", wilaya: "" });

  useEffect(() => {
    if (hydrated && user && !isProfileComplete(user)) {
      navigate({ to: "/complete-profile", search: { redirect: "/profile" } });
    }
  }, [hydrated, user, navigate]);

  if (!hydrated) return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">جارٍ التحميل...</div>;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-black">يجب تسجيل الدخول</h1>
        <p className="mt-2 text-sm text-muted-foreground">سجّل الدخول للوصول إلى ملفك الشخصي.</p>
        <Button asChild className="mt-6 h-12"><Link to="/login">تسجيل الدخول</Link></Button>
      </div>
    );
  }

  if (!isProfileComplete(user)) {
    return null;
  }

  const totalViews = Object.values(views).reduce((a, b) => a + b, 0);
  const favListings = all.filter((l) => favorites.includes(l.id));

  const startEdit = () => {
    setDraft({ name: user.name, phone: user.phone, wilaya: user.wilaya });
    setEdit(true);
  };

  const save = () => {
    updateUser(draft);
    setEdit(false);
    toast.success("تم تحديث بياناتك");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-lg border border-border bg-card p-6 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-xl font-black text-primary-foreground">
            {user.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black">{user.name}</h1>
            <p className="truncate text-sm text-muted-foreground">{user.email} · {getAccountTypeLabel(user.accountType)} · عضو منذ {formatDate(user.memberSince)}</p>
          </div>
        </div>
        <Button asChild className="h-11 shrink-0 font-bold"><Link to="/create-listing">أضف إعلان</Link></Button>
      </header>

      {isModeratorOrAdmin(user) && (
        <div className="mt-4">
          <Button asChild variant="outline" className="h-11">
            <Link to="/admin/dashboard">لوحة التحكم</Link>
          </Button>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { icon: LayoutList, label: "إعلاناتي", value: myListings.length },
          { icon: Eye, label: "مشاهدات", value: totalViews },
          { icon: Heart, label: "المفضلة", value: favorites.length },
        ].map((s) => (
          <Card key={s.label} className="flex-row items-center gap-4 p-5">
            <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary"><s.icon className="size-5" /></span>
            <div><div className="text-xl font-black">{formatNumber(s.value)}</div><div className="text-sm text-muted-foreground">{s.label}</div></div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="profile" className="mt-8">
        <TabsList className="h-11">
          <TabsTrigger value="profile">الملف</TabsTrigger>
          <TabsTrigger value="listings">إعلاناتي</TabsTrigger>
          <TabsTrigger value="favorites">المفضلة</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-base">البيانات الشخصية</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {edit ? (
                <>
                  <div className="space-y-2"><Label>الاسم</Label><Input className="h-12" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>الهاتف</Label><Input className="h-12" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>الولاية</Label>
                    <SearchableSelect
                      value={draft.wilaya}
                      onValueChange={(v) => setDraft({ ...draft, wilaya: v })}
                      options={WILAYAS.map((w) => ({ value: w.name, label: `${w.code} - ${w.name}` }))}
                      placeholder="اختر الولاية"
                      searchPlaceholder="ابحث عن ولاية..."
                      triggerClassName="h-12"
                    />
                  </div>
                  <div className="flex gap-2"><Button className="h-11" onClick={save}>حفظ</Button><Button variant="outline" className="h-11" onClick={() => setEdit(false)}>إلغاء</Button></div>
                </>
              ) : (
                <>
                  <Row label="الاسم" value={user.name} />
                  <Row label="البريد" value={user.email} />
                  <Row label="الهاتف" value={user.phone} />
                  <Row label="الولاية" value={user.wilaya} />
                  <Row label="نوع الحساب" value={getAccountTypeLabel(user.accountType)} />
                  <Button className="h-11" onClick={startEdit}>تعديل البيانات</Button>
                  <Button asChild variant="outline" className="h-11">
                    <Link to="/complete-profile" search={{ redirect: "/profile" }}>تغيير نوع الحساب</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listings" className="mt-6">
          {myListings.length === 0 ? (
            <EmptyState text="لم تنشر أي إعلان بعد." />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {myListings.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
          <Button asChild variant="outline" className="mt-6 h-11"><Link to="/my-listings">إدارة الإعلانات</Link></Button>
        </TabsContent>

        <TabsContent value="favorites" className="mt-6">
          {favListings.length === 0 ? <EmptyState text="لا توجد إعلانات في المفضلة." /> : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{favListings.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-base">الإعدادات</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {["إشعارات البريد الإلكتروني", "إشعارات الرسائل القصيرة", "إظهار رقم الهاتف في الإعلانات"].map((label) => (
                <div key={label} className="flex items-center justify-between rounded-md border border-border p-4">
                  <span className="text-sm">{label}</span>
                  <Switch defaultChecked onCheckedChange={() => toast.success("تم حفظ التفضيل")} />
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-md bg-muted p-4 text-sm text-muted-foreground">
                <Phone className="size-4" /> حد عرض أرقام الهواتف: {CONTACT_LIMIT} إعلانات يومياً.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/60 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">{text}</div>;
}
