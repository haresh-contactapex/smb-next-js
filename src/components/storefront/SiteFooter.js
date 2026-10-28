import { Children } from "react";
import Link from "next/link";
import { connection } from "next/server";
import FooterBlurb from "./FooterBlurb";
import { STORE_DEVELOPER, STORE_FOOTER_CITIES, STORE_NAV_LINKS, STORE_PARENT_SITE, STORE_SOCIAL_LINKS } from "./navLinks";
import { listFooterPages } from "@/lib/cms";
import { getFooterTextsByPath } from "@/lib/footerTexts";
import { CMS_FOOTER_GROUPS } from "@/lib/cmsRules";
import { hasPublishedBlogPosts } from "@/lib/blog";
import { BLOG_INDEX_PATH } from "@/lib/blogRules";
import { getFooterSocialLinks } from "@/lib/socialMediaSettings";

// The Blog link sits in the Customer Service column between About Us and Contact (CMS
// pages are ordered 10, 20, 30 ... there). It shows once the blog has a published post.
const BLOG_FOOTER_LINK = { slug: BLOG_INDEX_PATH.slice(1), label: "Blog", footerGroup: "customer-service", position: 15 };

// The footer links come from CMS pages that are published and placed in a footer
// column (admin panel -> CMS). A failed lookup just leaves the columns out: the footer
// must never take a page down with it.
async function loadFooterColumns() {
  try {
    const [cmsPages, hasBlog] = await Promise.all([listFooterPages(), hasPublishedBlogPosts().catch(() => false)]);
    const pages = hasBlog ? [...cmsPages, BLOG_FOOTER_LINK] : cmsPages;
    return CMS_FOOTER_GROUPS.map((group) => ({
      label: group.label,
      columns: group.columns || 1,
      // CMS pages arrive ordered by position, then title; the Blog link takes its place among them.
      pages: pages
        .filter((page) => page.footerGroup === group.value)
        .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label)),
    })).filter((column) => column.pages.length > 0);
  } catch (error) {
    console.error("Footer pages failed to load", error);
    return [];
  }
}

// Fixed marks, like the checkout's payment strip: trim them to what the gateway takes.
const PAYMENT_MARKS = [
  { label: "Visa", mark: <span className="text-[13px] font-extrabold italic tracking-tight text-[#1A1F71]">VISA</span> },
  {
    label: "Mastercard",
    mark: (
      <span className="flex items-center">
        <span className="h-4 w-4 rounded-full bg-[#EB001B]" />
        <span className="-ml-1.5 h-4 w-4 rounded-full bg-[#F79E1B]/90" />
      </span>
    ),
  },
  { label: "American Express", mark: <span className="text-[10px] font-extrabold tracking-tight text-white">AMEX</span>, tile: "bg-[#2E77BC]" },
  { label: "Discover", mark: <span className="text-[9px] font-bold uppercase tracking-tight text-[#231F20]">Discover</span> },
  {
    label: "FedEx",
    mark: (
      <span className="text-[14px] font-extrabold italic tracking-tighter">
        <span className="text-[#4D148C]">Fed</span>
        <span className="text-[#FF6200]">Ex</span>
      </span>
    ),
    tile: "border-transparent bg-transparent",
  },
];

// A social icon is a white mask of the SVG on a dark circle.
const maskStyle = (icon) => ({
  maskImage: `url(${icon})`,
  WebkitMaskImage: `url(${icon})`,
  maskSize: "contain",
  WebkitMaskSize: "contain",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
});

// One footer column: an underlined heading over its links. A group set to two lists
// (Customer Service, Education) flows them side by side from the sm breakpoint up.
function FooterGroup({ label, columns = 1, children }) {
  const multi = columns > 1;
  return (
    <div>
      <h2 className="border-b border-white/70 pb-1 text-[13px] sm:text-sm font-medium text-white">{label}</h2>
      <ul className={`mt-4 space-y-2.5${multi ? " sm:columns-2 sm:gap-x-8 sm:space-y-0 [&>li]:break-inside-avoid [&>li]:pb-2.5" : ""}`}>
        {Children.map(children, (child) => (child ? <li>{child}</li> : null))}
      </ul>
    </div>
  );
}

// A link to another site, opened in a new tab.
function ExternalLink({ href, label }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline-offset-2 transition-colors hover:text-[#ef9822] hover:underline">
      {label}
    </a>
  );
}

