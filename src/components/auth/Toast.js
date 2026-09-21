"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/admin-panel/Icon";

const AUTO_DISMISS_MS = 10000;

export default function Toast({
  message,
  visible,
  variant = "success",
  onDismiss,
}) {
  const [progressDone, setProgressDone] = useState(false);

  useEffect(() => {
    if (variant !== "success" || !visible) {
      setProgressDone(false);
      return;
    }
    setProgressDone(false);
    // Two rAFs so the browser paints the 0%-elapsed state before the
    // transition to "done" starts — otherwise it jumps with no animation.
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setProgressDone(true));
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, [visible, message, variant]);

  if (variant === "error") {
    return (
      <div
        role="alert"
        className={`fixed top-6 right-6 z-50 max-w-sm transition-all duration-300${
          visible ? "" : " -translate-y-4 opacity-0 pointer-events-none"
        }`}
      >
        <div className="relative flex items-start gap-3 bg-red-600 text-white rounded-xl shadow-popover pl-4 pr-9 py-3.5">
          <span className="flex-shrink-0 w-6 h-6 mt-0.5 rounded-full bg-white text-red-600 flex items-center justify-center text-sm font-bold">
            !
          </span>
          <div>
            <p className="text-sm font-bold leading-tight">Error!</p>
            <p className="text-sm leading-snug">{message}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={onDismiss}
            className="absolute top-2.5 right-2.5 text-white/80 hover:text-white text-lg leading-none"
          >
            &times;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-sm transition-all duration-300${
        visible ? "" : " translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl bg-green-50 dark:bg-green-500/10 shadow-popover pl-4 pr-9 py-3.5">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 mt-0.5 rounded-full bg-white dark:bg-darksurface text-green-600 dark:text-green-400 flex items-center justify-center">
            <Icon name="check" className="w-3.5 h-3.5" />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight text-green-800 dark:text-green-300">
              Success
            </p>
            <p className="text-sm leading-snug text-green-700 dark:text-green-400">
              {message}
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="absolute top-2.5 right-2.5 text-green-700/60 hover:text-green-800 dark:text-green-400/60 dark:hover:text-green-300 text-lg leading-none"
          >
            &times;
          </button>
        </div>
        <div className="absolute left-0 right-0 bottom-0 h-1 bg-green-600/20 dark:bg-green-400/20">
          <div
            className="h-full bg-green-600 dark:bg-green-400 ease-linear"
            style={{
              width: progressDone ? "0%" : "100%",
              transitionProperty: "width",
              transitionDuration: `${AUTO_DISMISS_MS}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
