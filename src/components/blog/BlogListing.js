"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BlogFilters from "./BlogFilters";
import BlogTable from "./BlogTable";
import Pagination, { PAGE_SIZE_OPTIONS } from "./Pagination";
import DeleteOverlay from "@/components/admin-panel/DeleteOverlay";
import useNavReselect from "@/components/admin-panel/useNavReselect";
import { BulkSelectionBar, confirmBulkDelete, requestBulkDelete, useBulkSelection } from "@/components/admin-panel/BulkSelection";
import { useCan } from "@/components/providers/StaffPermissionsProvider";
import Toast from "@/components/add-product/Toast";
import { blogPostPath, todayIso } from "@/lib/blogRules";
import { displayStatus } from "./helpers";

const TOAST_AUTO_DISMISS_MS = 10000;

export default function BlogListing({ posts: initialPosts }) {
  const router = useRouter();
  const canDelete = useCan()("blog.delete");
  const selection = useBulkSelection();
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [posts, setPosts] = useState(initialPosts);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  // Newest first, like the storefront; a post with no date yet (a draft) counts as the newest.
  const [sort, setSort] = useState({ key: "date", direction: "desc" });
  const [deletingPost, setDeletingPost] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", variant: "success" });
  const toastTimerRef = useRef(null);

  // Clicking "All Posts" in the sidebar while already here starts the list over, like a fresh visit.
  useNavReselect(() => {
    setSearch("");
    setStatus("");
    setCategory("");
    setPage(1);
    setPageSize(PAGE_SIZE_OPTIONS[0]);
    setSort({ key: "date", direction: "desc" });
    selection.clear();
  });

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
      selection.remove([post.id]);
      showToast(`"${post.title}" was removed.`);
      router.refresh();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setDeletingPost(null);
    }
  }

  async function handleBulkDelete() {
    const ids = [...selection.ids];
    if (ids.length === 0 || bulkDeleting) return;
    if (!confirmBulkDelete(ids.length, "post", "posts", "Their addresses will stop working.")) return;
    setBulkDeleting(true);
    try {
      const { deleted } = await requestBulkDelete("/api/blog/posts", ids, "Failed to delete posts");
      const removed = new Set(ids);
      setPosts((prev) => prev.filter((x) => !removed.has(x.id)));
      selection.clear();
      showToast(`${deleted} post${deleted === 1 ? "" : "s"} removed.`);
      router.refresh();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBulkDeleting(false);
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

  const sorted = useMemo(() => {
    const dir = sort.direction === "asc" ? 1 : -1;
    const today = todayIso();
    const text = (a, b) => String(a || "").localeCompare(String(b || ""), undefined, { sensitivity: "base" });
    return [...filtered].sort((a, b) => {
      if (sort.key === "category") return text(a.category, b.category) * dir;
      if (sort.key === "author") return text(a.author, b.author) * dir;
      if (sort.key === "status") return text(displayStatus(a, today), displayStatus(b, today)) * dir;
      if (sort.key === "date") return text(a.publishedOn || "9999-12-31", b.publishedOn || "9999-12-31") * dir;
      return text(a.title, b.title) * dir;
    });
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // A new filter starts again from the first page.
  function updateFilter(setter) {
    return (value) => {
      setter(value);
      setPage(1);
      selection.clear();
    };
  }

  function handleSortChange(key) {
    setSort((prev) => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }));
    setPage(1);
  }

  function handlePageSizeChange(size) {
    setPageSize(size);
    setPage(1);
  }

  return (
    <>
      <BlogFilters
        search={search}
        onSearchChange={updateFilter(setSearch)}
        status={status}
        onStatusChange={updateFilter(setStatus)}
        category={activeCategory}
        onCategoryChange={updateFilter(setCategory)}
        categories={categories}
        resultCount={sorted.length}
      />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        {canDelete && (
          <BulkSelectionBar
            count={selection.size}
            matchingCount={sorted.length}
            noun="posts"
            filtered={Boolean(search || status || activeCategory)}
            onSelectAll={() => selection.replace(sorted.map((x) => x.id))}
            onClear={selection.clear}
            onDelete={handleBulkDelete}
            deleting={bulkDeleting}
          />
        )}
        <BlogTable
          selection={canDelete ? selection : null}
          onTogglePage={selection.setMany}
          posts={pageItems}
          emptyMessage={posts.length === 0 ? "No posts yet." : "No posts match your filters."}
          onDelete={handleDelete}
          deletingId={deletingPost?.id}
          sort={sort}
          onSortChange={handleSortChange}
        />
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          totalCount={sorted.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </section>

      <DeleteOverlay
        active={deletingPost != null || bulkDeleting}
        title={bulkDeleting ? "Deleting posts…" : "Deleting post…"}
        itemLabel={bulkDeleting ? `${selection.size} selected` : deletingPost?.title || ""}
      />
      <Toast
        visible={toast.visible}
        message={toast.message}
        variant={toast.variant}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </>
  );
}
