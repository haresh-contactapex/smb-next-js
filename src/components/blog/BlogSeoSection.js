import CmsSeoSection from "@/components/cms/CmsSeoSection";
import { categorySlugFor } from "@/lib/blogRules";

// The post's address (/blogs/<category>/<slug>) and what search engines show for it:
// the CMS section with the blog's URL prefix and field ids ("blog-slug", "blog-seo-title",
// "blog-seo-description").
export default function BlogSeoSection({ category, ...props }) {
  const urlPrefix = `/blogs/${categorySlugFor(category) || "category"}/`;
  return <CmsSeoSection {...props} urlPrefix={urlPrefix} urlHeading="Post URL & Search Engine Listing" idPrefix="blog" noun="post" />;
}
