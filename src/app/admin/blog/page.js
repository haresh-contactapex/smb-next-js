import BlogPostToolbar from "@/components/blog/BlogPostToolbar";
import BlogListing from "@/components/blog/BlogListing";
import CmsProblem from "@/components/cms/CmsProblem";
import { BlogError, listBlogPosts } from "@/lib/blog";

export const metadata = {
  title: "Blog Posts · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function BlogPostsPage() {
  let posts = [];
  let problem = "";
  try {
    posts = await listBlogPosts();
  } catch (error) {
    if (!(error instanceof BlogError)) console.error("Blog posts failed to load", error);
    problem = error instanceof BlogError ? error.message : "The posts couldn't be loaded right now. Try again.";
  }

  return (
    <>
      <BlogPostToolbar />
      {problem ? <CmsProblem message={problem} /> : <BlogListing posts={posts} />}
    </>
  );
}
