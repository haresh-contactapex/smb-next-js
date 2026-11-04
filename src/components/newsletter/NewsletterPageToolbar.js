import Breadcrumbs from "@/components/admin-panel/Breadcrumbs";
import { Can } from "@/components/providers/StaffPermissionsProvider";
import ExportSubscribersButton from "./ExportSubscribersButton";

export default function NewsletterPageToolbar() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <Breadcrumbs items={[{ label: "Newsletter", href: "/admin/newsletter" }, { label: "Subscribers" }]} />
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Newsletter Subscribers</h1>
      </div>
      <Can permission="newsletter.export">
        <ExportSubscribersButton />
      </Can>
    </div>
  );
}
