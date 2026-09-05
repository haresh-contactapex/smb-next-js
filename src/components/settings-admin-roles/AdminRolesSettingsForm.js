"use client";

import { useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import SelectField from "@/components/settings-shared/SelectField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";

const ROLES = ["Owner", "Manager", "Staff", "Support"];

const DEFAULT_SETTINGS = {
  inviteEmail: "",
  inviteRole: "Staff",
  staffManageProducts: true,
  staffManageOrders: true,
  staffManageDiscounts: false,
  staffViewFinancialReports: false,
  managerManageAdmins: false,
};

export default function AdminRolesSettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [toast, setToast] = useState({ message: "", visible: false });
  const toastTimerRef = useRef(null);

  function showToast(message) {
    setToast({ message, visible: true });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  function setField(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    showToast("Admin & Roles settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="shield" title="Admin & Roles" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Invite Admin">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-invite-email"
                label="Email Address"
                type="email"
                value={settings.inviteEmail}
                onChange={(value) => setField("inviteEmail", value)}
                placeholder="teammate@shopmyband.com"
              />
              <SelectField
                id="f-invite-role"
                label="Role"
                value={settings.inviteRole}
                options={ROLES}
                onChange={(value) => setField("inviteRole", value)}
              />
            </div>
          </SectionCard>

          <SectionCard title="Role Permissions">
            <ToggleField
              label="Staff can manage products"
              description="Allow staff-level admins to create, edit, and remove products."
              checked={settings.staffManageProducts}
              onChange={(value) => setField("staffManageProducts", value)}
            />
            <ToggleField
              label="Staff can manage orders"
              description="Allow staff-level admins to view and update customer orders."
              checked={settings.staffManageOrders}
              onChange={(value) => setField("staffManageOrders", value)}
            />
            <ToggleField
              label="Staff can manage discounts"
              description="Allow staff-level admins to create and edit discount codes."
              checked={settings.staffManageDiscounts}
              onChange={(value) => setField("staffManageDiscounts", value)}
            />
            <ToggleField
              label="Staff can view financial reports"
              description="Allow staff-level admins to view revenue and financial reporting."
              checked={settings.staffViewFinancialReports}
              onChange={(value) => setField("staffViewFinancialReports", value)}
            />
            <ToggleField
              label="Manager can manage other admins"
              description="Allow manager-level admins to invite, edit, and remove other admin accounts."
              checked={settings.managerManageAdmins}
              onChange={(value) => setField("managerManageAdmins", value)}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="shield"
            title="About Admin & Roles"
            points={[
              "Follow the principle of least privilege — only grant staff and managers the access their role requires.",
              "Reserve the Owner role for the store's primary account holder; it always has full access.",
              "Regularly review admin permissions, especially after a role change or an employee's departure.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
