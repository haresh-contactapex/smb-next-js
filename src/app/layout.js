import { Inter } from "next/font/google";
import "./globals.css";
import ThemeInitScript from "@/components/admin-panel/ThemeInitScript";
import { GeneralSettingsProvider } from "@/components/providers/GeneralSettingsProvider";
import { getGeneralSettings } from "@/lib/generalSettings";
import { getCurrencyTaxSettings } from "@/lib/currencyTaxSettings";
import { getProductsSettings } from "@/lib/productsSettings";
import { getSecuritySettings } from "@/lib/securitySettings";
import { getIntegrationsSettings } from "@/lib/integrationsSettings";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const viewport = {
  colorScheme: "light dark",
};

// The DB row may not exist yet (e.g. a fresh environment before the
// general_settings migration/seed has run) — fall back to the static
// defaults rather than letting every page fail to render.
async function loadGeneralSettings() {
  try {
    return await getGeneralSettings();
  } catch {
    return null;
  }
}

// The store-wide currency lives on Settings -> Currency & Tax (not General)
// — same fallback-to-null treatment as loadGeneralSettings() above.
async function loadCurrencyTaxSettings() {
  try {
    return await getCurrencyTaxSettings();
  } catch {
    return null;
  }
}

// The SKU prefix lives on Settings -> Products — same fallback-to-null
// treatment as loadGeneralSettings() above.
async function loadProductsSettings() {
  try {
    return await getProductsSettings();
  } catch {
    return null;
  }
}

// The reCAPTCHA toggle lives on Settings -> Security — same fallback-to-null
// treatment as loadGeneralSettings() above.
async function loadSecuritySettings() {
  try {
    return await getSecuritySettings();
  } catch {
    return null;
  }
}

// The reCAPTCHA site key lives on Settings -> Integrations — same
// fallback-to-null treatment as loadGeneralSettings() above.
async function loadIntegrationsSettings() {
  try {
    return await getIntegrationsSettings();
  } catch {
    return null;
  }
}

// Storefront default; /admin overrides this in src/app/admin/layout.js.
export async function generateMetadata() {
  const settings = await loadGeneralSettings();
  const name = settings?.storeName || "Shop My Band";
  return {
    title: `${name} | Wedding Bands`,
    description: `Shop wedding, anniversary, classic and eternity bands at ${name}.`,
    ...(settings?.faviconUrl ? { icons: { icon: settings.faviconUrl } } : {}),
  };
}

export default async function RootLayout({ children }) {
  const [settings, currencyTaxSettings, productsSettings, securitySettings, integrationsSettings] = await Promise.all([
    loadGeneralSettings(),
    loadCurrencyTaxSettings(),
    loadProductsSettings(),
    loadSecuritySettings(),
    loadIntegrationsSettings(),
  ]);

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className="bg-slate-50 dark:bg-darkbg text-slate-800 dark:text-slate-200 antialiased"
        suppressHydrationWarning
      >
        <ThemeInitScript />
        <GeneralSettingsProvider
          value={{
            storeName: settings?.storeName,
            logoUrl: settings?.logoUrl,
            faviconUrl: settings?.faviconUrl,
            currency: currencyTaxSettings?.currency,
            currencyPosition: currencyTaxSettings?.currencyPosition,
            numberFormat: currencyTaxSettings?.numberFormat,
            skuPrefix: productsSettings?.skuPrefix,
            defaultProductStatus: productsSettings?.defaultStatus,
            defaultWeightUnit: productsSettings?.defaultWeightUnit,
            // Shown/required only when BOTH Security's "Enable reCAPTCHA"
            // toggle AND Integrations' "Google reCAPTCHA" toggle are on —
            // see checkRecaptchaIfEnabled() for the matching server-side rule.
            enableRecaptcha: Boolean(securitySettings?.enableRecaptcha) && Boolean(integrationsSettings?.googleRecaptchaEnabled),
            googleRecaptchaEnabled: integrationsSettings?.googleRecaptchaEnabled,
            googleRecaptchaSiteKey: integrationsSettings?.googleRecaptchaSiteKey,
          }}
        >
          {children}
        </GeneralSettingsProvider>
      </body>
    </html>
  );
}
