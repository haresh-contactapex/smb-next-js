// Shown in place of a CMS page that couldn't load, e.g. before `npm run db:migrate:cms` has been run.
export default function CmsProblem({ message }) {
  return (
    <div
      role="alert"
      className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
    >
      {message}
    </div>
  );
}
