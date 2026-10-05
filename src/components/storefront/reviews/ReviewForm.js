"use client";

import { useEffect, useId, useRef, useState } from "react";
import RatingInput from "./RatingInput";
import { EMPTY_REVIEW, REVIEW_FIELDS, REVIEW_LIMITS, normalizeReview, validateReview } from "./helpers";

// Same invalid-field treatment as the register and Ask a question forms (pink fill, red border).
const FIELD_ERROR = "!border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50";

const SEND_FAILED = "We couldn't save your review. Please try again.";

// Label above the control, message below it: the register form's field layout.
function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-error empty:hidden">
        {error}
      </p>
    </div>
  );
}

// The "Write a review" form inside the Customer Reviews tab. Posts to
// /api/storefront/reviews, which saves the review as pending until a moderator
// approves it. `onSent` receives { firstName } once it has been accepted.
export default function ReviewForm({ handle, onSent }) {
  const baseId = useId();
  const fieldRefs = useRef({});
  const submitRef = useRef(null);
  const submittingRef = useRef(false);

  const [values, setValues] = useState(EMPTY_REVIEW);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);

  const fieldId = (name) => `${baseId}-${name}`;

  // Open on the first field the visitor has to fill in.
  useEffect(() => {
    fieldRefs.current.rating?.focus();
  }, []);

  // The submit button is disabled while sending, which drops focus to the page;
  // put it back beside the error so keyboard and screen-reader users keep their place.
  useEffect(() => {
    if (formError) submitRef.current?.focus();
  }, [formError]);

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    // Clear a field's message as soon as the visitor starts fixing it.
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;

    const cleaned = normalizeReview(values);
    const found = validateReview(cleaned);
    setErrors(found);
    setFormError("");
    const firstInvalid = REVIEW_FIELDS.find((name) => found[name]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }

    submittingRef.current = true;
    setSending(true);
    try {
      const res = await fetch("/api/storefront/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cleaned, handle, honeypot }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setFormError(json?.error || SEND_FAILED);
        setSending(false);
        return;
      }
      onSent({ firstName: cleaned.displayName.split(" ")[0] });
    } catch {
      setFormError(SEND_FAILED);
      setSending(false);
    } finally {
      submittingRef.current = false;
    }
  }

  // Everything the text controls share; `extra` is any per-control classes.
  const fieldProps = (name, extra = "") => ({
    id: fieldId(name),
    ref: (node) => {
      fieldRefs.current[name] = node;
    },
    value: values[name],
    onChange: (event) => update(name, event.target.value),
    disabled: sending,
    maxLength: REVIEW_LIMITS[name],
    "aria-required": "true",
    "aria-invalid": errors[name] ? "true" : undefined,
    "aria-describedby": errors[name] ? `${fieldId(name)}-error` : undefined,
    className: `field-input ${extra} ${errors[name] ? FIELD_ERROR : ""} disabled:opacity-60`,
  });

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Write a review" className="space-y-5 rounded-xl border border-gray-200 p-5 sm:p-6">
      <RatingInput
        value={values.rating}
        onChange={(rating) => update("rating", rating)}
        error={errors.rating}
        disabled={sending}
        inputRef={(node) => {
          fieldRefs.current.rating = node;
        }}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={fieldId("displayName")} label="Name" hint="Shown with your review." error={errors.displayName}>
          <input type="text" autoComplete="name" autoCapitalize="words" placeholder="Jane D." {...fieldProps("displayName")} />
        </Field>
        <Field id={fieldId("email")} label="Email Address" hint="Never shown publicly." error={errors.email}>
          <input type="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" placeholder="you@example.com" {...fieldProps("email")} />
        </Field>
      </div>

      <Field id={fieldId("title")} label="Review Title" error={errors.title}>
        <input type="text" placeholder="Sum it up in a few words" {...fieldProps("title")} />
      </Field>

      <Field id={fieldId("content")} label="Your Review" error={errors.content}>
        <textarea rows={5} placeholder="What did you like or dislike? How does it fit and wear?" {...fieldProps("content", "h-36 resize-y py-3 leading-relaxed")} />
        <p className="mt-1 text-right text-xs text-gray-400" aria-hidden="true">
          {values.content.length} / {REVIEW_LIMITS.content}
        </p>
      </Field>

      {/* Honeypot: invisible to people, tempting to bots; the server drops a submission that fills it.
          Its name avoids anything browser autofill recognises ("website", "url"), which would
          make a real visitor's review vanish. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" name="hp_contact" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
        </label>
      </div>

      <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-error empty:hidden">
        {formError}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <button
          ref={submitRef}
          type="submit"
          disabled={sending}
          className="rounded bg-[#4A4A4A] px-8 py-3 text-[16px] font-semibold text-white transition-colors hover:bg-[#ef9822] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ef9822] disabled:opacity-60"
        >
          {sending ? "Submitting…" : "Submit Review"}
        </button>
        <p className="text-xs text-gray-400">Reviews are checked by our team before they appear.</p>
      </div>
    </form>
  );
}
