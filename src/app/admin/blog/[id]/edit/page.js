import { notFound } from "next/navigation";
import BlogPostForm from "@/components/blog/BlogPostForm";
import CmsProblem from "@/components/cms/CmsProblem";
import { BlogError, getBlogPostById, listBlogCategories } from "@/lib/blog";

export const metadata = {
  title: "Edit post · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

// The category list only helps fill the form in, so a failure leaves it empty.
async function loadCategories() {
  try {
    return await listBlogCategories();
  } catch {
    return [];
  }
}

export default async function EditBlogPost({ params }) {
  const { id } = await params;
  let post = null;
  try {
    post = await getBlogPostById(id);
  } catch (error) {
    if (!(error instanceof BlogError)) console.error("Blog post failed to load", error);
    return <CmsProblem message={error instanceof BlogError ? error.message : "The post couldn't be loaded right now. Try again."} />;
  }
  if (!post) notFound();

  const categories = await loadCategories();

  // Keyed by id so opening another post starts a fresh form. The form tracks its own
  // saved version, so the refresh after a save must not remount it.
  return <BlogPostForm key={post.id} post={post} categories={categories} />;
}
