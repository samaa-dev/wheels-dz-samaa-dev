import { CircleDollarSign, MapPin, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Slider } from "@/components/ui/slider";
import { WILAYAS } from "@/lib/data/wilayas";
import { formatDZD } from "@/lib/format";
import heroImg from "@/assets/hero-wheels.jpg";

const WILAYA_OPTIONS = WILAYAS.map((w) => ({
  value: w.name,
  label: `${w.code} - ${w.name}`,
  keywords: w.name,
}));

type HeroSectionProps = {
  wilaya: string;
  maxPrice: number;
  onWilayaChange: (value: string) => void;
  onMaxPriceChange: (value: number) => void;
  onSearch: () => void;
};

export function HeroSection({
  wilaya,
  maxPrice,
  onWilayaChange,
  onMaxPriceChange,
  onSearch,
}: HeroSectionProps) {
  return (
    <section className="relative isolate overflow-hidden">
      <img
        src={heroImg}
        alt="إطارات سيارات"
        width={1920}
        height={1080}
        className="absolute inset-0 size-full scale-105 object-cover object-[center_35%]"
      />
      <div className="absolute inset-0 bg-primary/20 mix-blend-overlay" />
      <div className="absolute -start-24 top-10 size-80 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="absolute -end-16 bottom-0 size-96 rounded-full bg-sky-500/15 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-l from-slate-950 via-slate-950/80 to-slate-950/40" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-slate-950/80 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 lg:pb-20 lg:pt-20">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-amber-200 backdrop-blur-md">
            <Sparkles className="size-3.5" />
            سوق جزائري متخصص في الإطارات
          </p>
          <h1 className="mt-5 text-4xl font-black leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-6xl">
            اعثر على الإطار المناسب
            <span className="mt-2 block bg-gradient-to-l from-amber-200 via-white to-sky-200 bg-clip-text text-transparent">
              في دقائق، من كل الولايات
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-slate-200/90 sm:text-lg">
            تصفّح عروض حقيقية، قارن الأسعار، وتواصل مع البائع مباشرة — بدون تعقيد وبدون وسطاء.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {[
              { icon: ShieldCheck, label: "إعلان مجاني" },
              { icon: MapPin, label: "تغطية 48 ولاية" },
              { icon: Search, label: "بحث سهل وسريع" },
            ].map((item) => (
              <li
                key={item.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-slate-100 ring-1 ring-white/12 backdrop-blur-sm"
              >
                <item.icon className="size-3.5 text-amber-300" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
          className="relative mt-10 overflow-hidden rounded-3xl border border-white/20 bg-white/92 p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl dark:bg-slate-950/85 sm:p-4"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-amber-300/70 to-transparent" />
          <div className="grid items-stretch gap-3 lg:grid-cols-[1.2fr_1.15fr_auto]">
            <label className="group flex min-w-0 flex-col justify-center rounded-2xl px-4 py-3 transition-colors hover:bg-slate-100/80 dark:hover:bg-white/5">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                <MapPin className="size-3.5 text-primary" />
                الولاية
              </span>
              <div className="mt-2">
                <SearchableSelect
                  value={wilaya}
                  onValueChange={onWilayaChange}
                  options={WILAYA_OPTIONS}
                  placeholder="كل الولايات"
                  searchPlaceholder="ابحث عن ولاية..."
                  allOption={{ value: "all", label: "كل الولايات" }}
                  triggerClassName="h-11 border-0 bg-transparent px-0 text-base font-bold shadow-none"
                />
              </div>
            </label>

            <div className="flex min-w-0 flex-col justify-center rounded-2xl px-4 py-3 lg:border-s lg:border-slate-200/80 dark:lg:border-white/10">
              <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CircleDollarSign className="size-3.5 text-primary" />
                  أقصى سعر
                </span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-black text-primary">
                  {formatDZD(maxPrice)}
                </span>
              </div>
              <Slider
                value={[maxPrice]}
                min={5000}
                max={300000}
                step={5000}
                onValueChange={(v) => onMaxPriceChange(v[0] ?? 0)}
                className="mt-4"
                aria-label="أقصى سعر"
              />
            </div>

            <Button
              type="submit"
              className="h-14 gap-2 rounded-2xl px-8 text-base font-black shadow-lg shadow-primary/30 lg:h-auto lg:min-h-14"
            >
              <Search className="size-5" />
              ابحث الآن
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
