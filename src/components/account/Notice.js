"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const NOTICE_MS = 4000;

// A transient message for the account pages ("Address saved"). `notify` shows it
// and clears it after a few seconds; render `<NoticeRegion notice={notice} />`
// once in the page. It uses the same bottom-center toast as the wishlist.
export function useNotice() {
  const [notice, setNotice] = useState({ message: "", tone: "info" });
  const timerRef = useRef(null);

  const notify = useCallback((message, tone = "info") => {
    setNotice({ message, tone });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNotice({ message: "", tone }), NOTICE_MS);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return [notice, notify];
}

// Always rendered so screen readers have a live region to announce into; it is
// visually hidden while there is nothing to say.
export function NoticeRegion({ notice }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        notice.message
          ? `fixed bottom-6 left-1/2 z-[60] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded px-5 py-3 text-center text-[14px] font-medium text-white shadow-lg ${
              notice.tone === "error" ? "bg-red-600" : notice.tone === "success" ? "bg-green-700" : "bg-[#333333]"
            }`
          : "sr-only"
      }
    >
      {notice.message}
    </div>
  );
}
