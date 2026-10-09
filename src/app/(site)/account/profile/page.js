import ProfileSettings from "@/components/account/ProfileSettings";
import { requireCustomerPage } from "@/lib/auth/customerPage";
import { getSecuritySettings } from "@/lib/securitySettings";

export const metadata = { title: "Profile & security" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const customer = await requireCustomerPage("/account/profile");
  // The store-wide "require 2FA for all customers" switch makes the card read-only.
  const settings = await getSecuritySettings().catch(() => null);
  return <ProfileSettings customer={customer} twoFactorRequired={Boolean(settings?.requireCustomerTwoFactor)} />;
}
