import ProfileSettings from "@/components/account/ProfileSettings";
import { requireCustomerPage } from "@/lib/auth/customerPage";

export const metadata = { title: "Profile & security" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const customer = await requireCustomerPage("/account/profile");
  return <ProfileSettings customer={customer} />;
}
