import Link from "next/link";
import StoreIcon from "../icons";
import { blogCategoryPath, formatBlogDate } from "@/lib/blogRules";

// One post on the blog listing: the featured picture, its category, title, date and
// author, and the start of the post. The title link is stretched over the whole card
// (after:absolute) so the category link can stay a separate link on top of it.
export default function BlogCard({ post, priority = false }) {
  const date = formatBlogDate(post.publishedOn);
  return (
    <article className="group relative flex flex-col">
      <div className="aspect-[3/2] overflow-hidden rounded-md bg-[#f4f1ec]">
        {post.featuredImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a picture from the library or an upload, not optimizable by next/image
          <img
            src={post.featuredImageUrl}
            alt={post.featuredImageAlt || ""}
            width={1200}
            height={800}
            loading={priority ? "eager" : "lazy"}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#c9c2b6]">
            <StoreIcon name="note" className="h-12 w-12" />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <Link
          href={blogCategoryPath(post.categorySlug)}
          className="relative z-10 w-fit text-[12px] font-medium uppercase tracking-wide text-[#ef9822] hover:underline"
        >
          {post.category}
        </Link>
        <h2 className="mt-1.5 text-[20px] font-normal leading-snug text-[#333333]">
          <Link href={post.href} className="transition-colors group-hover:text-[#ef9822] after:absolute after:inset-0">
            {post.title}
          </Link>
        </h2>
        <p className="mt-2 text-[13px] text-[#888888]">
          {date}
          {date && post.author ? <span aria-hidden="true"> &nbsp;|&nbsp; </span> : null}
          {post.author ? `By ${post.author}` : null}
        </p>
        {post.excerpt && <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-[#555555]">{post.excerpt}</p>}
        <span className="mt-4 inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-[#333333] group-hover:text-[#ef9822]">
          Read more
          <StoreIcon name="arrowRight" className="h-4 w-4" />
        </span>
      </div>
    </article>
  );
}
