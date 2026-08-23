import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, LogOut, Menu, PlusCircle, Search, User2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LiveListingsToggle } from "@/components/listings/LiveListingsToggle";
import { useApp } from "@/hooks/useApp";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "الرئيسية" },
  { to: "/listings", label: "تصفح الإعلانات" },
  { to: "/create-listing", label: "أضف إعلانك" },
  { to: "/favorites", label: "المفضلة" },
];

export function Header() {
  const { user, logout, favorites } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/listings", search: { q: q || undefined } });
    setOpen(false);
  };

  return (
    <header className="no-print sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-auto min-h-16 max-w-7xl flex-wrap items-center gap-3 px-4 py-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="size-11 lg:hidden" aria-label="القائمة">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetTitle className="px-4 pt-4 text-start">القائمة</SheetTitle>
            <form onSubmit={submit} className="relative mx-4 mt-4">
              <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث عن إطارات، ماركة..."
                className="h-11 pe-10"
                aria-label="بحث"
              />
            </form>
            <nav className="mt-4 flex flex-col gap-1 px-2">
              {NAV.slice(0, 2).map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-4 py-3 text-sm font-medium hover:bg-accent"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/create-listing"
                onClick={() => setOpen(false)}
                className="mx-2 mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-md"
              >
                <PlusCircle className="size-5" />
                أضف إعلانك
              </Link>
              {NAV.slice(2).map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-4 py-3 text-sm font-medium hover:bg-accent"
                >
                  {item.label}
                </Link>
              ))}
              <div className="px-2 py-3">
                <LiveListingsToggle className="w-full justify-center" showLabels="always" />
              </div>
              {!user && (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="rounded-md px-4 py-3 text-sm font-medium hover:bg-accent">
                    تسجيل الدخول
                  </Link>
                  <Link to="/register" onClick={() => setOpen(false)} className="rounded-md px-4 py-3 text-sm font-medium hover:bg-accent">
                    إنشاء حساب
                  </Link>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
            دج
          </span>
          <span className="hidden text-lg font-extrabold sm:inline">عجلات الجزائر</span>
        </Link>

        <form onSubmit={submit} className="relative min-w-0 flex-1 basis-full sm:basis-auto md:min-w-[200px]">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن إطارات، ماركة..."
            className="h-11 pe-10"
            aria-label="بحث"
          />
        </form>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.slice(0, 2).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn("rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground")}
              activeProps={{ className: "text-primary" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <LiveListingsToggle />
          <Link to="/favorites" className="relative hidden sm:block">
            <Button variant="ghost" size="icon" className="size-11" aria-label="المفضلة">
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
                <Button variant="outline" className="h-11 gap-2">
                  <User2 className="size-4" />
                  <span className="hidden max-w-24 truncate sm:inline">{user.name}</span>
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="size-4" /> تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost" className="h-11">
                <Link to="/login">دخول</Link>
              </Button>
              <Button asChild className="h-11">
                <Link to="/register">حساب جديد</Link>
              </Button>
            </div>
          )}

          <Button asChild className="h-11 gap-2 bg-primary px-4 font-bold shadow-md hover:bg-primary/90">
            <Link to="/create-listing">
              <PlusCircle className="size-4" />
              <span>أضف إعلان</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
