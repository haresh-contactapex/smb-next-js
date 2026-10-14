import BlogPostSkeleton from "@/components/storefront/blog/BlogPostSkeleton";

// Shown in place of the page while it renders on the server: a direct link to a
// post, the first visit, back/forward, and opening a post from the blog listing
// (a different route file, so this fallback gets the chance to show).
export default function Loading() {
  return <BlogPostSkeleton />;
}
