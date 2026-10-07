import { Fragment } from "react";
import Link from "next/link";
import Icon from "./Icon";

// Breadcrumb row above an admin page title, shared by every page header so the
// trail always reads the same way. `items` run from the top level down to the
// current page: a parent that has a real page gets an `href`, a pure grouping
// (e.g. "Settings", "My Account") is plain text, and the last item is the page
// itself, never a link. `icon` is the optional section icon shown before the trail.
export default function Breadcrumbs({ items, icon }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-1 text-sm text-slate-500 dark:text-slate-400">
      <ol className="flex flex-wrap items-center gap-2">
        {icon && (
          <li aria-hidden="true" className="flex">
            <Icon name={icon} className="w-4 h-4" />
          </li>
        )}
        {items.map((item, i) => {
          const isCurrent = i === items.length - 1;
          return (
            <Fragment key={`${i}-${item.label}`}>
              {i > 0 && (
                <li aria-hidden="true">/</li>
              )}
              {isCurrent ? (
                <li aria-current="page" className="min-w-0 truncate font-semibold text-slate-800 dark:text-white">
                  {item.label}
                </li>
              ) : (
                <li>
                  {item.href ? (
                    <Link href={item.href} className="hover:text-primary-600 dark:hover:text-accent-400">
                      {item.label}
                    </Link>
                  ) : (
                    item.label
                  )}
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
