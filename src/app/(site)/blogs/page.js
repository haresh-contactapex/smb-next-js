import { permanentRedirect } from "next/navigation";
import { BLOG_INDEX_PATH } from "@/lib/blogRules";

// The old store listed its blogs at /blogs. The blog index lives at /blog.
export default function BlogsRedirect() {
  permanentRedirect(BLOG_INDEX_PATH);
}
