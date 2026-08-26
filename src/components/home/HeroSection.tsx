import { MapPin, Search, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { WILAYAS } from "@/lib/data/wilayas";
import heroImg from "@/assets/hero-wheels.jpg";

const WILAYA_OPTIONS = WILAYAS.map((w) => ({
  value: w.name,
  label: `${w.code} - ${w.name}`,
  keywords: w.name,
}));

type HeroSectionProps = {
  wilaya: string;
  onWilayaChange: (value: string) => void;
  onSearch: () => void;
};

export function HeroSection({ wilaya, onWilayaChange, onSearch }: HeroSectionProps) {
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
      <div className="absolute inset-0 bg-gradient-to-l from-slate-950 via-slate-950/85 to-slate-950/45" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/70 to-transparent sm:h-36" />

      <div className="relative mx-auto max-w-7xl px-4 pb-6 pt-8 sm:pb-14 sm:pt-14 lg:pb-20 lg:pt-20">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2.5 text-white sm:gap-3">
            <BrandLogo size="md" markClassName="size-9 sm:size-11" />
            <span className="text-lg font-extrabold tracking-tight sm:text-2xl lg:text-3xl">
              عجلات الجزائر
            </span>
          </p>
          <h1 className="mt-3 text-2xl font-black leading-[1.25] tracking-tight text-white sm:mt-6 sm:text-4xl lg:text-5xl">
            اعثر على الإطار المناسب
            <span className="mt-1 block text-base font-bold text-amber-200/95 sm:mt-2 sm:text-2xl lg:text-3xl">
              في دقائق، من كل الولايات
            </span>
          </h1>
          <p className="mt-2 hidden max-w-lg text-base leading-8 text-slate-200/90 sm:mt-4 sm:block sm:text-lg">
            تصفّح عروض حقيقية وتواصل مع البائع مباشرة — بدون تعقيد وبدون وسطاء.
          </p>
          <ul className="mt-3 hidden flex-wrap gap-2 sm:mt-6 sm:flex">
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
          className="relative mt-5 overflow-hidden rounded-2xl border border-white/20 bg-white/95 p-2.5 shadow-lg backdrop-blur-xl dark:bg-slate-950/90 sm:mt-10 sm:rounded-3xl sm:p-4 sm:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]"
        >
          <div className="grid items-stretch gap-2 sm:gap-3 lg:grid-cols-[1fr_auto]">
            <label className="group flex min-w-0 flex-col justify-center rounded-xl px-3 py-2 transition-colors hover:bg-slate-100/80 dark:hover:bg-white/5 sm:rounded-2xl sm:px-4 sm:py-3">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                <MapPin className="size-3.5 text-primary" />
                الولاية
              </span>
              <div className="mt-1 sm:mt-2">
                <SearchableSelect
                  value={wilaya}
                  onValueChange={onWilayaChange}
                  options={WILAYA_OPTIONS}
                  placeholder="كل الولايات"
                  searchPlaceholder="ابحث عن ولاية..."
                  allOption={{ value: "all", label: "كل الولايات" }}
                  triggerClassName="h-10 border-0 bg-transparent px-0 text-sm font-bold shadow-none sm:h-11 sm:text-base"
                />
              </div>
            </label>

            <Button
              type="submit"
              className="h-12 gap-2 rounded-xl px-5 text-sm font-black shadow-md shadow-primary/25 sm:h-14 sm:rounded-2xl sm:px-8 sm:text-base lg:h-auto lg:min-h-14"
            >
              <Search className="size-4 sm:size-5" />
              ابحث الآن
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
