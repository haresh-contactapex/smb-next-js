"use client";

import { useRef, useState } from "react";
import { SAMPLE, DEFAULT_PRODUCT_SEED } from "@/data/addProductData";
import { buildProductFromData, assembleProduct, regenerateVariants, slugify, stripHtml, toNumber } from "./helpers";
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

const ENTER_SUBMIT_INPUT_TYPES = ["text", "search", "email", "tel", "url", "number", "password"];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
const ALLOWED_MODEL_EXTENSIONS = [".glb", ".usdz"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function classifyMediaFile(file) {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) return "image";
  if (ALLOWED_VIDEO_TYPES.includes(file.type)) return "video";
  const lowerName = file.name.toLowerCase();
  if (ALLOWED_MODEL_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) return "model";
  return null;
}

export default function AddProductForm() {
  const [product, setProduct] = useState(() => buildProductFromData(DEFAULT_PRODUCT_SEED));
  const [titleError, setTitleError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const [descriptionError, setDescriptionError] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [skuError, setSkuError] = useState(false);
  const [priceError, setPriceError] = useState(false);
  const [variantErrors, setVariantErrors] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [jsonOutput, setJsonOutput] = useState("");
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const editorRef = useRef(null);
  const titleInputRef = useRef(null);
  const categoryInputRef = useRef(null);
  const mediaSectionRef = useRef(null);
  const skuInputRef = useRef(null);
  const priceInputRef = useRef(null);
  const variantsSectionRef = useRef(null);
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
    setProduct((prev) => ({ ...prev, [field]: value }));
    if (field === "sku") setSkuError(false);
    if (field === "price") setPriceError(false);
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
    setDescriptionError(false);
  }

  function handleCategorySelect(path) {
    setField("category", path);
    setCategoryError(false);
  }

  function handleCategoryClear() {
    setField("category", "");
    setCategoryError(false);
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
    setVariantErrors([]);
  }

  function handleVariantsChange(nextVariants) {
    setField("variants", nextVariants);
    setVariantErrors([]);
  }

  function handleSeoChange(patch) {
    setProduct((prev) => ({ ...prev, seo: { ...prev.seo, ...patch } }));
  }

  function handleAddFiles(fileList) {
    const accepted = [];
    const rejectedNames = [];

    Array.from(fileList).forEach((file) => {
      const kind = classifyMediaFile(file);
      if (!kind) {
        rejectedNames.push(file.name);
        return;
      }
      if (kind === "image" && file.size > MAX_IMAGE_SIZE_BYTES) {
        rejectedNames.push(file.name);
        return;
      }
      accepted.push({ file, kind });
    });

    if (accepted.length) {
      const additions = accepted.map(({ file, kind }) => ({
        type: kind,
        url: URL.createObjectURL(file),
        name: file.name,
      }));
      setProduct((prev) => ({ ...prev, media: [...prev.media, ...additions] }));
      setMediaError(false);
    }

    if (rejectedNames.length) {
      showToast(
        `Skipped ${rejectedNames.join(", ")}: only JPG, PNG, WEBP images (5MB max), video, .glb, or .usdz files are allowed`,
        "error"
      );
    }
  }

  function handleRemoveMedia(index) {
    setProduct((prev) => ({ ...prev, media: prev.media.filter((_, i) => i !== index) }));
  }

  function openModal() {
    setJsonOutput(JSON.stringify(assembleProduct(product), null, 2));
    setModalOpen(true);
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    handleSave();
  }

  function handleFormKeyDown(e) {
    if (e.key !== "Enter" || e.defaultPrevented || e.isComposing) return;
    const target = e.target;
    if (target.tagName !== "INPUT" || !ENTER_SUBMIT_INPUT_TYPES.includes(target.type)) return;
    e.preventDefault();
    handleSave();
  }

  function handleSave() {
    const variantRowErrors = product.variants.map((v) => ({
      price: !v.price || toNumber(v.price) <= 0,
      quantity: String(v.inventory_quantity).trim() === "",
    }));

    // Order matches the page layout top to bottom, so validation stops at the
    // first invalid field instead of jumping ahead to a field further down.
    const steps = [
      {
        invalid: !product.title.trim(),
        setError: setTitleError,
        onFail: () => {
          titleInputRef.current?.focus();
          showToast("Add a title before saving", "error");
        },
      },
      {
        invalid: !product.category.trim(),
        setError: setCategoryError,
        onFail: () => {
          categoryInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          categoryInputRef.current?.focus();
          showToast("Add a product category before saving", "error");
        },
      },
      {
        invalid: !stripHtml(product.body_html).trim(),
        setError: setDescriptionError,
        onFail: () => {
          editorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          editorRef.current?.focus();
          showToast("Add a description before saving", "error");
        },
      },
      {
        invalid: product.media.length === 0,
        setError: setMediaError,
        onFail: () => {
          mediaSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          showToast("Add at least one image, video, or 3D model before saving", "error");
        },
      },
      {
        invalid: !product.price || toNumber(product.price) <= 0,
        setError: setPriceError,
        onFail: () => {
          priceInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          priceInputRef.current?.focus();
          showToast("Enter a price greater than $0 before saving", "error");
        },
      },
      {
        invalid: !product.sku.trim(),
        setError: setSkuError,
        onFail: () => {
          skuInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          skuInputRef.current?.focus();
          showToast("Add a SKU before saving", "error");
        },
      },
      {
        invalid: variantRowErrors.some((err) => err.price || err.quantity),
        setError: (isCurrent) => setVariantErrors(isCurrent ? variantRowErrors : []),
        onFail: () => {
          variantsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          showToast("Add a price and quantity for every variant before saving", "error");
        },
      },
    ];

    const firstInvalidIndex = steps.findIndex((step) => step.invalid);
    steps.forEach((step, i) => step.setError(i === firstInvalidIndex));

    if (firstInvalidIndex !== -1) {
      steps[firstInvalidIndex].onFail();
      return;
    }

    openModal();
    showToast("Product ready — review the JSON payload");
  }

  function loadProduct(data) {
    const next = buildProductFromData(data);
    setProduct(next);
    if (editorRef.current) editorRef.current.innerHTML = next.body_html;
    setTitleError(false);
    setCategoryError(false);
    setDescriptionError(false);
    setMediaError(false);
    setSkuError(false);
    setPriceError(false);
    setVariantErrors([]);
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
    <form onSubmit={handleFormSubmit} onKeyDown={handleFormKeyDown} noValidate>
      <PageToolbar onLoadSample={handleLoadSample} onDiscard={handleDiscard} />

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <ProductDetailsSection
            title={product.title}
            titleError={titleError}
            titleInputRef={titleInputRef}
            descriptionError={descriptionError}
            editorRef={editorRef}
            onTitleChange={handleTitleChange}
            onBodyHtmlChange={handleBodyHtmlChange}
          />

          <MediaSection
            media={product.media}
            mediaError={mediaError}
            sectionRef={mediaSectionRef}
            onAddFiles={handleAddFiles}
            onRemoveMedia={handleRemoveMedia}
          />

          <PricingSection
            price={product.price}
            priceError={priceError}
            priceInputRef={priceInputRef}
            compareAtPrice={product.compare_at_price}
            chargeTax={product.charge_tax}
            costPerItem={product.cost_per_item}
            onFieldChange={setField}
          />

          <InventorySection
            trackQuantity={product.track_quantity}
            sku={product.sku}
            skuError={skuError}
            skuInputRef={skuInputRef}
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
            variantErrors={variantErrors}
            sectionRef={variantsSectionRef}
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
            categoryError={categoryError}
            categoryInputRef={categoryInputRef}
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

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </form>
  );
}
