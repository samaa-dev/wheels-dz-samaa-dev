import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import {
  ClipboardCheck,
  LayoutDashboard,
  Loader2,
  Megaphone,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/hooks/useApp";
import { isModeratorOrAdmin } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const ADMIN_NAV = [
  { to: "/admin/dashboard", label: "لوحة الملخص", icon: LayoutDashboard },
  { to: "/admin/listings", label: "الإعلانات", icon: Megaphone },
  { to: "/admin/users", label: "المستخدمون", icon: Users },
  { to: "/admin/stats", label: "الإحصائيات", icon: ClipboardCheck },
  { to: "/admin/reviews", label: "التقييمات", icon: Star },
] as const;

function AdminLayout() {
  const { user, hydrated } = useApp();

  if (!hydrated) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !isModeratorOrAdmin(user)) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-black">غير مصرّح</h1>
        <p className="mt-2 text-sm text-muted-foreground">هذه الصفحة للإدارة فقط.</p>
        <Button asChild className="mt-6 h-11">
          <Link to="/">الرئيسية</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black">لوحة التحكم</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          إدارة المستخدمين، قبول الإعلانات، الإحصائيات والتقييمات
        </p>
      </div>

      <nav className="mb-8 flex flex-wrap gap-2 border-b border-border pb-4">
        {ADMIN_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            activeProps={{
              className: "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
            }}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
