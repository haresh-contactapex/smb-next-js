import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";

const COPY = {
  401: { title: "You're signed out", message: "Sign in again to manage roles." },
  403: { title: "Access denied", message: "Your role doesn't include Manage Roles. Ask a Super Admin for access." },
  404: { title: "Role not found", message: "This role doesn't exist or was deleted." },
  503: { title: "Roles & Permissions isn't set up yet", message: "Run `npm run db:migrate:admin-roles`." },
};

// Server-safe card for "can't show this screen" states: no permission, the
// role table isn't migrated yet, or a role that doesn't exist.
export default function RolesNotice({ status = 500, message, backHref }) {
  const copy = COPY[status] || { title: "Couldn't load roles", message: "Something went wrong. Try again." };
  const body = status === 403 || status === 404 ? copy.message : message || copy.message;

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-8 text-center">
      <span className="mx-auto w-12 h-12 rounded-2xl grid place-items-center bg-amber-50 text-warning dark:bg-amber-500/10">
        <Icon name={status === 403 ? "lock" : "alert-triangle"} className="w-6 h-6" />
      </span>
      <h1 className="mt-4 text-base font-bold text-slate-800 dark:text-white">{copy.title}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">{body}</p>
      {backHref && (
        <Link
          href={backHref}
          className="mt-5 inline-flex items-center gap-2 px-4 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          <Icon name="chevron-left" className="w-4 h-4" />
          Back to Roles
        </Link>
      )}
    </section>
  );
}
