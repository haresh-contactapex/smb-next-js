import CmsPageToolbar from "@/components/cms/CmsPageToolbar";
import CmsListing from "@/components/cms/CmsListing";
import CmsProblem from "@/components/cms/CmsProblem";
import { CmsError, listCmsPages } from "@/lib/cms";

export const metadata = {
  title: "CMS Pages · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function CmsPagesPage() {
  let pages = [];
  let problem = "";
  try {
    pages = await listCmsPages();
  } catch (error) {
    if (!(error instanceof CmsError)) console.error("CMS pages failed to load", error);
    problem = error instanceof CmsError ? error.message : "The pages couldn't be loaded right now. Try again.";
  }

  return (
    <>
      <CmsPageToolbar />
      {problem ? <CmsProblem message={problem} /> : <CmsListing pages={pages} />}
    </>
  );
}
