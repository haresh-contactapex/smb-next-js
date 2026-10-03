import { redirect } from "next/navigation";
import RegisterForm from "@/components/auth/RegisterForm";
import { getCurrentCustomer } from "@/lib/auth/customerSession";
import { safeRedirectPath } from "@/lib/auth/redirect";

export const metadata = {
  title: "Create Account · Shop My Band",
};

// Reads the session cookie, so it can't be prerendered.
export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }) {
  const params = await searchParams;
  const requested = Array.isArray(params?.next) ? params.next[0] : params?.next;
  const next = safeRedirectPath(requested);

  if (await getCurrentCustomer()) redirect(next);
  return <RegisterForm next={next} />;
}
