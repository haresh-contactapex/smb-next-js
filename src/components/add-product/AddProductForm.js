"use client";

import { useRef, useState } from "react";
import { SAMPLE, DEFAULT_PRODUCT_SEED } from "@/data/addProductData";
import { buildProductFromData, assembleProduct, regenerateVariants, slugify, stripHtml } from "./helpers";
import PageToolbar from "./PageToolbar";
import ProductDetailsSection from "./ProductDetailsSection";
import MediaSection from "./MediaSection";
import PricingSection from "./PricingSection";
import InventorySection from "./InventorySection";
import ShippingSection from "./ShippingSection";
import VariantsSection from "./VariantsSection";
import SeoSection from "./SeoSection";
import StatusSidebar from "./StatusSidebar";
import OrganizationSidebar from "./OrganizationSidebar";
import JsonPayloadCard from "./JsonPayloadCard";
import JsonModal from "./JsonModal";
import Toast from "./Toast";

export default function AddProductForm() {
  const [product, setProduct] = useState(() => buildProductFromData(DEFAULT_PRODUCT_SEED));
  const [titleError, setTitleError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [jsonOutput, setJsonOutput] = useState("");
  const [toast, setToast] = useState({ message: "", visible: false });

  const editorRef = useRef(null);
  const titleInputRef = useRef(null);
  const toastTimerRef = useRef(null);

  function showToast(message) {
    setToast({ message, visible: true });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  function setField(field, value) {
    setProduct((prev) => ({ ...prev, [field]: value }));
  }

  function handleTitleChange(value) {
    setProduct((prev) => ({
      ...prev,
      title: value,
      handle: prev.handleTouched ? prev.handle : slugify(value),
    }));
    setTitleError(false);
  }

  function handleHandleChange(value) {
    setProduct((prev) => ({ ...prev, handle: slugify(value), handleTouched: true }));
  }

  function handleBodyHtmlChange(html) {
    setField("body_html", html);
  }

  function handleCategorySelect(path) {
    setField("category", path);
  }

  function handleCategoryClear() {
    setField("category", "");
  }

  function handleCollectionsChange(nextCollections) {
    setField("collections", nextCollections);
  }

  function handleTagsChange(nextTags) {
    setField("tags", nextTags);
  }

  function handleOptionsChange(nextOptions) {
    setProduct((prev) => ({
      ...prev,
      options: nextOptions,
      variants: regenerateVariants(nextOptions, prev.variants, prev.handle),
    }));
  }

  function handleVariantsChange(nextVariants) {
    setField("variants", nextVariants);
  }

  function handleSeoChange(patch) {
    setProduct((prev) => ({ ...prev, seo: { ...prev.seo, ...patch } }));
  }

  function handleAddFiles(fileList) {
    const additions = Array.from(fileList).map((file) => ({
      type: file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "model",
      url: URL.createObjectURL(file),
      name: file.name,
    }));
    setProduct((prev) => ({ ...prev, media: [...prev.media, ...additions] }));
  }

  function handleRemoveMedia(index) {
    setProduct((prev) => ({ ...prev, media: prev.media.filter((_, i) => i !== index) }));
  }

  function openModal() {
    setJsonOutput(JSON.stringify(assembleProduct(product), null, 2));
    setModalOpen(true);
  }

  function handleSave() {
    if (!product.title.trim()) {
      setTitleError(true);
      titleInputRef.current?.focus();
      showToast("Add a title before saving");
      return;
    }
    setTitleError(false);
    openModal();
    showToast("Product ready — review the JSON payload");
  }

  function loadProduct(data) {
    const next = buildProductFromData(data);
    setProduct(next);
    if (editorRef.current) editorRef.current.innerHTML = next.body_html;
    setTitleError(false);
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    loadProduct(DEFAULT_PRODUCT_SEED);
  }

  function handleLoadSample() {
    loadProduct(SAMPLE);
    showToast("Loaded sample product");
  }

  function handleCopyJson() {
    navigator.clipboard.writeText(jsonOutput).then(() => showToast("Copied JSON to clipboard"));
  }

  function handleDownloadJson() {
    const blob = new Blob([jsonOutput], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${product.handle || "product"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const seoPreviewTitle = product.seo.title || product.title || "Product title";
  const seoPreviewHandle = product.handle || "handle";
  const seoPreviewDesc =
    product.seo.description || stripHtml(product.body_html).slice(0, 160) || "Product description will appear here.";

  return (
    <>
      <PageToolbar onLoadSample={handleLoadSample} onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <ProductDetailsSection
            title={product.title}
            titleError={titleError}
            titleInputRef={titleInputRef}
            editorRef={editorRef}
            onTitleChange={handleTitleChange}
            onBodyHtmlChange={handleBodyHtmlChange}
          />

          <MediaSection media={product.media} onAddFiles={handleAddFiles} onRemoveMedia={handleRemoveMedia} />

          <PricingSection
            price={product.price}
            compareAtPrice={product.compare_at_price}
            chargeTax={product.charge_tax}
            costPerItem={product.cost_per_item}
            onFieldChange={setField}
          />

          <InventorySection
            trackQuantity={product.track_quantity}
            sku={product.sku}
            barcode={product.barcode}
            onFieldChange={setField}
          />

          <ShippingSection
            physicalProduct={product.physical_product}
            weight={product.weight}
            weightUnit={product.weight_unit}
            hsCode={product.hs_code}
            onFieldChange={setField}
          />

          <VariantsSection
            options={product.options}
            variants={product.variants}
            onOptionsChange={handleOptionsChange}
            onVariantsChange={handleVariantsChange}
          />

          <SeoSection
            seoTitle={product.seo.title}
            seoDescription={product.seo.description}
            previewTitle={seoPreviewTitle}
            previewHandle={seoPreviewHandle}
            previewDesc={seoPreviewDesc}
            onFieldChange={handleSeoChange}
          />
        </div>

        <div className="space-y-6">
          <StatusSidebar
            status={product.status}
            handle={product.handle}
            onFieldChange={setField}
            onHandleChange={handleHandleChange}
          />

          <OrganizationSidebar
            category={product.category}
            productType={product.product_type}
            collections={product.collections}
            tags={product.tags}
            onFieldChange={setField}
            onCategorySelect={handleCategorySelect}
            onCategoryClear={handleCategoryClear}
            onCollectionsChange={handleCollectionsChange}
            onTagsChange={handleTagsChange}
          />

          <JsonPayloadCard onPreview={openModal} />
        </div>
      </div>

      <JsonModal
        open={modalOpen}
        json={jsonOutput}
        onClose={() => setModalOpen(false)}
        onCopy={handleCopyJson}
        onDownload={handleDownloadJson}
      />

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
