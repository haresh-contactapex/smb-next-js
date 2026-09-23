import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";

export const metadata = {
  title: "Access Denied · Shop My Band Admin",
};

// Middleware rewrites a page the staff member's role can't open to this one
// (keeping the original URL), with ?reason= explaining why.
const MESSAGES = {
  denied: "Your role doesn't include permission to view this page. Ask a Super Admin if you need access.",
  inactive: "Your role is currently inactive, so it grants no access. Ask a Super Admin to reactivate it.",
  "no-role": "Your account isn't assigned to a role yet. Ask a Super Admin to assign one.",
  setup: "Roles & Permissions isn't set up yet. Run `npm run db:migrate:admin-roles`.",
  error: "We couldn't verify your permissions just now. Reload the page to try again.",
};

export default async function AccessDeniedPage({ searchParams }) {
  const { reason } = (await searchParams) || {};
  const message = MESSAGES[reason] || MESSAGES.denied;

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-8 sm:p-12 text-center">
      <span className="mx-auto w-14 h-14 rounded-2xl grid place-items-center bg-red-50 text-error dark:bg-red-500/10">
        <Icon name="lock" className="w-7 h-7" />
      </span>
      <h1 className="mt-4 text-lg font-bold text-slate-800 dark:text-white">Access denied</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">{message}</p>
      <Link
        href="/profile"
        className="mt-6 inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-xs font-semibold shadow-sm transition-colors"
      >
        <Icon name="user" className="w-4 h-4" />
        Go to My Profile
      </Link>
    </section>
  );
}
