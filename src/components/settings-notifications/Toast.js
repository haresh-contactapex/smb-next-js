"use client";

import UiToast from "../ui/Toast";

// The shared toast with the shorter countdown these settings pages use.
export default function Toast(props) {
  return <UiToast durationMs={2200} {...props} />;
}
