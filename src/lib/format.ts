export function formatDZD(value: number): string {
  return `${new Intl.NumberFormat("ar-DZ", { maximumFractionDigits: 0 }).format(value)} دج`;
}

/** Returns formatted price or null when price is not set (0 or negative). */
export function formatListingPrice(value: number): string | null {
  if (!value || value <= 0) return null;
  return formatDZD(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ar-DZ").format(value);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ar-DZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "اليوم";
  if (days === 1) return "منذ يوم";
  if (days < 30) return `منذ ${days} يوم`;
  const months = Math.floor(days / 30);
  if (months < 12) return `منذ ${months} شهر`;
  return `منذ ${Math.floor(months / 12)} سنة`;
}