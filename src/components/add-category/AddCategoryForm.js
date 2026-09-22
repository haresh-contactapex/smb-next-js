"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  slugify,
  DEFAULT_CATEGORY,
  buildCategoryFromData,
  assembleCategory,
  excludeDescendants,
} from "./helpers";
import PageToolbar from "./PageToolbar";
import CategoryDetailsSection from "./CategoryDetailsSection";
import CollectionItemsSection from "./CollectionItemsSection";
import SeoSection from "./SeoSection";
import HierarchySidebar from "./HierarchySidebar";
import ProductRulesSidebar from "./ProductRulesSidebar";
import Toast from "@/components/add-product/Toast";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast, which
// also drives the progress-bar animation for both success and error messages.
const TOAST_AUTO_DISMISS_MS = 10000;

export default function AddCategoryForm({ categoryId, categories = [] }) {
  const isEdit = Boolean(categoryId);
  const router = useRouter();
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [toast, setToast] = useState({
    message: "",
    visible: false,
    variant: "success",
  });

  const titleInputRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    fetch(`/api/categories/${categoryId}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success)
          throw new Error(json.error || "Failed to load category");
        setCategory(buildCategoryFromData(json.data));
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoading(false);
        showToast(error.message, "error");
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const categoryOptions = excludeDescendants(categories, categoryId);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(
      () => setToast((t) => ({ ...t, visible: false })),
      TOAST_AUTO_DISMISS_MS,
    );
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  function setField(field, value) {
    setCategory((prev) => ({ ...prev, [field]: value }));
  }

  function handleTitleChange(value) {
    setCategory((prev) => ({
      ...prev,
      title: value,
      handle: prev.handleTouched ? prev.handle : slugify(value),
    }));
    setTitleError(false);
  }

  function handleHandleChange(value) {
    setCategory((prev) => ({
      ...prev,
      handle: slugify(value),
      handleTouched: true,
    }));
  }

  function handleImagePicked(file) {
    setField("image", { url: URL.createObjectURL(file), name: file.name });
    setImageError(false);
  }

  function handleImageRemoved() {
    setField("image", null);
  }

  function handleImageRejected(message) {
    showToast(message, "error");
  }

  function handleSave(e) {
    e?.preventDefault();

    const missingTitle = !category.title.trim();
    const missingImage = !category.image;

    setTitleError(missingTitle);
    setImageError(missingImage);

    if (missingTitle || missingImage) {
      if (missingTitle) {
        titleInputRef.current?.focus();
      }
      const message =
        missingTitle && missingImage
          ? "Image and Title required"
          : missingTitle
            ? "Title is required"
            : "Image is required";
      showToast(message, "error");
      return;
    }

    persistCategory();
  }

  async function persistCategory() {
    setSaving(true);
    try {
      const res = await fetch(
        isEdit ? `/api/categories/${categoryId}` : "/api/categories",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(assembleCategory(category)),
        },
      );
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "Failed to save category");

      showToast(isEdit ? "Category updated" : "Category saved");
      router.push("/categories");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (isEdit) {
      if (!window.confirm("Discard changes and go back to Categories?")) return;
      router.push("/categories");
      return;
    }
    if (!window.confirm("Discard all changes and start over?")) return;
    setCategory(DEFAULT_CATEGORY);
    setTitleError(false);
    setImageError(false);
  }

  const previewTitle =
    category.seoTitle || `Shop My Band — ${category.title || "Category Title"}`;
  const previewDesc =
    category.seoDescription ||
    "Add a meta description to see how your category listing will look in search engine results.";

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-slate-400">
        Loading category…
      </div>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <PageToolbar isEdit={isEdit} saving={saving} onDiscard={handleDiscard} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <CategoryDetailsSection
            title={category.title}
            titleError={titleError}
            titleInputRef={titleInputRef}
            description={category.description}
            image={category.image}
            imageError={imageError}
            onTitleChange={handleTitleChange}
            onDescriptionChange={(value) => setField("description", value)}
            onImagePicked={handleImagePicked}
            onImageRemoved={handleImageRemoved}
            onImageRejected={handleImageRejected}
          />

          <CollectionItemsSection />

          <SeoSection
            seoTitle={category.seoTitle}
            seoDescription={category.seoDescription}
            handle={category.handle}
            previewTitle={previewTitle}
            previewDesc={previewDesc}
            onSeoTitleChange={(value) => setField("seoTitle", value)}
            onSeoDescriptionChange={(value) =>
              setField("seoDescription", value)
            }
            onHandleChange={handleHandleChange}
          />
        </div>

        <div className="space-y-6">
          <HierarchySidebar
            parentCategory={category.parentCategory}
            themeTemplate={category.themeTemplate}
            visible={category.visible}
            categoryOptions={categoryOptions}
            onParentChange={(value) => setField("parentCategory", value)}
            onThemeChange={(value) => setField("themeTemplate", value)}
            onVisibleChange={(value) => setField("visible", value)}
          />

          <ProductRulesSidebar />
        </div>
      </div>

      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onDismiss={dismissToast}
      />
    </form>
  );
}
