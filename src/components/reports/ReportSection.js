/** Groups one report domain's subsections under a bold heading ("Order Reports", "Product Reports", ...). */
export default function ReportSection({ title, children }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
      {children}
    </section>
  );
}
