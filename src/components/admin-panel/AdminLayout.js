import AdminPanelInit from "./AdminPanelInit";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";

/**
 * The reusable admin shell: sidebar + header + page content + footer.
 * Drop this in any page and pass it a config object (see
 * src/config/admin-panel.config.js for the shape) — that's the only thing a new
 * project needs to change to reuse this whole component folder as-is.
 */
export default function AdminLayout({ config, children }) {
  return (
    <>
      <AdminPanelInit />
      <Sidebar brand={config.brand} navItems={config.navItems} />

      <div id="mainWrap">
        <Header searchFields={config.searchFields} notifications={config.notifications} user={config.user} />

        <main className="p-4 sm:p-6 space-y-6 max-w-[1600px]">{children}</main>

        <Footer companyName={config.footer?.companyName ?? config.brand?.name} links={config.footer?.links} />
      </div>
    </>
  );
}
