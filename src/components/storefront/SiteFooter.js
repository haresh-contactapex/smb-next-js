import { STORE_FOOTER_LINES } from "./navLinks";

// Storefront footer: dark charcoal band with a brand-gold top rule, clearly
// separate from the white content area above it.
export default function SiteFooter() {
  return (
    <footer className="bg-[#2b2b2b] border-t-4 border-[#ef9822] text-gray-300">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-8 py-8 sm:py-10 text-center text-xs sm:text-sm leading-relaxed">
        <p>{STORE_FOOTER_LINES[0]}</p>
        <p className="mt-1">{STORE_FOOTER_LINES[1]}</p>
      </div>
    </footer>
  );
}
