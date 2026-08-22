import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartOff } from "lucide-react";
import { toast } from "sonner";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/button";
import { useAllListings, useApp } from "@/hooks/useApp";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "إعلاناتي المفضلة | عجلات الجزائر" },
      { name: "description", content: "كل الإعلانات التي حفظتها في مكان واحد للرجوع إليها لاحقاً." },
      { property: "og:title", content: "إعلاناتي المفضلة | عجلات الجزائر" },
      { property: "og:description", content: "الإعلانات التي حفظتها في مكان واحد." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { favorites, toggleFavorite, hydrated } = useApp();
  const all = useAllListings();
  const items = all.filter((l) => favorites.includes(l.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-black">المفضلة</h1>
      <p className="mt-1 text-sm text-muted-foreground">{favorites.length} إعلان محفوظ</p>

      {!hydrated ? null : items.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-border p-12 text-center">
          <HeartOff className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-bold">قائمة المفضلة فارغة</h2>
          <Button asChild className="mt-6 h-12"><Link to="/listings">تصفح الإعلانات</Link></Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((l) => (
            <div key={l.id} className="space-y-2">
              <ListingCard listing={l} />
              <Button
                variant="outline"
                className="h-11 w-full"
                onClick={() => { toggleFavorite(l.id); toast.info("تمت الإزالة من المفضلة"); }}
              >
                إزالة من المفضلة
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
