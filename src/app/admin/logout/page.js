"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// A dedicated page rather than a plain <Link href="/api/admin-auth/logout">
// so the logout request only ever fires from an actual visit (a useEffect on
// mount), never from Next.js prefetching the link on hover.
export default function AdminLogoutPage() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    // Strict Mode runs effects twice in dev; only sign out (and log it) once.
    if (started.current) return;
    started.current = true;
    fetch("/api/admin-auth/logout", { method: "POST" }).finally(() => {
      router.replace("/admin/login");
      router.refresh();
    });
  }, [router]);

  return null;
}
