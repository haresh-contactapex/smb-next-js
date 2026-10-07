import Link from "next/link";
import Breadcrumb from "../Breadcrumb";
import StoreIcon from "../icons";
import BlogShare from "./BlogShare";
import BlogPostNav from "./BlogPostNav";
import { BLOG_INDEX_PATH, blogCategoryPath, blogPostPath, formatBlogDate } from "@/lib/blogRules";

// A blog post as the storefront shows it: breadcrumb, title, date, author and category,
// the featured picture, the body, the tags with share links, and links to the posts
// either side. `post` is what getPublishedBlogPost returns. `origin` is the store's public
// address (empty when unknown), which the share links and the article data need.
export default function BlogPostView({ post, origin = "" }) {
  const path = blogPostPath(post.categorySlug, post.slug);
  const date = formatBlogDate(post.publishedOn);
  const absolute = (value) => (origin && value.startsWith("/") ? `${origin}${value}` : value);

  // Search engines read this to show the post as an article. `<` is escaped so the body can never close the script tag.
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription || post.excerpt || undefined,
    datePublished: post.publishedOn || undefined,
    dateModified: post.updatedAt || undefined,
    author: post.author ? { "@type": "Person", name: post.author } : undefined,
    image: post.featuredImageUrl ? absolute(post.featuredImageUrl) : undefined,
    mainEntityOfPage: origin ? `${origin}${path}` : undefined,
  }).replace(/</g, "\\u003c");

  return (
    <div className="w-full bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />

      {/* Breadcrumb band */}
      <div className="bg-[#faf7f2]">
        <Breadcrumb
          className="max-w-[1000px] text-[14px] sm:text-[15px]"
          items={[
            { label: "Home", href: "/" },
            { label: "Blog", href: BLOG_INDEX_PATH },
            { label: post.category, href: blogCategoryPath(post.categorySlug) },
            { label: post.title },
          ]}
        />
      </div>

      <article className="mx-auto max-w-[1000px] px-4 sm:px-8 py-10 sm:py-14">
        <header>
          <h1 className="text-[28px] sm:text-[36px] font-normal leading-tight text-[#333333]">{post.title}</h1>
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-[#555555]">
            {date && (
              <span className="inline-flex items-center gap-1.5">
                <StoreIcon name="calendar" className="h-4 w-4" />
                <time dateTime={post.publishedOn}>{date}</time>
              </span>
            )}
            {date && post.author && <span aria-hidden="true">|</span>}
            {post.author && (
              <span className="inline-flex items-center gap-1.5">
                <StoreIcon name="user" className="h-4 w-4" />
                By {post.author}
              </span>
            )}
          </p>
          <Link
            href={blogCategoryPath(post.categorySlug)}
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-[#ef9822] hover:underline"
          >
            <StoreIcon name="tag" className="h-4 w-4" />
            {post.category}
          </Link>
        </header>

        {post.featuredImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- a picture from the library or an upload, not optimizable by next/image
          <img
            src={post.featuredImageUrl}
            alt={post.featuredImageAlt || post.title}
            width={1200}
            height={800}
            fetchPriority="high"
            className="mt-6 h-auto w-full rounded-md"
          />
        )}

        {/* The body was cleaned by the CMS allowlist sanitizer when saved and again when read. */}
        <div className="cms-content blog-body mt-8" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

        {(post.tags.length > 0 || origin) && (
          <div className="mt-10 flex flex-col gap-4 rounded border border-[#e5e7eb] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            {post.tags.length > 0 ? (
              <p className="flex items-start gap-2 text-[15px] text-[#555555]">
                <StoreIcon name="tag" className="mt-1 h-4 w-4 shrink-0 text-[#333333]" filled />
                <span>
                  <span className="text-[#333333]">Tags:</span> {post.tags.join(", ")}
                </span>
              </p>
            ) : (
              <span />
            )}
            {origin && <BlogShare url={`${origin}${path}`} title={post.title} image={post.featuredImageUrl ? absolute(post.featuredImageUrl) : ""} />}
          </div>
        )}

        <BlogPostNav previous={post.previous} next={post.next} />
      </article>
    </div>
  );
}
