import NotificationsPage from "@/components/notifications/NotificationsPage";

export const metadata = {
  title: "Notifications · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

// Any signed-in staff member may open this page (middleware requires a
// session); what they see is decided server-side by /api/notifications from
// their role's permissions.
export default function AdminNotificationsPage() {
  return <NotificationsPage />;
}
