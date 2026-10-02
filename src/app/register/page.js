import { redirect } from "next/navigation";
import RegisterForm from "@/components/auth/RegisterForm";
import { getCurrentCustomer } from "@/lib/auth/customerSession";

export const metadata = {
  title: "Create Account · Shop My Band",
};

// Reads the session cookie, so it can't be prerendered.
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getCurrentCustomer()) redirect("/account");
  return <RegisterForm />;
}
