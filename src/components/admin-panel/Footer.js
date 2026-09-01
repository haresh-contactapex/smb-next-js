/**
 * Simple admin-shell footer. Pass `companyName`; the year is always current.
 * Optional `links` renders a row of secondary links (Privacy, Terms, Support, …).
 */
export default function Footer({ companyName, links = [] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="text-center text-[12px] text-slate-400 py-4 space-y-1">
      <p>
        © {year} {companyName}. All rights reserved.
      </p>
      {links.length > 0 && (
        <p className="flex items-center justify-center gap-3">
          {links.map((link, i) => (
            <a key={i} href={link.href} className="hover:text-slate-600 dark:hover:text-slate-300 hover:underline">
              {link.label}
            </a>
          ))}
        </p>
      )}
    </footer>
  );
}
