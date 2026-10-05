import { logAdminActivity } from "@/lib/notifications";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { generateDatabaseBackup } from "@/lib/databaseBackup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Streams the backup as newline-delimited JSON events (start / chunk /
// progress / done / error) so the page can show a live percentage and then
// assemble the .sql file in the browser. Nothing is written to the server's
// disk — the file lands in the admin's browser download folder.
export async function POST() {
  // The dump contains every table (customers, password hashes, credentials),
  // so it needs the same permission as changing these settings.
  const auth = await requireStaffPermission(settingsPermission("system-maintenance", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        for await (const event of generateDatabaseBackup({ isCancelled: () => cancelled })) {
          if (cancelled) return;
          send(event);
          if (event.type === "done") {
            await logAdminActivity({
              actor: auth.user,
              action: "database.backup",
              entityType: "system",
              entityId: "database",
              title: "Database backup downloaded",
              description: `  downloaded a database backup (${event.tables} tables, ${event.rows} rows).`,
              severity: "warning",
              metadata: { tables: event.tables, rows: event.rows, bytes: event.bytes },
            });
          }
        }
      } catch (error) {
        console.error("database backup failed", error);
        if (!cancelled) send({ type: "error", message: error.message || "Backup failed" });
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
