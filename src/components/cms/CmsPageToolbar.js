import Link from "next/link";
import Breadcrumbs from "@/components/admin-panel/Breadcrumbs";
import Icon from "@/components/admin-panel/Icon";
import { Can } from "@/components/providers/StaffPermissionsProvider";

// Header of CMS -> All Pages.
export default function CmsPageToolbar() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <Breadcrumbs icon="file-text" items={[{ label: "CMS" }, { label: "All Pages" }]} />
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">CMS Pages</h1>
      </div>
      <Can permission="content.create">
        <Link
          href="/admin/cms/new"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-sm font-semibold shadow-sm transition-colors shrink-0 w-fit"
        >
          <Icon name="plus-circle" className="w-4 h-4" />
          Add Page
        </Link>
      </Can>
    </div>
  );
}
