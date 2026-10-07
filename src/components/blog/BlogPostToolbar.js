import Link from "next/link";
import Breadcrumbs from "@/components/admin-panel/Breadcrumbs";
import Icon from "@/components/admin-panel/Icon";
import { Can } from "@/components/providers/StaffPermissionsProvider";

// Header of Blog -> All Posts.
export default function BlogPostToolbar() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <Breadcrumbs icon="edit-2" items={[{ label: "Blog" }, { label: "All Posts" }]} />
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Blog Posts</h1>
      </div>
      <Can permission="blog.create">
        <Link
          href="/admin/blog/new"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-sm font-semibold shadow-sm transition-colors shrink-0 w-fit"
        >
          <Icon name="plus-circle" className="w-4 h-4" />
          Add Post
        </Link>
      </Can>
    </div>
  );
}
