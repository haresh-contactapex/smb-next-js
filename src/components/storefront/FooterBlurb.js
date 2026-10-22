"use client";

import { usePathname } from "next/navigation";
import { ALL_PAGES_PATH } from "@/lib/footerTextRules";

// The store text under the footer panel. `texts` is { [page path]: [paragraph, ...] }
// (edited under CMS -> Footer Text): a page with an entry shows it, every other page
// shows the "*" entry. An entry with no paragraphs is a page set to show no text. It is
// a client component only to read the current path, so the footer around it stays a
// server component.
export default function FooterBlurb({ texts }) {
  const pathname = (usePathname() || "").replace(/\/+$/, "") || "/";
  const paragraphs = texts[pathname] ?? texts[ALL_PAGES_PATH] ?? [];
  return paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>);
}
