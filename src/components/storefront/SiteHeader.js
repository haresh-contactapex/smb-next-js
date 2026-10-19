import { connection } from "next/server";
import SiteHeaderBar from "./SiteHeaderBar";
import { STORE_MENU_SLUGS, STORE_NAV_LINKS, withMenuDescriptions } from "./navLinks";
import { listCategoryDescriptions } from "@/lib/categories";
import { currentCustomer } from "@/lib/auth/customerPage";

// The nav links with each mega menu item's description taken from its
// category (the text at the top of the category page). A failed lookup just leaves
// the descriptions out: the header must never take a page down with it.
async function loadNavLinks() {
  try {
    return withMenuDescriptions(STORE_NAV_LINKS, await listCategoryDescriptions(STORE_MENU_SLUGS));
  } catch (error) {
    console.error("Mega menu descriptions failed to load", error);
    return STORE_NAV_LINKS;
  }
}

// Storefront header: white bar with a hairline border + soft shadow so it
// reads as its own region above the page content. The data fetch stays server-side;
// SiteHeaderBar is a client component since it tracks scroll to know when it's stuck.
export default async function SiteHeader() {
  // Read per request so an edited category description shows up straight away,
  // even on pages that would otherwise be prerendered.
  await connection();
  const [navLinks, customer] = await Promise.all([loadNavLinks(), currentCustomer()]);

  return <SiteHeaderBar navLinks={navLinks} customer={customer} />;
}
