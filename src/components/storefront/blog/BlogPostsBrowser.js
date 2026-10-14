"use client";

import Link from "next/link";
import BlogCard from "./BlogCard";
import BlogPagination from "./BlogPagination";
import { BlogPostsBrowserSkeleton } from "./BlogListingSkeleton";
import useBlogNavigation from "./useBlogNavigation";
import { BLOG_INDEX_PATH, blogCategoryPath } from "@/lib/blogRules";

const CHIP = "rounded-full border px-4 py-1.5 text-[14px] transition-colors";

/**
 * The category filter, the post grid and the page links: the part of the blog
 * listing that changes when a category chip or a page link is clicked. Both are
 * plain links to a new URL (`/blogs/<category>` or `?page=N`), but a URL that only
 * changes the page's search params never unmounts the page, so Next's own loading.js
 * never gets a chance to show its fallback — this owns a `useTransition` instead and
 * swaps the grid for a skeleton itself while the server renders the next page
 * (the same pattern DashboardContent.js uses for the dashboard's date range).
 */
export default function BlogPostsBrowser({ categories, activeSlug, basePath, result }) {
  const { isPending, handleClick } = useBlogNavigation();

  if (isPending) {
    return <BlogPostsBrowserSkeleton cards={result.pageSize} categoryChips={categories.length > 1 ? categories.length + 1 : 0} />;
  }

  return (
    <>
      {categories.length > 1 && (
        <nav aria-label="Blog categories" className="mb-10 flex flex-wrap justify-center gap-2">
          <Link
            href={BLOG_INDEX_PATH}
            onClick={handleClick(BLOG_INDEX_PATH)}
            aria-current={activeSlug ? undefined : "page"}
            className={`${CHIP} ${activeSlug ? "border-[#e5e7eb] text-[#555555] hover:border-[#ef9822] hover:text-[#ef9822]" : "border-[#333333] bg-[#333333] text-white"}`}
          >
            All posts
          </Link>
          {categories.map((category) => {
            const href = blogCategoryPath(category.slug);
            return (
              <Link
                key={category.slug}
                href={href}
                onClick={handleClick(href)}
                aria-current={activeSlug === category.slug ? "page" : undefined}
                className={`${CHIP} ${activeSlug === category.slug ? "border-[#333333] bg-[#333333] text-white" : "border-[#e5e7eb] text-[#555555] hover:border-[#ef9822] hover:text-[#ef9822]"}`}
              >
                {category.name}
              </Link>
            );
          })}
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

      <BlogPagination basePath={basePath} page={result.page} totalPages={result.totalPages} onNavigate={handleClick} />
    </>
  );
}
