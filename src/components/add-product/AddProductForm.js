"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SAMPLE, DEFAULT_PRODUCT_SEED } from "@/data/addProductData";
import {
  buildProductFromData,
  assembleProduct,
  regenerateVariants,
  slugify,
  stripHtml,
  productStatusFromSettings,
  newAttributeId,
} from "./helpers";
import PageToolbar from "./PageToolbar";
import ProductDetailsSection from "./ProductDetailsSection";
import MediaSection from "./MediaSection";
import PricingSection from "./PricingSection";
import InventorySection from "./InventorySection";
import ShippingSection from "./ShippingSection";
import VariantsSection from "./VariantsSection";
import AttributesSection from "./AttributesSection";
import SeoSection from "./SeoSection";
import StatusSidebar from "./StatusSidebar";
import OrganizationSidebar from "./OrganizationSidebar";
import EngravingSidebar from "./EngravingSidebar";
import JsonPayloadCard from "./JsonPayloadCard";
import JsonModal from "./JsonModal";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/components/ui/useToast";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES, classifyMediaFile, uploadPendingFiles } from "./mediaUpload";
import { findProductProblem } from "./validation";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";

const ENTER_SUBMIT_INPUT_TYPES = ["text", "search", "email", "tel", "url", "number", "password"];

export default function AddProductForm({ productId }) {
  const isEdit = Boolean(productId);
  const router = useRouter();
  const { skuPrefix, defaultProductStatus, defaultWeightUnit, formatMoney } = useGeneralSettings();
  // New products start pre-filled with the store's configured SKU prefix,
  // default status and default weight unit (Settings -> Products); editing
  // an existing product loads its real values instead, once the fetch below
  // resolves.
  const blankProductSeed = {
    ...DEFAULT_PRODUCT_SEED,
    ...(skuPrefix ? { sku: skuPrefix } : {}),
    ...(defaultProductStatus ? { status: productStatusFromSettings(defaultProductStatus) } : {}),
    ...(defaultWeightUnit ? { weight_unit: defaultWeightUnit } : {}),
  };
  const [product, setProduct] = useState(() => buildProductFromData(isEdit ? DEFAULT_PRODUCT_SEED : blankProductSeed));
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const [descriptionError, setDescriptionError] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [skuError, setSkuError] = useState(false);
  const [priceError, setPriceError] = useState(false);
  const [variantErrors, setVariantErrors] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [jsonOutput, setJsonOutput] = useState("");
  const { toast, showToast, dismissToast } = useToast();

  const editorRef = useRef(null);
  const titleInputRef = useRef(null);
  const categoryInputRef = useRef(null);
  const mediaSectionRef = useRef(null);
  const skuInputRef = useRef(null);
  const priceInputRef = useRef(null);
  const variantsSectionRef = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    fetch(`/api/products/${productId}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error(json.error || "Failed to load product");
        loadProduct(json.data);
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
  }, [productId, showToast]);

  // The description editor is an uncontrolled contentEditable div (see
  // ProductDetailsSection) — while `loading` is true the form isn't mounted yet,
  // so `loadProduct()`'s imperative innerHTML write above is a no-op. Sync it
  // once the form mounts.
  useEffect(() => {
    if (!loading && editorRef.current) {
      editorRef.current.innerHTML = product.body_html;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

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

  function handleCategoriesChange(nextCategories) {
    setField("categories", nextCategories);
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
      variants: regenerateVariants(nextOptions, prev.variants, prev.sku),
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
        file,
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

  // Images chosen from the Media library are already stored, so unlike freshly
  // picked files they carry no File and need no upload on save.
  function handleAddLibraryItems(libraryItems) {
    setProduct((prev) => {
      const have = new Set(prev.media.map((m) => m.url));
      const additions = libraryItems
        .filter((item) => !have.has(item.url))
        .map((item) => ({ type: "image", url: item.url, name: item.fileName }));
      return additions.length ? { ...prev, media: [...prev.media, ...additions] } : prev;
    });
    setMediaError(false);
  }

  function handleRemoveMedia(index) {
    setProduct((prev) => ({ ...prev, media: prev.media.filter((_, i) => i !== index) }));
  }

  // The saved order is the array order (product_media.position), which the storefront follows.
  function handleReorderMedia(from, to) {
    setProduct((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.media.length || to >= prev.media.length) return prev;
      const media = prev.media.slice();
      const [moved] = media.splice(from, 1);
      media.splice(to, 0, moved);
      return { ...prev, media };
    });
  }

  function handleAddAttribute() {
    setProduct((prev) => ({
      ...prev,
      attributes: [...prev.attributes, { id: newAttributeId(), label: "", value: "" }],
    }));
  }

  function handleAttributeChange(index, field, value) {
    setProduct((prev) => {
      const next = prev.attributes.slice();
      next[index] = { ...next[index], [field]: value };
      return { ...prev, attributes: next };
    });
  }

  function handleRemoveAttribute(index) {
    setProduct((prev) => ({ ...prev, attributes: prev.attributes.filter((_, i) => i !== index) }));
  }

  function handleVariantImageChange(index, file) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showToast(`${file.name}: only JPG, PNG, or WEBP images are allowed`, "error");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      showToast(`${file.name}: image must be 5MB or smaller`, "error");
      return;
    }
    setProduct((prev) => {
      const nextVariants = prev.variants.slice();
      nextVariants[index] = {
        ...nextVariants[index],
        image: { url: URL.createObjectURL(file), name: file.name, file },
      };
      return { ...prev, variants: nextVariants };
    });
  }

  // Already stored in the Media library, so no upload is needed on save.
  function handleVariantLibraryImage(index, item) {
    setProduct((prev) => {
      const nextVariants = prev.variants.slice();
      nextVariants[index] = { ...nextVariants[index], image: { url: item.url, name: item.fileName } };
      return { ...prev, variants: nextVariants };
    });
  }

  function handleVariantImageRemove(index) {
    setProduct((prev) => {
      const nextVariants = prev.variants.slice();
      nextVariants[index] = { ...nextVariants[index], image: null };
      return { ...prev, variants: nextVariants };
    });
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
    // Guards against a second submit landing while the first is still in
    // flight — e.g. pressing Enter in any text field re-triggers this via
    // handleFormKeyDown, and large variant sets can take a while to save.
    // A ref (not state) is required here: it's read/written synchronously,
    // so it closes the race a state flag would leave open across renders.
    if (savingRef.current) return;

    const problem = findProductProblem(product, { formatMoney });
    const at = problem?.field;
    // The red outline marks the first problem only, so fixing it moves on to the next one.
    setTitleError(at === "title");
    setCategoryError(at === "category");
    setDescriptionError(at === "description");
    setMediaError(at === "media" || at === "mediaMissing");
    setPriceError(at === "price");
    setSkuError(at === "sku");
    setVariantErrors(at === "variants" ? problem.variantRowErrors : []);

    if (problem) {
      showProblem(at);
      showToast(problem.message, "error");
      return;
    }

    persistProduct();
  }

  // Brings the field with the problem into view (and focuses it when it is an input).
  function showProblem(field) {
    const bringIntoView = (element) => element?.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusInput = (ref) => {
      bringIntoView(ref.current);
      ref.current?.focus();
    };
    if (field === "title") titleInputRef.current?.focus();
    else if (field === "category") focusInput(categoryInputRef);
    else if (field === "description") focusInput(editorRef);
    else if (field === "media" || field === "mediaMissing") bringIntoView(mediaSectionRef.current);
    else if (field === "price") focusInput(priceInputRef);
    else if (field === "sku") focusInput(skuInputRef);
    else bringIntoView(variantsSectionRef.current);
  }

  async function persistProduct() {
    savingRef.current = true;
    setSaving(true);
    try {
      // Kept in state right away so a failed save retried later doesn't
      // upload the same files a second time.
      const uploaded = await uploadPendingFiles(product);
      setProduct(uploaded);

      const res = await fetch(isEdit ? `/api/products/${productId}` : "/api/products", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assembleProduct(uploaded)),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save product");

      showToast(isEdit ? "Product updated" : "Product created");
      router.push("/admin/all-products");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
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
    if (isEdit) {
      if (!window.confirm("Discard changes and go back to All Products?")) return;
      router.push("/admin/all-products");
      return;
    }
    if (!window.confirm("Discard all changes and start over?")) return;
    loadProduct(blankProductSeed);
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

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-400">Loading product…</div>;
  }

  return (
    <form onSubmit={handleFormSubmit} onKeyDown={handleFormKeyDown} noValidate>
      <PageToolbar isEdit={isEdit} saving={saving} onLoadSample={handleLoadSample} onDiscard={handleDiscard} />

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
            onAddLibraryItems={handleAddLibraryItems}
            onRemoveMedia={handleRemoveMedia}
            onReorderMedia={handleReorderMedia}
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
            onVariantImageChange={handleVariantImageChange}
            onVariantLibraryImage={handleVariantLibraryImage}
            onVariantImageRemove={handleVariantImageRemove}
          />

          <AttributesSection
            attributes={product.attributes}
            onAdd={handleAddAttribute}
            onChange={handleAttributeChange}
            onRemove={handleRemoveAttribute}
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
            categories={product.categories}
            categoryError={categoryError}
            categoryInputRef={categoryInputRef}
            productType={product.product_type}
            collections={product.collections}
            tags={product.tags}
            onFieldChange={setField}
            onCategoriesChange={handleCategoriesChange}
            onCollectionsChange={handleCollectionsChange}
            onTagsChange={handleTagsChange}
          />

          <EngravingSidebar mode={product.engraving_mode} onChange={(mode) => setField("engraving_mode", mode)} />

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
