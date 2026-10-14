"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

// A plain left click (no modifier key, not already handled) is taken over for a
// client-side transition; a new-tab click, a middle click and the like are left to
// the browser, exactly as a plain <Link> would.
function isPlainClick(event) {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * Shared by BlogPostsBrowser (the category chips and page links) and BlogPostView
 * (the previous/next links): some of a blog page's own links only change its URL's
 * search params or its last path segment, which Next.js re-renders in place without
 * unmounting the page, so loading.js never gets a chance to show its fallback. This
 * gives the caller `isPending` (true from the click until the next page has rendered)
 * and `handleClick(href)`, which returns the onClick handler for a link to `href`.
 */
export default function useBlogNavigation() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick(href) {
    return (event) => {
      if (!isPlainClick(event)) return;
      event.preventDefault();
      startTransition(() => router.push(href));
    };
  }

  return { isPending, handleClick };
}
