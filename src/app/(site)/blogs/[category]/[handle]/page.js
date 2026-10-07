import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { getPublishedBlogPost } from "@/lib/blog";
import BlogPostView from "@/components/storefront/blog/BlogPostView";
import { blogPostPath } from "@/lib/blogRules";
import { getSiteOrigin } from "@/lib/siteUrl";

// A blog post written in the admin panel under Blog (/blogs/<category>/<handle>, the
// address the old store used). A draft, scheduled or unknown post is a 404; a post that
// has moved to another category redirects to its new address. Reads live data, so it
// is never prerendered. See docs/blog/blog.md.
export const dynamic = "force-dynamic";

// One lookup per request, shared by generateMetadata and the page.
const loadPost = cache(async (handle) => getPublishedBlogPost(handle));

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const post = await loadPost(handle);
  if (!post) return { title: "Page not found | shopmyband.com" };

  const origin = await getSiteOrigin();
  const title = post.seoTitle || `${post.title} | shopmyband.com`;
  const description = post.seoDescription || post.excerpt || undefined;
  return {
    ...(origin ? { metadataBase: new URL(origin) } : {}),
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: post.publishedOn || undefined,
      authors: post.author ? [post.author] : undefined,
      images: post.featuredImageUrl && origin ? [{ url: post.featuredImageUrl, alt: post.featuredImageAlt || post.title }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }) {
  const { category, handle } = await params;
  const post = await loadPost(handle);
  if (!post) notFound();
  if (post.categorySlug !== category) permanentRedirect(blogPostPath(post.categorySlug, post.slug));

  return <BlogPostView post={post} origin={await getSiteOrigin()} />;
}
