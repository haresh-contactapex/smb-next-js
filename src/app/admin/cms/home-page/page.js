import Breadcrumbs from "@/components/admin-panel/Breadcrumbs";
import HomePageForm from "@/components/cms/HomePageForm";
import CmsProblem from "@/components/cms/CmsProblem";
import { HomePageError, getHomePageForAdmin } from "@/lib/homePage";

export const metadata = {
  title: "Home Page · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function HomePageAdminPage() {
  let content = null;
  let problem = "";
  try {
    content = await getHomePageForAdmin();
  } catch (error) {
    if (!(error instanceof HomePageError)) console.error("Home page failed to load", error);
    problem = error instanceof HomePageError ? error.message : "The home page couldn't be loaded right now. Try again.";
  }

  if (problem) {
    return (
      <>
        <Breadcrumbs icon="file-text" items={[{ label: "CMS" }, { label: "Home Page" }]} />
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Home Page</h1>
        <CmsProblem message={problem} />
      </>
    );
  }

  return <HomePageForm initial={content} />;
}
