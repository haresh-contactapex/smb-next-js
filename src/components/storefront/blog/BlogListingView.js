import Breadcrumb from "../Breadcrumb";
import BlogPostsBrowser from "./BlogPostsBrowser";

// The blog index (/blog) and a category's page (/blogs/<category>) look the same: a
// heading band, the category filter, a grid of posts and the page links.
// `result` is what listPublishedBlogPosts returns; `activeSlug` is "" for all posts.
// The filter, grid and page links live in BlogPostsBrowser (a client component), so a
// category or page click can swap them for a skeleton while the next page loads.
export default function BlogListingView({ title, breadcrumb, categories, activeSlug = "", basePath, result }) {
  return (
    <div className="w-full bg-white">
      {/* Heading band: the title with the breadcrumb under it. The rounded top
          corners match the curve the header uses into the announcement bar. */}
      <div className="bg-[#faf7f2] rounded-t-[32px] sm:rounded-t-[50px] px-4 pt-10 sm:pt-14 pb-16 sm:pb-24">
        <h1
          className="mx-auto max-w-4xl text-center text-[30px] sm:text-[40px] font-normal text-[#333333] leading-tight"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          {title}
        </h1>
        <Breadcrumb centered className="max-w-4xl text-[14px] sm:text-[15px]" items={breadcrumb} />
      </div>

      {/* The content rises up into the band with rounded top corners instead of the
          band rounding its own bottom corners (see the CMS page template for why).
          The padding cancels the negative margin so the spacing below is unchanged. */}
      <div className="relative z-10 -mt-[32px] sm:-mt-[50px] pt-[32px] sm:pt-[50px] rounded-t-[32px] sm:rounded-t-[50px] bg-white">
        <div className="mx-auto max-w-[1300px] px-4 sm:px-8 py-10 sm:py-14">
          <BlogPostsBrowser categories={categories} activeSlug={activeSlug} basePath={basePath} result={result} />
        </div>
      </div>
    </div>
  );
}
