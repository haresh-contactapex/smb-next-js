"use client";

import AccountPageHeader from "./AccountPageHeader";
import DeleteAccountSection from "./DeleteAccountSection";
import EmailForm from "./EmailForm";
import PasswordForm from "./PasswordForm";
import ProfileDetailsForm from "./ProfileDetailsForm";
import { NoticeRegion, useNotice } from "./Notice";
import { CARD } from "./accountStyles";
import { formatMonthYear, tierLabel } from "./accountHelpers";

// Profile & security: read-only membership facts up top, then one card per
// thing a customer can change. They share one toast.
export default function ProfileSettings({ customer }) {
  const [notice, notify] = useNotice();

  return (
    <>
      <AccountPageHeader title="Profile & security" description="Manage your details, how you sign in, and your account." />

      <div className="flex flex-col gap-6">
        <section aria-label="Membership" className={`${CARD} grid gap-5 p-5 sm:grid-cols-3 sm:p-7`}>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Member since</p>
            <p className="mt-1 text-[16px] font-semibold text-[#333333]">{customer.createdAt ? formatMonthYear(customer.createdAt) : "—"}</p>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Membership</p>
            <p className="mt-1 text-[16px] font-semibold text-[#333333]">{tierLabel(customer.customerGroup)}</p>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Loyalty points</p>
            <p className="mt-1 text-[16px] font-semibold text-[#333333]">{customer.loyaltyPoints.toLocaleString("en-US")}</p>
          </div>
        </section>

        <ProfileDetailsForm customer={customer} notify={notify} />
        <EmailForm customer={customer} notify={notify} />
        <PasswordForm notify={notify} />
        <DeleteAccountSection notify={notify} />
      </div>

      <NoticeRegion notice={notice} />
    </>
  );
}
