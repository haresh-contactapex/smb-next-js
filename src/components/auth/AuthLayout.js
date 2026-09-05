import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";

const FEATURES = [
  { icon: "truck", text: "Free shipping on every order, no minimum" },
  { icon: "shield", text: "Secure checkout with buyer protection" },
  { icon: "gift", text: "Earn rewards points on every purchase" },
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50 dark:bg-darkbg">
      <div className="hidden lg:flex flex-col justify-between p-10 xl:p-14 bg-gradient-to-br from-primary-600 to-primary-800 text-white relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute -left-16 -bottom-24 w-64 h-64 rounded-full bg-white/5" />

        <Link href="/" className="flex items-center gap-2.5 relative">
          <span className="w-10 h-10 rounded-xl bg-white/10 grid place-items-center shrink-0">
            <Icon name="gift" className="w-5 h-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-bold text-lg">Shop My Band</span>
            <span className="block text-xs text-white/70">Rings &amp; Bands Boutique</span>
          </span>
        </Link>

        <div className="relative space-y-8 max-w-md">
          <h2 className="text-3xl xl:text-4xl font-bold leading-tight">
            Find the band that tells your story.
          </h2>
          <ul className="space-y-4">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-sm text-white/85">
                <span className="w-8 h-8 rounded-lg bg-white/10 grid place-items-center shrink-0">
                  <Icon name={f.icon} className="w-4 h-4" />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} Shop My Band. All rights reserved.</p>
      </div>

      <div className="flex flex-col justify-center items-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Link href="/" className="flex lg:hidden items-center gap-2.5 mb-8">
            <span className="w-9 h-9 rounded-xl bg-primary-500 dark:bg-accent-500 text-white grid place-items-center shrink-0">
              <Icon name="gift" className="w-4 h-4" />
            </span>
            <span className="font-bold text-slate-800 dark:text-white">Shop My Band</span>
          </Link>

          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{subtitle}</p>}

          <div className="mt-7">{children}</div>

          {footer && <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
