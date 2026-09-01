"use client";

import { useEffect } from "react";
import { closeAllDropdowns, closeSidebar } from "./adminPanelActions";

/**
 * Mounts the admin shell's document-level listeners once: click-outside closes any
 * open dropdown panel, Escape closes dropdowns and the mobile sidebar drawer.
 * Render this once near the root of AdminLayout.
 */
export default function AdminPanelInit() {
  useEffect(() => {
    function handleClick(e) {
      const isTrigger = e.target.closest("#btnNotif, #btnUser, #btnDateRange");
      const isPanel = e.target.closest('[id^="panel"]');
      if (!isTrigger && !isPanel) closeAllDropdowns();
    }
    function handleKeydown(e) {
      if (e.key === "Escape") {
        closeAllDropdowns();
        closeSidebar();
      }
    }
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  return null;
}
