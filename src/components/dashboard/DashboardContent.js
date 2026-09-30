"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import WelcomeHeader from "./WelcomeHeader";
import { DashboardBodySkeleton } from "./DashboardSkeleton";

// Owns the date-range navigation so the sections under the header can be
// swapped for skeletons while the server renders the new range. `children` are
// the server-rendered dashboard sections.
export default function DashboardContent({ name, range, children }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeRange(key) {
    if (key === range) return;
    startTransition(() => router.push(key === "7d" ? "/admin" : `/admin?range=${key}`));
  }

  return (
    <>
      <WelcomeHeader name={name} range={range} onRangeChange={changeRange} />
      {isPending ? <DashboardBodySkeleton /> : children}
    </>
  );
}