function FooterLink({ href, children }) {
  return (
    <Link href={href} className="font-medium text-white transition-colors hover:text-[#ef9822]">
      {children}
    </Link>
  );
}

// Storefront footer: a rounded photo panel with the logo and link columns, then the store
// blurb, city links, social icons, payment marks and copyright on white.
// `columns` is [{ label, columns, pages: [{ slug, label }] }]; `texts` is { [page path]: [paragraph, ...] }.
export function SiteFooterView({ columns, texts, socialLinks = STORE_SOCIAL_LINKS }) {
  return (
    <footer className="bg-white text-[#555555]">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-8 pt-12 sm:pt-16 pb-10">
        <div className="relative overflow-hidden rounded-2xl bg-[#6b6b6b]">
          <img src="/storefront/footer-bg.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden="true" className="absolute inset-0 bg-[#3d3d3d]/65" />
          <div className="relative px-6 pt-8 pb-10 sm:px-12 sm:pt-10 sm:pb-12 lg:px-20">
            <Link href="/" className="mx-auto block w-fit" aria-label="shopmyband.com home">
              <img src="/storefront/logo.png" alt="shopmyband.com" className="h-7 sm:h-8 object-contain brightness-0 invert" />
            </Link>
            <nav aria-label="Footer" className="mt-8 sm:mt-10 grid gap-8 text-xs sm:text-[13px] md:grid-cols-2 lg:grid-cols-[1fr_1.5fr_1.5fr] lg:gap-10">
              <FooterGroup label="Wedding Band Collection">
                {STORE_NAV_LINKS.map((link) => (
                  <FooterLink key={link.href} href={link.href}>{link.label}</FooterLink>
                ))}
              </FooterGroup>
              {columns.map((column) => (
                <FooterGroup key={column.label} label={column.label} columns={column.columns}>
                  {column.pages.map((page) => (
                    <FooterLink key={page.slug} href={`/${page.slug}`}>{page.label}</FooterLink>
                  ))}
                </FooterGroup>
              ))}
            </nav>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-[900px] space-y-4 text-center text-[11px] sm:text-xs leading-relaxed text-[#333333]">
          <FooterBlurb texts={texts} />
          <p>
            {STORE_FOOTER_CITIES.map((city, index) => (
              <span key={city.slug}>
                {index > 0 && <span aria-hidden="true"> | </span>}
                <Link href={`/${city.slug}`} className="transition-colors hover:text-[#ef9822]">{city.label}</Link>
              </span>
            ))}
          </p>
        </div>

        {socialLinks.length > 0 && (
          <ul className="mt-8 flex items-center justify-center gap-3" aria-label="Follow us">
            {socialLinks.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4a4a4a] transition-colors hover:bg-[#ef9822]"
                >
                  <span aria-hidden="true" className="block h-3.5 w-3.5 bg-white" style={maskStyle(social.icon)} />
                </a>
              </li>
            ))}
          </ul>
        )}

        <ul className="mt-5 flex flex-wrap items-center justify-center gap-1.5" aria-label="Accepted payments and shipping">
          {PAYMENT_MARKS.map((item) => (
            <li
              key={item.label}
              title={item.label}
              className={`flex h-6 w-11 items-center justify-center rounded-[3px] border border-[#d9d9d9] ${item.tile || "bg-white"}`}
            >
              <span className="sr-only">{item.label}</span>
              <span aria-hidden="true" className="flex items-center">{item.mark}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 text-center text-[11px] sm:text-xs leading-relaxed text-[#333333]">
          <p>
            © 2026 ShopMyBand.com, a division of <ExternalLink {...STORE_PARENT_SITE} />. All rights reserved.
          </p>
          <p>
            <ExternalLink {...STORE_DEVELOPER} /> by Apex Global Solutions
          </p>
        </div>
      </div>
    </footer>
  );
}

export default async function SiteFooter() {
  // Read per request so a page published in the admin appears here straight away,
  // even on pages that would otherwise be prerendered.
  await connection();
  const [columns, texts, socialLinks] = await Promise.all([loadFooterColumns(), getFooterTextsByPath(), getFooterSocialLinks()]);
  // null: the settings could not be read, so keep the built-in links rather than drop the icons.
  return <SiteFooterView columns={columns} texts={texts} socialLinks={socialLinks ?? STORE_SOCIAL_LINKS} />;
}
