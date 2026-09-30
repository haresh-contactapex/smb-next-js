import MediaSkeleton from "@/components/media/MediaSkeleton";

// Shown inside the admin shell while page.js queries the media library.
export default function Loading() {
  return <MediaSkeleton />;
}
