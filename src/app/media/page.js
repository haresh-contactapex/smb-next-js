import MediaPageToolbar from "@/components/media/MediaPageToolbar";
import MediaLibrary from "@/components/media/MediaLibrary";
import { listMedia } from "@/lib/media";

export const metadata = {
  title: "Media · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const items = await listMedia();

  return (
    <>
      <MediaPageToolbar />
      <MediaLibrary initialItems={items} />
    </>
  );
}
