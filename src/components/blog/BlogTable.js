import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { Can } from "@/components/providers/StaffPermissionsProvider";
import { blogPostPath, formatBlogDate, todayIso } from "@/lib/blogRules";
import { STATUS_BADGE_CLASSES, STATUS_LABELS, displayStatus } from "./helpers";

export default function BlogTable({ posts, emptyMessage = "No posts match your filters.", onDelete, deletingId }) {
  if (posts.length === 0) {
    return <div className="py-16 text-center text-sm text-slate-400">{emptyMessage}</div>;
  }

  const today = todayIso();

  return (
    <div className="overflow-x-auto custom-scroll -mx-1">
      <table className="w-full text-sm min-w-[900px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-white/5">
            <th className="py-3 px-1 font-semibold">Post</th>
            <th className="py-3 px-1 font-semibold">Category</th>
            <th className="py-3 px-1 font-semibold">Author</th>
            <th className="py-3 px-1 font-semibold">Date</th>
            <th className="py-3 px-1 font-semibold">Status</th>
            <th className="py-3 px-1 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {posts.map((post) => {
            const isDeleting = post.id === deletingId;
            const status = displayStatus(post, today);
            const path = blogPostPath(post.categorySlug, post.slug);
            return (
              <tr key={post.id} className="table-row transition-colors">
                <td className="py-3 px-1">
                  <div className="flex items-center gap-3">
                    {post.featuredImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.featuredImageUrl}
                        alt=""
                        loading="lazy"
                        className="w-10 h-10 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-darksurface2"
                      />
                    ) : (
                      <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0 bg-primary-50 text-primary-600 dark:bg-white/5 dark:text-accent-400">
                        <Icon name="image" className="w-5 h-5" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-700 dark:text-slate-200 truncate max-w-[360px]">{post.title}</span>
                      <span className="block text-[11px] text-slate-400 system-field truncate max-w-[360px]">{path}</span>
                    </span>
                  </div>
                </td>
                <td className="py-3 px-1 text-slate-500 dark:text-slate-400">{post.category}</td>
                <td className="py-3 px-1 text-slate-500 dark:text-slate-400">{post.author || "—"}</td>
                <td className="py-3 px-1 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatBlogDate(post.publishedOn) || "—"}</td>
                <td className="py-3 px-1">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_BADGE_CLASSES[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                </td>
                <td className="py-3 px-1 text-right">
                  <div className="inline-flex items-center gap-1">
                    {status === "published" && (
                      <a
                        href={path}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View post on storefront"
                        aria-label={`View ${post.title} on storefront`}
                        className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                      >
                        <Icon name="eye" className="w-4 h-4" />
                      </a>
                    )}
                    <Can permission="blog.edit">
                      <Link
                        href={`/admin/blog/${post.id}/edit`}
                        title="Edit post"
                        aria-label={`Edit ${post.title}`}
                        className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                      >
                        <Icon name="edit-2" className="w-4 h-4" />
                      </Link>
                    </Can>
                    <Can permission="blog.delete">
                      <button
                        type="button"
                        title="Delete post"
                        aria-label={`Delete ${post.title}`}
                        onClick={() => onDelete?.(post)}
                        disabled={isDeleting}
                        className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-error dark:hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Icon name="trash-2" className="w-4 h-4" />
                      </button>
                    </Can>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
