import Link from "next/link";
import Breadcrumb from "../Breadcrumb";
import BlogCard from "./BlogCard";
import BlogPagination from "./BlogPagination";
import { BLOG_INDEX_PATH, blogCategoryPath } from "@/lib/blogRules";

const CHIP = "rounded-full border px-4 py-1.5 text-[14px] transition-colors";

// The blog index (/blog) and a category's page (/blogs/<category>) look the same: a
// heading band, the category filter, a grid of posts and the page links.
// `result` is what listPublishedBlogPosts returns; `activeSlug` is "" for all posts.
export default function BlogListingView({ title, breadcrumb, categories, activeSlug = "", basePath, result }) {
  return (
    <div className="w-full bg-white">
      {/* Heading band: the title with the breadcrumb under it */}
      <div className="bg-[#faf7f2] px-4 pt-10 sm:pt-14 pb-2">
        <h1
          className="mx-auto max-w-4xl text-center text-[30px] sm:text-[40px] font-normal text-[#333333] leading-tight"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          {title}
        </h1>
        <Breadcrumb centered className="max-w-4xl text-[14px] sm:text-[15px]" items={breadcrumb} />
      </div>

      <div className="mx-auto max-w-[1300px] px-4 sm:px-8 py-10 sm:py-14">
        {categories.length > 1 && (
          <nav aria-label="Blog categories" className="mb-10 flex flex-wrap justify-center gap-2">
            <Link
              href={BLOG_INDEX_PATH}
              aria-current={activeSlug ? undefined : "page"}
              className={`${CHIP} ${activeSlug ? "border-[#e5e7eb] text-[#555555] hover:border-[#ef9822] hover:text-[#ef9822]" : "border-[#333333] bg-[#333333] text-white"}`}
            >
              All posts
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={blogCategoryPath(category.slug)}
                aria-current={activeSlug === category.slug ? "page" : undefined}
                className={`${CHIP} ${activeSlug === category.slug ? "border-[#333333] bg-[#333333] text-white" : "border-[#e5e7eb] text-[#555555] hover:border-[#ef9822] hover:text-[#ef9822]"}`}
              >
                {category.name}
              </Link>
            ))}
          </nav>
        )}

        {result.posts.length === 0 ? (
          <p className="py-16 text-center text-[16px] text-[#888888]">There are no posts here yet. Please check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {result.posts.map((post, index) => (
              <BlogCard key={post.slug} post={post} priority={index < 3} />
            ))}
          </div>
        )}

        <BlogPagination basePath={basePath} page={result.page} totalPages={result.totalPages} />
      </div>
    </div>
  );
}
