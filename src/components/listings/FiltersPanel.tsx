import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { BRANDS, CONDITIONS, SIZES, type ListingCondition } from "@/lib/data/catalog";
import { WILAYAS } from "@/lib/data/wilayas";

export interface Filters {
  q: string;
  wilaya: string;
  size: string;
  conditions: ListingCondition[];
  brand: string;
  yearFrom: number;
  yearTo: number;
}

export const DEFAULT_FILTERS: Filters = {
  q: "",
  wilaya: "all",
  size: "all",
  conditions: [],
  brand: "all",
  yearFrom: 2015,
  yearTo: 2026,
};

const WILAYA_OPTIONS = WILAYAS.map((w) => ({
  value: w.name,
  label: `${w.code} - ${w.name}`,
  keywords: w.name,
}));

const BRAND_OPTIONS = BRANDS.map((b) => ({ value: b, label: b }));
const SIZE_OPTIONS = SIZES.map((s) => ({ value: s, label: s, keywords: s.replace(/\s/g, "") }));

export function FiltersPanel({
  value,
  onChange,
  hideQuery = false,
}: {
  value: Filters;
  onChange: (next: Filters) => void;
  hideQuery?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  const set = <K extends keyof Filters>(key: K, v: Filters[K]) => onChange({ ...value, [key]: v });

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggle = <T extends string>(list: T[], item: T) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  return (
    <div className="space-y-4">
      {!hideQuery && (
        <div className="space-y-2">
          <Label htmlFor="filter-q">كلمة البحث</Label>
          <Input id="filter-q" value={value.q} onChange={(e) => set("q", e.target.value)} placeholder="ماركة، مقاس..." className="h-11" />
        </div>
      )}

      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
        <Label className="flex items-center gap-2 text-base font-bold text-primary">
          <MapPin className="size-5" />
          الولاية
        </Label>
        <SearchableSelect
          value={value.wilaya}
          onValueChange={(v) => set("wilaya", v)}
          options={WILAYA_OPTIONS}
          placeholder="اختر الولاية"
          searchPlaceholder="ابحث عن ولاية..."
          allOption={{ value: "all", label: "كل الولايات" }}
          triggerClassName="h-12 border-primary/40 bg-background text-base font-semibold"
        />
      </div>

      <Accordion type="multiple" defaultValue={mounted ? ["size", "brand", "condition"] : []}>
        <AccordionItem value="size">
          <AccordionTrigger>المقاس</AccordionTrigger>
          <AccordionContent>
            <SearchableSelect
              value={value.size}
              onValueChange={(v) => set("size", v)}
              options={SIZE_OPTIONS}
              placeholder="اختر المقاس"
              searchPlaceholder="ابحث عن مقاس..."
              allOption={{ value: "all", label: "كل المقاسات" }}
              triggerClassName="h-11"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="brand">
          <AccordionTrigger>الشركة المصنعة</AccordionTrigger>
          <AccordionContent>
            <SearchableSelect
              value={value.brand}
              onValueChange={(v) => set("brand", v)}
              options={BRAND_OPTIONS}
              placeholder="اختر الماركة"
              searchPlaceholder="ابحث عن ماركة..."
              allOption={{ value: "all", label: "كل الماركات" }}
              triggerClassName="h-11"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="condition">
          <AccordionTrigger>الحالة</AccordionTrigger>
          <AccordionContent className="space-y-3">
            {CONDITIONS.map((c) => (
              <label key={c.value} className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={value.conditions.includes(c.value)}
                  onCheckedChange={() => set("conditions", toggle(value.conditions, c.value))}
                />
                {c.label}
              </label>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="year">
          <AccordionTrigger>سنة الصنع</AccordionTrigger>
          <AccordionContent className="flex items-center gap-2">
            <Input type="number" className="h-11" value={value.yearFrom} onChange={(e) => set("yearFrom", Number(e.target.value))} />
            <span className="text-muted-foreground">إلى</span>
            <Input type="number" className="h-11" value={value.yearTo} onChange={(e) => set("yearTo", Number(e.target.value))} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button variant="outline" className="h-11 w-full" onClick={() => onChange(DEFAULT_FILTERS)}>
        إعادة تعيين الفلاتر
      </Button>
    </div>
  );
}
