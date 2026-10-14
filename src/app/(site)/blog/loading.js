import BlogListingSkeleton from "@/components/storefront/blog/BlogListingSkeleton";

// Shown in place of the page while it re-renders on the server: the first visit to
// /blog, and every click on a category chip or a page link (both are plain links to a
// new URL, so the whole page re-fetches).
export default function Loading() {
  return <BlogListingSkeleton />;
}
