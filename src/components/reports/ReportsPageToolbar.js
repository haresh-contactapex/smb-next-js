import Breadcrumbs from "@/components/admin-panel/Breadcrumbs";
import { Can } from "@/components/providers/StaffPermissionsProvider";
import ReportsExportButton from "./ReportsExportButton";

export default function ReportsPageToolbar() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Reports" }]} />
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Reports</h1>
      </div>
      <Can permission="reports.export">
        <ReportsExportButton />
      </Can>
    </div>
  );
}
