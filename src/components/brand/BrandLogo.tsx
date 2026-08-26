import logoImg from "@/assets/logo.png";
import { cn } from "@/lib/utils";

const SIZE = {
  sm: { mark: "size-8", name: "text-sm font-bold" },
  md: { mark: "size-9", name: "text-[0.95rem] font-bold leading-none" },
  lg: { mark: "size-11", name: "text-lg font-extrabold leading-none" },
  xl: { mark: "size-16", name: "text-xl font-extrabold leading-snug" },
} as const;

type BrandLogoProps = {
  size?: keyof typeof SIZE;
  /** Mark + name side by side (header/footer) */
  withName?: boolean;
  /** Mark above name (auth pages) */
  stacked?: boolean;
  className?: string;
  markClassName?: string;
  nameClassName?: string;
  alt?: string;
};

/**
 * Brand mark — quiet presentation: contain (no crop), no heavy chrome.
 */
export function BrandLogo({
  size = "md",
  withName = false,
  stacked = false,
  className,
  markClassName,
  nameClassName,
  alt = "عجلات الجزائر",
}: BrandLogoProps) {
  const s = SIZE[size];

  const mark = (
    <img
      src={logoImg}
      alt={withName || stacked ? "" : alt}
      width={64}
      height={64}
      decoding="async"
      className={cn(s.mark, "shrink-0 object-contain", markClassName)}
    />
  );

  if (!withName && !stacked) {
    return <span className={cn("inline-flex", className)}>{mark}</span>;
  }

  const name = (
    <span className={cn(s.name, "text-foreground", nameClassName)}>عجلات الجزائر</span>
  );

  if (stacked) {
    return (
      <span className={cn("inline-flex flex-col items-center gap-2.5 text-center", className)}>
        {mark}
        {name}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      {mark}
      <span className="min-w-0 truncate">{name}</span>
    </span>
  );
}

export { logoImg };
