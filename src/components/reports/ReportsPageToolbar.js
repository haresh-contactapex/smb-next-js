import { Can } from "@/components/providers/StaffPermissionsProvider";
import ReportsExportButton from "./ReportsExportButton";

export default function ReportsPageToolbar() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <span>Reports</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Reports</h1>
      </div>
      <Can permission="reports.export">
        <ReportsExportButton />
      </Can>
    </div>
  );
}
