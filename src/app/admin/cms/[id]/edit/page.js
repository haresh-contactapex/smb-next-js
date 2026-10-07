import { notFound } from "next/navigation";
import CmsPageForm from "@/components/cms/CmsPageForm";
import CmsProblem from "@/components/cms/CmsProblem";
import { CmsError, getCmsPageById } from "@/lib/cms";

export const metadata = {
  title: "Edit page · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function EditCmsPage({ params }) {
  const { id } = await params;
  let page = null;
  try {
    page = await getCmsPageById(id);
  } catch (error) {
    if (!(error instanceof CmsError)) console.error("CMS page failed to load", error);
    return <CmsProblem message={error instanceof CmsError ? error.message : "The page couldn't be loaded right now. Try again."} />;
  }
  if (!page) notFound();

  // Keyed by id so opening another page starts a fresh form. The form tracks its own
  // saved version, so the refresh after a save must not remount it.
  return <CmsPageForm key={page.id} page={page} />;
}
