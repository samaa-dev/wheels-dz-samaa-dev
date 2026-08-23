import { useIsDemoListings } from "@/hooks/useApp";

export function DemoListingsBanner() {
  const isDemo = useIsDemoListings();
  if (import.meta.env.PROD || !isDemo) return null;

  return (
    <div
      role="status"
      className="mt-4 mb-6 rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-950 dark:text-amber-100"
    >
      إعلانات تجريبية للعرض — فعّل «الإنترنت» في الأعلى لجلب الإعلانات الحقيقية.
    </div>
  );
}
