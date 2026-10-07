import BlogPostForm from "@/components/blog/BlogPostForm";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { listBlogCategories } from "@/lib/blog";

export const metadata = {
  title: "Add post · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

// The category list and the author's name only help fill the form in, so a failure
// to load either leaves them empty instead of blocking the page.
async function loadCategories() {
  try {
    return await listBlogCategories();
  } catch {
    return [];
  }
}

// A new post defaults to the signed-in staff member as its author.
async function loadAuthorName() {
  try {
    const user = await getCurrentStaffUser();
    return user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "";
  } catch {
    return "";
  }
}

export default async function AddBlogPost() {
  const [categories, defaultAuthor] = await Promise.all([loadCategories(), loadAuthorName()]);
  return <BlogPostForm categories={categories} defaultAuthor={defaultAuthor} />;
}
