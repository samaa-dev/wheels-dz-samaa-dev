import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, Phone, Send } from "lucide-react";

export function Footer() {
  return (
    <footer className="no-print mt-16 border-t border-border bg-secondary">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
              دج
            </span>
            <span className="text-lg font-extrabold">عجلات الجزائر</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            أول سوق جزائري متخصص في بيع وشراء الإطارات المستعملة والجديدة عبر كل الولايات.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold">روابط مفيدة</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/listings" className="hover:text-primary">تصفح الإعلانات</Link></li>
            <li><Link to="/create-listing" className="hover:text-primary">أضف إعلانك مجاناً</Link></li>
            <li><Link to="/favorites" className="hover:text-primary">إعلاناتي المفضلة</Link></li>
            <li><Link to="/register" className="hover:text-primary">إنشاء حساب</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold">تصفح حسب</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/listings" className="hover:text-primary">كل الإطارات</Link></li>
            <li><Link to="/listings" search={{ condition: "new" }} className="hover:text-primary">إطارات جديدة</Link></li>
            <li><Link to="/listings" search={{ condition: "like_new" }} className="hover:text-primary">شبه جديد</Link></li>
            <li><Link to="/listings" search={{ condition: "used" }} className="hover:text-primary">مستعمل</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold">اتصل بنا</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Phone className="size-4 shrink-0" /> 021 55 44 33</li>
            <li className="flex items-center gap-2"><Mail className="size-4 shrink-0" /> contact@djazair-wheels.dz</li>
            <li className="flex items-center gap-2"><MapPin className="size-4 shrink-0" /> حي بن عكنون، الجزائر العاصمة</li>
          </ul>
          <div className="mt-4 flex gap-2">
            {[Facebook, Instagram, Send].map((Icon, i) => (
              <span key={i} className="grid size-11 place-items-center rounded-md bg-background text-muted-foreground transition-colors hover:text-primary">
                <Icon className="size-5" />
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} عجلات الجزائر — جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}
