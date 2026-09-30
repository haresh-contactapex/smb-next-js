"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCan } from "@/components/providers/StaffPermissionsProvider";
import { DEFAULT_REVIEW, assembleReview, buildReviewFromData, validateReview } from "./helpers";
import PageToolbar from "./PageToolbar";
import ReviewDetailsSection from "./ReviewDetailsSection";
import ReviewerSection from "./ReviewerSection";
import ModerationSidebar from "./ModerationSidebar";
import Toast from "@/components/add-product/Toast";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast, which
// also drives the progress-bar animation for both success and error messages.
const TOAST_AUTO_DISMISS_MS = 10000;

// On-screen order, so the first invalid field is the one that gets focus.
const FIELD_ORDER = ["productId", "rating", "title", "content", "displayName", "email"];

export default function AddReviewForm({ reviewId, products = [] }) {
  const isEdit = Boolean(reviewId);
  const router = useRouter();
  const can = useCan();
  const canApprove = can("reviews.approve");

  // An admin adding a review means to publish it, so those who may approve
  // start at Approved; everyone else is limited to Pending (the server
  // enforces that regardless of what is sent).
  const newReview = () => ({ ...DEFAULT_REVIEW, status: canApprove ? "APPROVED" : "PENDING" });

  const [review, setReview] = useState(newReview);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const fieldRefs = useRef({});
  const toastTimerRef = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!reviewId) return undefined;
    let cancelled = false;
    fetch(`/api/reviews/${reviewId}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to load review");
        return json.data;
      })
      .then((data) => {
        if (cancelled) return;
        setReview(buildReviewFromData(data));
        setMeta({ createdAt: data.createdAt, updatedAt: data.updatedAt });
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_AUTO_DISMISS_MS);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  const registerRef = (name) => (element) => {
    fieldRefs.current[name] = element;
  };

  function setField(field, value) {
    setReview((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function handleSave(e) {
    e?.preventDefault();
    if (savingRef.current) return;

    const found = validateReview(review);
    setErrors(found);
    const firstInvalid = FIELD_ORDER.find((field) => found[field]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      showToast("Fill in the required fields before saving", "error");
      return;
    }

    persistReview();
  }

  async function persistReview() {
    savingRef.current = true;
    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/reviews/${reviewId}` : "/api/reviews", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assembleReview(review)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save review");

      showToast(isEdit ? "Review updated" : "Review saved");
      router.push("/admin/all-reviews");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (isEdit) {
      if (!window.confirm("Discard changes and go back to All Reviews?")) return;
      router.push("/admin/all-reviews");
      return;
    }
    if (!window.confirm("Discard all changes and start over?")) return;
    setReview(newReview());
    setErrors({});
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-400">Loading review…</div>;
  }

  if (loadError) {
    return (
      <div className="py-16 text-center space-y-3" role="alert">
        <p className="text-sm text-error">{loadError}</p>
        <Link href="/admin/all-reviews" className="inline-block text-sm font-semibold text-primary-600 dark:text-accent-400 hover:underline">
          Back to All Reviews
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} noValidate>
      <PageToolbar isEdit={isEdit} saving={saving} onDiscard={handleDiscard} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <ReviewDetailsSection
            products={products}
            productId={review.productId}
            rating={review.rating}
            title={review.title}
            content={review.content}
            errors={errors}
            registerRef={registerRef}
            onFieldChange={setField}
          />

          <ReviewerSection
            displayName={review.displayName}
            email={review.email}
            errors={errors}
            registerRef={registerRef}
            onFieldChange={setField}
          />
        </div>

        <div className="space-y-6">
          <ModerationSidebar status={review.status} canApprove={canApprove} meta={meta} onFieldChange={setField} />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </form>
  );
}
