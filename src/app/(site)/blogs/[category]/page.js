import { cache } from "react";
import { notFound } from "next/navigation";
import BlogListingView from "@/components/storefront/blog/BlogListingView";
import { listPublishedBlogCategories, listPublishedBlogPosts } from "@/lib/blog";
import { BLOG_INDEX_PATH, blogCategoryPath } from "@/lib/blogRules";

// One category of the blog (/blogs/classic-bands). A category with no published post
// is a 404. Reads live data, so it is never prerendered. See docs/blog/blog.md.
export const dynamic = "force-dynamic";

const loadCategories = cache(async () => listPublishedBlogCategories());

export async function generateMetadata({ params }) {
  const { category } = await params;
  const match = (await loadCategories()).find((item) => item.slug === category);
  if (!match) return { title: "Page not found | shopmyband.com" };
  return {
    title: `${match.name} | Blog | shopmyband.com`,
    description: `${match.name} articles, guides and buying tips from Shop My Band.`,
  };
}

export default async function BlogCategoryPage({ params, searchParams }) {
  const { category } = await params;
  const { page } = await searchParams;
  const categories = await loadCategories();
  const match = categories.find((item) => item.slug === category);
  if (!match) notFound();

  const result = await listPublishedBlogPosts({ categorySlug: category, page: Number(page) || 1 });

  return (
    <BlogListingView
      title={match.name}
      breadcrumb={[{ label: "Home", href: "/" }, { label: "Blog", href: BLOG_INDEX_PATH }, { label: match.name }]}
      categories={categories}
      activeSlug={category}
      basePath={blogCategoryPath(category)}
      result={result}
    />
  );
}
