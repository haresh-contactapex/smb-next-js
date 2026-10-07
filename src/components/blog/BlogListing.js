"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BlogFilters from "./BlogFilters";
import BlogTable from "./BlogTable";
import DeleteOverlay from "@/components/admin-panel/DeleteOverlay";
import Toast from "@/components/add-product/Toast";
import { blogPostPath, todayIso } from "@/lib/blogRules";
import { displayStatus } from "./helpers";

const TOAST_AUTO_DISMISS_MS = 10000;

export default function BlogListing({ posts: initialPosts }) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [deletingPost, setDeletingPost] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", variant: "success" });
  const toastTimerRef = useRef(null);

  function showToast(message, variant = "success") {
    setToast({ visible: true, message, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_AUTO_DISMISS_MS);
  }

  async function handleDelete(post) {
    if (!window.confirm(`Delete "${post.title}"? Its address ${blogPostPath(post.categorySlug, post.slug)} will stop working. This can't be undone.`)) return;
    setDeletingPost(post);
    try {
      const res = await fetch(`/api/blog/posts/${post.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "The post couldn't be deleted.");
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      showToast(`"${post.title}" was removed.`);
      router.refresh();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setDeletingPost(null);
    }
  }

  // The categories of the posts that are in the list, for the filter.
  const categories = useMemo(() => {
    const bySlug = new Map();
    for (const post of posts) if (!bySlug.has(post.categorySlug)) bySlug.set(post.categorySlug, post.category);
    return [...bySlug].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [posts]);

  // Deleting the last post of the chosen category drops it from the filter.
  const activeCategory = categories.some((option) => option.slug === category) ? category : "";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const today = todayIso();
    return posts.filter((post) => {
      if (q) {
        const haystack = [post.title, blogPostPath(post.categorySlug, post.slug), post.author].join("\n").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (status && displayStatus(post, today) !== status) return false;
      if (activeCategory && post.categorySlug !== activeCategory) return false;
      return true;
    });
  }, [posts, search, status, activeCategory]);

  return (
    <>
      <BlogFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        category={activeCategory}
        onCategoryChange={setCategory}
        categories={categories}
        resultCount={filtered.length}
      />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        <BlogTable
          posts={filtered}
          emptyMessage={posts.length === 0 ? "No posts yet." : "No posts match your filters."}
          onDelete={handleDelete}
          deletingId={deletingPost?.id}
        />
      </section>

      <DeleteOverlay active={deletingPost != null} title="Deleting post…" itemLabel={deletingPost?.title || ""} />
      <Toast
        visible={toast.visible}
        message={toast.message}
        variant={toast.variant}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </>
  );
}
