import { redirect } from "next/navigation";
import Icon from "@/components/admin-panel/Icon";
import { getSystemMaintenanceSettings } from "@/lib/systemMaintenanceSettings";
import { getGeneralSettings } from "@/lib/generalSettings";

// Always reads the live setting so a storefront visitor rewritten here mid-
// maintenance-window sees the current message, and so this page bounces
// back to /login on its own once maintenance mode is turned off.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Under Maintenance · Shop My Band",
};

async function loadGeneralSettings() {
  try {
    return await getGeneralSettings();
  } catch {
    return null;
  }
}

export default async function MaintenancePage() {
  let maintenance = null;
  try {
    maintenance = await getSystemMaintenanceSettings();
  } catch {
    maintenance = null;
  }

  if (!maintenance?.maintenanceModeEnabled) {
    redirect("/login");
  }

  const generalSettings = await loadGeneralSettings();
  const storeName = generalSettings?.storeName || "Shop My Band";
  const logoUrl = generalSettings?.logoUrl;
  const message = maintenance.maintenanceMessage.trim() || "We'll be back soon — thanks for your patience!";

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-darkbg p-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- store-uploaded logo, not optimizable by next/image
            <img src={logoUrl} alt={storeName} className="w-9 h-9 rounded-xl object-contain shrink-0 bg-white shadow-sm" />
          ) : (
            <span className="w-9 h-9 rounded-xl bg-primary-500 dark:bg-accent-500 text-white grid place-items-center shrink-0">
              <Icon name="gift" className="w-4 h-4" />
            </span>
          )}
          <span className="font-bold text-slate-800 dark:text-white">{storeName}</span>
        </div>

        <div className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6 sm:p-8">
          <span className="inline-flex w-12 h-12 rounded-xl bg-primary-100 dark:bg-accent-500/10 text-primary-600 dark:text-accent-400 items-center justify-center mb-4">
            <Icon name="server" className="w-6 h-6" />
          </span>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">We&apos;ll be right back</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
