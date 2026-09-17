"use client";

import { useRef, useState } from "react";
import { categories } from "@/data/categoriesData";
import { slugify, DEFAULT_CATEGORY } from "./helpers";
import PageToolbar from "./PageToolbar";
import CategoryDetailsSection from "./CategoryDetailsSection";
import CollectionItemsSection from "./CollectionItemsSection";
import SeoSection from "./SeoSection";
import HierarchySidebar from "./HierarchySidebar";
import ProductRulesSidebar from "./ProductRulesSidebar";
import Toast from "./Toast";

const CATEGORY_OPTIONS = categories.map((cat) => cat.name).sort();

export default function AddCategoryForm() {
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [titleError, setTitleError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const titleInputRef = useRef(null);
  const toastTimerRef = useRef(null);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
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
    setCategory((prev) => ({ ...prev, handle: slugify(value), handleTouched: true }));
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

    showToast("Category saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setCategory(DEFAULT_CATEGORY);
    setTitleError(false);
    setImageError(false);
  }

  const previewTitle = category.seoTitle || `Shop My Band — ${category.title || "Category Title"}`;
  const previewDesc =
    category.seoDescription ||
    "Add a meta description to see how your category listing will look in search engine results.";

  return (
    <form onSubmit={handleSave}>
      <PageToolbar onDiscard={handleDiscard} />

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
            onSeoDescriptionChange={(value) => setField("seoDescription", value)}
            onHandleChange={handleHandleChange}
          />
        </div>

        <div className="space-y-6">
          <HierarchySidebar
            parentCategory={category.parentCategory}
            themeTemplate={category.themeTemplate}
            categoryOptions={CATEGORY_OPTIONS}
            onParentChange={(value) => setField("parentCategory", value)}
            onThemeChange={(value) => setField("themeTemplate", value)}
          />

          <ProductRulesSidebar />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </form>
  );
}
