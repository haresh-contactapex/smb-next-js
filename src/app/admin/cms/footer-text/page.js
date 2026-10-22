import Breadcrumbs from "@/components/admin-panel/Breadcrumbs";
import FooterTextForm from "@/components/cms/FooterTextForm";
import CmsProblem from "@/components/cms/CmsProblem";
import { FooterTextError, listFooterTexts } from "@/lib/footerTexts";
import { listCmsPages } from "@/lib/cms";
import { listCategories } from "@/lib/categories";

export const metadata = {
  title: "Footer Text · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

// Page addresses offered while typing: published CMS pages and visible categories.
// Only a convenience, so a failed lookup just offers none.
async function loadSuggestions() {
  const [pages, categories] = await Promise.all([listCmsPages().catch(() => []), listCategories().catch(() => [])]);
  return [
    ...pages.filter((page) => page.status === "published").map((page) => ({ path: `/${page.slug}`, label: page.title })),
    ...categories.filter((category) => category.visible).map((category) => ({ path: `/collections/${category.slug}`, label: category.name })),
  ];
}

export default async function FooterTextPage() {
  let entries = [];
  let problem = "";
  try {
    entries = await listFooterTexts();
  } catch (error) {
    if (!(error instanceof FooterTextError)) console.error("Footer text failed to load", error);
    problem = error instanceof FooterTextError ? error.message : "The footer text couldn't be loaded right now. Try again.";
  }

  if (problem) {
    return (
      <>
        <Breadcrumbs icon="file-text" items={[{ label: "CMS" }, { label: "Footer Text" }]} />
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Footer Text</h1>
        <CmsProblem message={problem} />
      </>
    );
  }

  return <FooterTextForm entries={entries} suggestions={await loadSuggestions()} />;
}
