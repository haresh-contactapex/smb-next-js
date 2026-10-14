import SystemMaintenanceSettingsForm from "@/components/settings-system-maintenance/SystemMaintenanceSettingsForm";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";
import { BACKUP_PERMISSION } from "@/lib/permissions";

export const metadata = {
  title: "System & Maintenance · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function SystemMaintenanceSettingsPage() {
  const backupAccess = await requireStaffPermission(BACKUP_PERMISSION);
  return <SystemMaintenanceSettingsForm canBackup={backupAccess.ok} />;
}
