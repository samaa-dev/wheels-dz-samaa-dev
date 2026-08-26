import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Filter, LayoutGrid, List, MapPin, PlusCircle, SearchX, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import { DemoListingsBanner } from "@/components/listings/DemoListingsBanner";
import { ListingCard, ListingCardSkeleton } from "@/components/listings/ListingCard";
import { FiltersPanel, type Filters } from "@/components/listings/FiltersPanel";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { useAllListings, useApp } from "@/hooks/useApp";
import { useAppDispatch } from "@/store/hooks";
import { fetchListingsThunk } from "@/store/slices/listingsSlice";
import { type ListingCondition, normalizeCondition } from "@/lib/data/catalog";
import { WILAYAS } from "@/lib/data/wilayas";
import { formatNumber } from "@/lib/format";
import { delay } from "@/lib/storage";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: z.string().optional(),
  wilaya: z.string().optional(),
  size: z.string().optional(),
  category: z.string().optional(),
  condition: z.string().optional(),
  brand: z.string().optional(),
  yearFrom: z.number().optional(),
  yearTo: z.number().optional(),
  sort: z.enum(["newest", "oldest"]).optional(),
  page: z.number().optional(),
});

const WILAYA_OPTIONS = WILAYAS.map((w) => ({
  value: w.name,
  label: `${w.code} - ${w.name}`,
  keywords: w.name,
}));

export const Route = createFileRoute("/listings")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "تصفح إعلانات الإطارات | عجلات الجزائر" },
      { name: "description", content: "فلترة متقدمة حسب الولاية، الماركة والحالة لآلاف إعلانات الإطارات." },
      { property: "og:title", content: "تصفح إعلانات الإطارات والجنوط | عجلات الجزائر" },
      { property: "og:description", content: "فلترة متقدمة حسب الولاية، الماركة والحالة." },
    ],
  }),
  component: ListingsPage,
});

const PER_PAGE = 12;

function ListingsPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/listings" });
  const dispatch = useAppDispatch();
  const all = useAllListings();
  const { hydrated } = useApp();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (hydrated) {
      dispatch(fetchListingsThunk());
    }
  }, [dispatch, hydrated]);

  const [filters, setFilters] = useState<Filters>({
    q: params.q ?? "",
    wilaya: params.wilaya ?? "all",
    size: params.size ?? "all",
    conditions: params.condition ? [params.condition as ListingCondition] : [],
    brand: params.brand ?? "all",
    yearFrom: params.yearFrom ?? 2015,
    yearTo: params.yearTo ?? 2026,
  });

  const page = params.page ?? 1;
  const sort = params.sort ?? "newest";

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      q: params.q ?? "",
      wilaya: params.wilaya ?? "all",
      size: params.size ?? "all",
      conditions: params.condition ? [params.condition as ListingCondition] : [],
      brand: params.brand ?? "all",
    }));
  }, [params.q, params.wilaya, params.size, params.condition, params.brand]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    delay(450).then(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filters, sort, page]);

  const results = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const filtered = all.filter((l) => {
      if (l.status !== "active") return false;
      if (q && !`${l.title} ${l.brand} ${l.model} ${l.size}`.toLowerCase().includes(q)) return false;
      if (filters.wilaya !== "all" && l.wilaya !== filters.wilaya) return false;
      if (filters.size !== "all" && l.size !== filters.size) return false;
      if (filters.conditions.length && !filters.conditions.includes(normalizeCondition(l.condition))) return false;
      if (filters.brand !== "all" && l.brand !== filters.brand) return false;
      if (l.year && (l.year < filters.yearFrom || l.year > filters.yearTo)) return false;
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return +new Date(a.createdAt) - +new Date(b.createdAt);
        default:
          return +new Date(b.createdAt) - +new Date(a.createdAt);
      }
    });
    return sorted;
  }, [all, filters, sort]);

  const pages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const current = Math.min(page, pages);
  const visible = results.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const setPage = (p: number) => navigate({ search: (prev) => ({ ...prev, page: p }) });
  const setSort = (value: string) =>
    navigate({ search: (prev) => ({ ...prev, sort: value as typeof sort, page: 1 }) });

  const applyFilters = (next: Filters) => {
    setFilters(next);
    navigate({
      search: (prev) => ({
        ...prev,
        q: next.q || undefined,
        wilaya: next.wilaya === "all" ? undefined : next.wilaya,
        size: next.size === "all" ? undefined : next.size,
        brand: next.brand === "all" ? undefined : next.brand,
        condition: next.conditions[0],
        page: 1,
      }),
    });
  };

  const setWilayaQuick = (wilaya: string) => {
    applyFilters({ ...filters, wilaya });
  };

  const panel = <FiltersPanel value={filters} onChange={applyFilters} />;

  const wilayaLabel =
    filters.wilaya === "all"
      ? "كل الولايات"
      : WILAYA_OPTIONS.find((w) => w.value === filters.wilaya)?.label ?? filters.wilaya;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-black sm:text-2xl">تصفح الإعلانات</h1>
          <p className="mt-1 text-sm text-muted-foreground">اعثر على الإطار المناسب من بين آلاف العروض.</p>
        </div>
        <Button asChild className="h-11 gap-2 px-4 font-bold shadow-md sm:h-12 sm:px-6">
          <Link to="/create-listing">
            <PlusCircle className="size-5" /> أضف إعلان
          </Link>
        </Button>
      </div>
      <DemoListingsBanner />

      {/* Mobile: quick wilaya filter — always visible */}
      <div className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-3 lg:hidden">
        <div className="mb-2 flex items-center justify-between gap-2">
          <LabelLike>
            <MapPin className="size-4" />
            الولاية
          </LabelLike>
          {filters.wilaya !== "all" && (
            <button
              type="button"
              onClick={() => setWilayaQuick("all")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
            >
              <X className="size-3.5" />
              مسح
            </button>
          )}
        </div>
        <SearchableSelect
          value={filters.wilaya}
          onValueChange={setWilayaQuick}
          options={WILAYA_OPTIONS}
          placeholder="كل الولايات"
          searchPlaceholder="ابحث عن ولاية..."
          allOption={{ value: "all", label: "كل الولايات" }}
          triggerClassName="h-12 border-primary/30 bg-background text-base font-semibold"
        />
        {filters.wilaya !== "all" && (
          <p className="mt-2 truncate text-xs text-muted-foreground">محدد: {wilayaLabel}</p>
        )}
      </div>

      <div className="mt-4 grid gap-6 lg:mt-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-lg border border-border bg-card p-4">{panel}</div>
        </aside>

        <div className="min-w-0">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border bg-card p-2.5 sm:flex sm:justify-between sm:gap-3 sm:p-3">
            <span className="min-w-0 truncate text-sm font-medium">
              {loading ? "جارٍ التحميل..." : `${formatNumber(results.length)} إعلان`}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2 px-3 lg:hidden">
                    <Filter className="size-4" />
                    المزيد
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[min(100%,22rem)] overflow-y-auto p-4">
                  <SheetTitle className="mb-4 text-start">فلاتر إضافية</SheetTitle>
                  {panel}
                </SheetContent>
              </Sheet>

              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-10 w-[7.5rem] sm:h-11 sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">الأحدث أولاً</SelectItem>
                  <SelectItem value="oldest">الأقدم أولاً</SelectItem>
                </SelectContent>
              </Select>

              <div className="hidden rounded-md border border-border p-1 sm:flex">
                <Button
                  variant={view === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="size-9"
                  onClick={() => setView("grid")}
                  aria-label="عرض شبكي"
                >
                  <LayoutGrid className="size-4" />
                </Button>
                <Button
                  variant={view === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="size-9"
                  onClick={() => setView("list")}
                  aria-label="عرض قائمة"
                >
                  <List className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ListingCardSkeleton key={i} compact />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-10 rounded-lg border border-dashed border-border p-12 text-center">
              <SearchX className="mx-auto size-10 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-bold">لا توجد نتائج مطابقة</h2>
              <p className="mt-1 text-sm text-muted-foreground">جرّب إزالة بعض الفلاتر أو توسيع البحث.</p>
              <Button asChild className="mt-6 h-12 gap-2 font-bold">
                <Link to="/create-listing">
                  <PlusCircle className="size-5" /> أضف إعلانك
                </Link>
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                "mt-6 grid gap-3 sm:gap-5",
                view === "grid" ? "grid-cols-2 xl:grid-cols-3" : "grid-cols-1",
              )}
            >
              {visible.map((l) => (
                <ListingCard key={l.id} listing={l} view={view} compact={view === "grid"} />
              ))}
            </div>
          )}

          {pages > 1 && !loading && (
            <Pagination className="mt-8">
              <PaginationContent>
                {Array.from({ length: pages })
                  .slice(0, 8)
                  .map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        href="#"
                        isActive={current === i + 1}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(i + 1);
                        }}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </div>
  );
}

function LabelLike({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary">{children}</span>
  );
}
