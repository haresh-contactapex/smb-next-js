import Link from "next/link";
import { connection } from "next/server";
import { STORE_FOOTER_LINES } from "./navLinks";
import { listFooterPages } from "@/lib/cms";
import { CMS_FOOTER_GROUPS } from "@/lib/cmsRules";

// The footer links come from CMS pages that are published and placed in a footer
// column (admin panel -> CMS). A failed lookup just leaves the columns out: the footer
// must never take a page down with it.
async function loadFooterColumns() {
  try {
    const pages = await listFooterPages();
    return CMS_FOOTER_GROUPS.map((group) => ({
      label: group.label,
      columns: group.columns || 1,
      pages: pages.filter((page) => page.footerGroup === group.value),
    })).filter((column) => column.pages.length > 0);
  } catch (error) {
    console.error("Footer pages failed to load", error);
    return [];
  }
}


// Storefront footer: dark charcoal band with a brand-gold top rule, clearly
// separate from the white content area above it. `columns` is [{ label, columns, pages: [{ slug, label }] }].
export function SiteFooterView({ columns }) {
  return (
    <footer className="bg-[#2b2b2b] border-t-4 border-[#ef9822] text-gray-300">
      {columns.length > 0 && (
        <nav aria-label="Footer" className="max-w-[1500px] mx-auto px-4 sm:px-8 pt-10 pb-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8 text-sm">
            {columns.map((column) => {
              // A column set to two lists (Education) spreads its links side by side, like the live site.
              const long = column.columns > 1;
              return (
              <div key={column.label} className={long ? "sm:col-span-2" : undefined}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-white">{column.label}</h2>
                <ul className={`mt-3 space-y-2${long ? " sm:columns-2 sm:gap-x-8 sm:space-y-0 [&>li]:break-inside-avoid [&>li]:pb-2" : ""}`}>
                  {column.pages.map((page) => (
                    <li key={page.slug}>
                      <Link href={`/${page.slug}`} className="transition-colors hover:text-[#ef9822]">
                        {page.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              );
            })}
          </div>
        </nav>
      )}
      <div className="max-w-[1500px] mx-auto px-4 sm:px-8 py-8 sm:py-10 text-center text-xs sm:text-sm leading-relaxed">
        <p>{STORE_FOOTER_LINES[0]}</p>
        <p className="mt-1">{STORE_FOOTER_LINES[1]}</p>
      </div>
    </footer>
  );
}

export default async function SiteFooter() {
  // Read per request so a page published in the admin appears here straight away,
  // even on pages that would otherwise be prerendered.
  await connection();
  return <SiteFooterView columns={await loadFooterColumns()} />;
}
