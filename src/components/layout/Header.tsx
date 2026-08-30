import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Heart, LogOut, Menu, PlusCircle, Search, User2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { LiveListingsToggle } from "@/components/listings/LiveListingsToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useApp } from "@/hooks/useApp";
import { isModeratorOrAdmin } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "الرئيسية" },
  { to: "/listings", label: "تصفح الإعلانات" },
  { to: "/create-listing", label: "أضف إعلانك" },
  { to: "/favorites", label: "المفضلة" },
] as const;

const SWIPE_CLOSE = 56;

export function Header() {
  const { user, logout, favorites } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const showAdmin = isModeratorOrAdmin(user);
  const urlQ = useRouterState({
    select: (s) => {
      const search = s.location.search as { q?: unknown };
      return typeof search?.q === "string" ? search.q : "";
    },
  });

  useEffect(() => {
    setQ(urlQ);
  }, [urlQ]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/listings", search: (prev) => ({ ...prev, q: q.trim() || undefined, page: 1 }) });
    setOpen(false);
  };

  const searchField = (
    <>
      <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ابحث عن إطارات، ماركة..."
        className="h-10 pe-10"
        aria-label="بحث"
      />
    </>
  );

  return (
    <header className="no-print sticky top-0 z-50 w-full border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl">
      <div className="flex h-14 items-center gap-3 px-4 md:h-16 md:gap-4">
        {/* Brand — right in RTL */}
        <Link
          to="/"
          className="flex min-w-0 shrink-0 items-center"
          aria-label="عجلات الجزائر — الرئيسية"
        >
          <BrandLogo
            size="md"
            withName
            className="md:gap-3"
            markClassName="md:size-10"
            nameClassName="md:text-base"
          />
        </Link>

        {/* Desktop search */}
        <form
          onSubmit={submit}
          className="relative hidden min-w-0 flex-1 md:block md:max-w-md lg:max-w-lg"
        >
          {searchField}
        </form>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 lg:flex">
          {NAV.slice(0, 2).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              )}
              activeProps={{ className: "bg-accent text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="ms-auto hidden items-center gap-1.5 md:flex">
          <LiveListingsToggle />

          <Link to="/favorites" className="relative">
            <Button variant="ghost" size="icon" className="size-10" aria-label="المفضلة">
              <Heart className="size-5" />
            </Button>
            {favorites.length > 0 && (
              <span className="absolute -top-0.5 start-0.5 grid size-5 place-items-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {favorites.length}
              </span>
            )}
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 gap-2 px-3">
                  <User2 className="size-4" />
                  <span className="hidden max-w-28 truncate lg:inline">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel>حسابي</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">الملف الشخصي</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my-listings">إعلاناتي</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/favorites">المفضلة</Link>
                </DropdownMenuItem>
                {showAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/dashboard">لوحة التحكم</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="size-4" /> تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button asChild variant="ghost" className="h-10">
                <Link to="/login" search={{}}>
                  دخول
                </Link>
              </Button>
              <Button asChild className="h-10">
                <Link to="/register" search={{}}>
                  حساب جديد
                </Link>
              </Button>
            </div>
          )}

          <Button asChild className="h-10 gap-2 px-3 font-bold">
            <Link to="/create-listing">
              <PlusCircle className="size-4" />
              <span className="hidden lg:inline">أضف إعلان</span>
            </Link>
          </Button>
        </div>

        {/* Mobile menu button — left in RTL */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ms-auto size-10 shrink-0 md:hidden"
          aria-label="القائمة"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu className="size-5" />
        </Button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="left"
            className="flex w-[min(100%,20rem)] flex-col gap-0 p-0"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              swipeStart.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerUp={(e) => {
              if (!swipeStart.current) return;
              const dx = e.clientX - swipeStart.current.x;
              const dy = e.clientY - swipeStart.current.y;
              swipeStart.current = null;
              // Panel is on the physical left: swipe further left to dismiss
              if (dx < -SWIPE_CLOSE && Math.abs(dx) > Math.abs(dy)) {
                setOpen(false);
              }
            }}
            onPointerCancel={() => {
              swipeStart.current = null;
            }}
          >
            <div className="shrink-0 border-b border-border px-5 py-5 pe-12">
              <SheetTitle className="sr-only">القائمة</SheetTitle>
              <BrandLogo size="lg" withName />
              <p className="mt-2 text-xs text-muted-foreground">سوق الإطارات والجنوط</p>
            </div>

            <form onSubmit={submit} className="relative shrink-0 border-b border-border px-4 py-3">
              <Search className="pointer-events-none absolute end-7 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث عن إطارات، ماركة..."
                className="h-11 pe-10"
                aria-label="بحث"
              />
            </form>

            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-3 pb-8">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-accent"
                >
                  {item.label}
                </Link>
              ))}

              <div className="my-2 px-1">
                <LiveListingsToggle className="w-full justify-center" showLabels="always" />
              </div>

              {!user ? (
                <div className="mt-2 grid gap-2 px-1">
                  <Button asChild className="h-11 font-bold">
                    <Link to="/login" search={{}} onClick={() => setOpen(false)}>
                      تسجيل الدخول
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11">
                    <Link to="/register" search={{}} onClick={() => setOpen(false)}>
                      إنشاء حساب
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-2 grid gap-1 border-t border-border pt-3">
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-accent"
                  >
                    الملف الشخصي
                  </Link>
                  <Link
                    to="/my-listings"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-accent"
                  >
                    إعلاناتي
                  </Link>
                  {showAdmin && (
                    <Link
                      to="/admin/dashboard"
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-accent"
                    >
                      لوحة التحكم
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      void logout();
                    }}
                    className="rounded-lg px-3 py-3 text-start text-sm font-medium text-destructive hover:bg-accent"
                  >
                    تسجيل الخروج
                  </button>
                </div>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <form onSubmit={submit} className="relative px-4 pb-3 md:hidden">
        {searchField}
      </form>
      </div>
    </header>
  );
}
