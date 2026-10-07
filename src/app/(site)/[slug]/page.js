import { cache } from "react";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/storefront/Breadcrumb";
import CmsEmbeds from "@/components/storefront/CmsEmbeds";
import { getPublishedCmsPage } from "@/lib/cms";

// Content pages written in the admin panel under CMS (About Us, Privacy Policy, Ring
// Size Calculator ...). Next serves the storefront's own routes (/cart, /collections/...)
// before this one, and the CMS never lets a page take one of those URLs (see
// src/lib/cmsRules.js). A draft or unknown page is a 404. Reads live data, so it is
// never prerendered. See docs/cms/cms.md.
export const dynamic = "force-dynamic";

// A landing page (the Wedding Band pages) runs edge to edge with no heading band, and its first heading becomes the
// page's <h1>. It is a page that opens with a cms-hero table (a picture and text), or that holds a cms-split table
// (two colour-blocked halves) after an introduction.
const isLandingPage = (html) => html.startsWith('<table class="cms-hero">') || html.includes('<table class="cms-split">');

// One lookup per request, shared by generateMetadata and the page.
const loadPage = cache(async (slug) => getPublishedCmsPage(slug));

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) return { title: "Page not found | shopmyband.com" };
  return {
    title: page.seoTitle || `${page.title} | shopmyband.com`,
    description: page.seoDescription || undefined,
  };
}

export default async function CmsContentPage({ params }) {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) notFound();

  const embeds = page.contentHtml.includes("cms-embed-") && <CmsEmbeds target="cms-article" />;

  if (isLandingPage(page.contentHtml)) {
    // The editor writes headings as h2-h4, so the first heading is promoted here. If the page has none, the title still gets an h1.
    const html = page.contentHtml.replace(/<h2([ >])/, "<h1$1").replace("</h2>", "</h1>");
    return (
      <div className="w-full bg-white">
        {!html.includes("<h1") && <h1 className="sr-only">{page.title}</h1>}
        <article id="cms-article" className="cms-content cms-wide" dangerouslySetInnerHTML={{ __html: html }} />
        {embeds}
      </div>
    );
  }

  return (
    <div className="w-full bg-white">
      {/* Heading band: the title with the breadcrumb under it */}
      <div className="bg-[#faf7f2] px-4 pt-10 sm:pt-14 pb-2">
        <h1
          className="mx-auto max-w-4xl text-center text-[30px] sm:text-[40px] font-normal text-[#333333] leading-tight"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          {page.title}
        </h1>
        <Breadcrumb
          centered
          className="max-w-4xl text-[14px] sm:text-[15px]"
          items={[{ label: "Home", href: "/" }, { label: page.title }]}
        />
      </div>

      {/* The body was cleaned by the CMS allowlist sanitizer when saved and again when read. */}
      <article id="cms-article" className="cms-content mx-auto max-w-[1000px] px-4 sm:px-8 py-10 sm:py-14" dangerouslySetInnerHTML={{ __html: page.contentHtml }} />
      {/* A page can hold a placeholder for an interactive part (the contact form); only those pages load the code for it. */}
      {embeds}
    </div>
  );
}
