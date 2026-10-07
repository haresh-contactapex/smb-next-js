import { Fragment } from "react";
import Link from "next/link";

// Breadcrumb strip at the top of a storefront page, so every page draws the
// trail the same way. `items` run from "Home" down to the current page: parents
// with an `href` are links, the last item is the page itself and is never one.
// `className` sets the page width and text size (the account area is narrower);
// `centered` centers the trail (content pages put it under a centered heading).
export default function Breadcrumb({ items, className = "max-w-[1600px] text-[16px]", centered = false }) {
  return (
    <nav aria-label="Breadcrumb" className={`mx-auto px-4 py-6 font-medium text-gray-400 sm:px-8 ${className}`}>
      <ol className={`flex flex-wrap items-center${centered ? " justify-center" : ""}`}>
        {items.map((item, i) => {
          const isCurrent = i === items.length - 1;
          return (
            <Fragment key={`${i}-${item.label}`}>
              {i > 0 && (
                <li aria-hidden="true" className="mx-2">
                  /
                </li>
              )}
              {isCurrent ? (
                <li aria-current="page" className="text-gray-500">
                  {item.label}
                </li>
              ) : (
                <li>
                  {item.href ? (
                    <Link href={item.href} className="transition-colors hover:text-[#ef9822]">
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
