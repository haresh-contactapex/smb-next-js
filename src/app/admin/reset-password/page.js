import { Suspense } from "react";
import AdminResetPasswordForm from "@/components/admin-auth/AdminResetPasswordForm";

export const metadata = {
  title: "Admin Reset Password · Shop My Band",
};

export default function AdminResetPasswordPage() {
  return (
    <Suspense>
      <AdminResetPasswordForm />
    </Suspense>
  );
}
