"use client";

import { usePathname } from "next/navigation";
import { STORE_FOOTER_BLURB, STORE_FOOTER_BLURB_BY_PATH } from "./navLinks";

// The store text under the footer panel. The main category pages (Wedding Bands,
// Anniversary, Classic, Eternity, New Arrivals) each have their own; every other page
// shows the general text. It is a client component only to read the current path, so
// the footer around it stays a server component.
export default function FooterBlurb() {
  const pathname = (usePathname() || "").replace(/\/+$/, "") || "/";
  const paragraphs = STORE_FOOTER_BLURB_BY_PATH[pathname] || STORE_FOOTER_BLURB;
  return paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>);
}
