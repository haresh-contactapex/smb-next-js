import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import { getCurrentCustomer } from "@/lib/auth/customerSession";
import { safeRedirectPath } from "@/lib/auth/redirect";

export const metadata = {
  title: "Sign In · Shop My Band",
};

// Reads the session cookie, so it can't be prerendered.
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const requested = Array.isArray(params?.next) ? params.next[0] : params?.next;
  const next = safeRedirectPath(requested);

  // Someone already signed in has nothing to do here.
  if (await getCurrentCustomer()) redirect(next);

  return <LoginForm next={next} />;
}
