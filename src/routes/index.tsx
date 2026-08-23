import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CircleDollarSign, Handshake, LayoutGrid, PlusCircle, Users } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { DemoListingsBanner } from "@/components/listings/DemoListingsBanner";
import { HeroSection } from "@/components/home/HeroSection";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/button";
import { useAllListings, useApp } from "@/hooks/useApp";
import { useAppDispatch } from "@/store/hooks";
import { fetchListingsThunk, fetchFeaturedListingsThunk } from "@/store/slices/listingsSlice";
import { PLATFORM_STATS } from "@/lib/data/mock";
import { formatNumber } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "عجلات الجزائر | سوق بيع وشراء الإطارات" },
      {
        name: "description",
        content: "تصفح آلاف إعلانات الإطارات الجديدة والمستعملة في 48 ولاية جزائرية، وأضف إعلانك مجاناً.",
      },
      { property: "og:title", content: "عجلات الجزائر | سوق بيع وشراء الإطارات" },
      {
        property: "og:description",
        content: "آلاف إعلانات الإطارات عبر كل الولايات الجزائرية، مع بحث متقدم واتصال مباشر بالبائع.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const listings = useAllListings();
  const { recent, hydrated } = useApp();
  const [wilaya, setWilaya] = useState("all");

  useEffect(() => {
    if (hydrated) {
      dispatch(fetchListingsThunk());
      dispatch(fetchFeaturedListingsThunk(6));
    }
  }, [dispatch, hydrated]);

  const featured = useMemo(() => listings.filter((l) => l.isPromoted || l.featured).slice(0, 8), [listings]);
  const newest = useMemo(
    () => [...listings].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8),
    [listings],
  );
  const recentlyViewed = useMemo(
    () => recent.map((id) => listings.find((l) => l.id === id)).filter(Boolean).slice(0, 4),
    [recent, listings],
  );

  const search = () =>
    navigate({
      to: "/listings",
      search: {
        wilaya: wilaya === "all" ? undefined : wilaya,
      },
    });

  return (
    <div>
      <HeroSection
        wilaya={wilaya}
        onWilayaChange={setWilaya}
        onSearch={search}
      />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <DemoListingsBanner />
        <SectionHead title="إعلانات مميزة" subtitle="أفضل العروض المختارة لك" action />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </section>

      <section className="bg-secondary py-8">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHead title="أحدث الإعلانات" subtitle="مضافة حديثاً من كل الولايات" action />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {newest.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </div>
      </section>

      {recentlyViewed.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <SectionHead title="شاهدتها مؤخراً" subtitle="إعلانات زرتها في وقت سابق" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recentlyViewed.map((l) => l && <ListingCard key={l.id} listing={l} />)}
          </div>
        </section>
      )}

      <section className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: LayoutGrid, label: "إعلان منشور", value: PLATFORM_STATS.listings },
            { icon: Users, label: "مستخدم نشط", value: PLATFORM_STATS.users },
            { icon: Handshake, label: "صفقة ناجحة", value: PLATFORM_STATS.deals },
            { icon: CircleDollarSign, label: "ولاية مغطاة", value: PLATFORM_STATS.wilayas },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="text-lg font-black">{formatNumber(s.value)}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-primary/5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 text-center">
          <h2 className="text-2xl font-black">لديك إطارات للبيع؟</h2>
          <p className="max-w-md text-sm text-muted-foreground">انشر إعلانك مجاناً ووصل لآلاف المشترين في كل الولايات.</p>
          <Button asChild size="lg" className="h-12 gap-2 px-8 text-base font-bold shadow-lg">
            <Link to="/create-listing">
              <PlusCircle className="size-5" />
              أضف إعلانك الآن
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function SectionHead({ title, subtitle, action }: { title: string; subtitle: string; action?: boolean }) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        <h2 className="truncate text-xl font-black sm:text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action && (
        <Button asChild variant="outline" className="h-11 shrink-0">
          <Link to="/listings">عرض الكل</Link>
        </Button>
      )}
    </div>
  );
}
