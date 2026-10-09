"use client";

import OtpForm from "@/components/auth/OtpForm";

// The staff sign-in 2FA step. The screen itself is shared with the customer
// sign-in (components/auth/OtpForm.js); this just points it at the admin routes.
export default function AdminOtpForm(props) {
  return <OtpForm apiBase="/api/admin-auth" idPrefix="admin" {...props} />;
}
