import NewsletterPageToolbar from "@/components/newsletter/NewsletterPageToolbar";
import NewsletterStats from "@/components/newsletter/NewsletterStats";
import NewsletterListing from "@/components/newsletter/NewsletterListing";
import { listNewsletterSubscribers } from "@/lib/newsletter";
import { computeNewsletterStats } from "@/components/newsletter/helpers";

export const metadata = {
  title: "Newsletter · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function NewsletterPage() {
  const subscribers = await listNewsletterSubscribers();

  return (
    <>
      <NewsletterPageToolbar />
      <NewsletterStats stats={computeNewsletterStats(subscribers)} />
      <NewsletterListing subscribers={subscribers} />
    </>
  );
}
