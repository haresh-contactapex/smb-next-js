"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ContactForm from "@/components/storefront/contact/ContactForm";

// Interactive parts a CMS page can ask for. The editor can't hold a form, so the page carries a
// placeholder paragraph with one of these classes (kept by the sanitizer, see sanitizeHtml.js) and this
// component puts the real thing in its place once the page is on screen.
const EMBEDS = {
  "cms-embed-contact-form": ContactForm,
};

const SELECTOR = Object.keys(EMBEDS).map((name) => `p.${name}`).join(",");

/**
 * Mounts the embeds found inside the element with id `target`. Each placeholder paragraph is swapped
 * for an empty <div> (a form can't sit inside a <p>) and the component is rendered into it through a
 * portal, so the form keeps its own React state. Re-running (React strict mode in development) finds
 * the divs it already made and reuses them.
 */
export default function CmsEmbeds({ target }) {
  const [mounts, setMounts] = useState([]);

  useEffect(() => {
    const root = document.getElementById(target);
    if (!root) return;
    const found = [];
    for (const placeholder of root.querySelectorAll(`${SELECTOR},div[data-cms-embed]`)) {
      let holder = placeholder;
      let name = placeholder.dataset.cmsEmbed;
      if (placeholder.tagName === "P") {
        name = Object.keys(EMBEDS).find((className) => placeholder.classList.contains(className));
        holder = document.createElement("div");
        holder.dataset.cmsEmbed = name;
        placeholder.replaceWith(holder);
      }
      if (EMBEDS[name]) found.push({ holder, Component: EMBEDS[name], key: found.length });
    }
    setMounts(found);
  }, [target]);

  return mounts.map(({ holder, Component, key }) => createPortal(<Component />, holder, `embed-${key}`));
}
