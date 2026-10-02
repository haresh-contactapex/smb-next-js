import AccountShell from "@/components/account/AccountShell";
import { currentCustomer } from "@/lib/auth/customerPage";

export const metadata = {
  title: { default: "My Account | shopmyband.com", template: "%s | My Account | shopmyband.com" },
  robots: { index: false, follow: false },
};

// Everything here depends on who is signed in.
export const dynamic = "force-dynamic";

// The account area's frame (customer card + section menu). Each page also checks
// the session itself with requireCustomerPage(): middleware sends signed-out
// visitors to sign in, but this layout is the data owner, so it never frames a
// page for a visitor it can't identify.
export default async function AccountLayout({ children }) {
  const customer = await currentCustomer();
  if (!customer) return children;
  return <AccountShell customer={customer}>{children}</AccountShell>;
}
