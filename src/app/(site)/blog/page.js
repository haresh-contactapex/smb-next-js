import BlogListingView from "@/components/storefront/blog/BlogListingView";
import { listPublishedBlogCategories, listPublishedBlogPosts } from "@/lib/blog";
import { BLOG_INDEX_PATH } from "@/lib/blogRules";

// The blog index: every published post, newest first, nine to a page (?page=2 ...).
// Posts are written in the admin panel under Blog. Reads live data, so it is never
// prerendered. See docs/blog/blog.md.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blog | shopmyband.com",
  description: "Wedding band guides, buying tips and style advice from Shop My Band.",
};

export default async function BlogIndexPage({ searchParams }) {
  const { page } = await searchParams;
  const [result, categories] = await Promise.all([
    listPublishedBlogPosts({ page: Number(page) || 1 }),
    listPublishedBlogCategories(),
  ]);

  return (
    <BlogListingView
      title="Blog"
      breadcrumb={[{ label: "Home", href: "/" }, { label: "Blog" }]}
      categories={categories}
      basePath={BLOG_INDEX_PATH}
      result={result}
    />
  );
}
