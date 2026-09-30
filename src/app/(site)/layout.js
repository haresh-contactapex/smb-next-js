import { Montserrat, Playfair_Display } from "next/font/google";
import TopBar from "@/components/storefront/TopBar";
import SiteHeader from "@/components/storefront/SiteHeader";
import SiteFooter from "@/components/storefront/SiteFooter";
import "./storefront.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-playfair",
});

// Public storefront shell: announcement bar / header / main container / footer
// as distinct bands. Always light — the admin dark-mode class on <html> doesn't apply here.
export default function SiteLayout({ children }) {
  return (
    <div
      className={`${montserrat.variable} ${playfair.variable} min-h-screen flex flex-col bg-white text-[#555555] text-[16px] overflow-x-clip`}
      style={{ fontFamily: "var(--font-montserrat), sans-serif" }}
    >
      <TopBar />
      <SiteHeader />
      <main className="flex-1 bg-white">{children}</main>
      <SiteFooter />
    </div>
  );
}
