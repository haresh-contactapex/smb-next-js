"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import StoreIcon from "../icons";
import { EMPTY_QUESTION, QUESTION_FIELDS, QUESTION_LIMITS, normalizeQuestion, validateQuestion } from "./helpers";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Grey filled fields with no border until focus, like the reference form.
const FIELD =
  "block w-full border border-transparent bg-[#f4f4f4] px-5 text-[14px] text-[#555555] outline-none transition-colors placeholder:text-[#6b6b6b] focus:border-[#1c3b6a] focus:bg-white";
const FIELD_ERROR = "!border-error !bg-error/5";

const SEND_FAILED = "We couldn't send your question. Please try again.";

// The visible placeholder is the design; the label is for screen readers.
function Field({ id, label, error, className = "", children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      {children}
      <p id={`${id}-error`} role="alert" className="mt-1.5 text-[13px] text-error empty:hidden">
        {error}
      </p>
    </div>
  );
}

// "Ask a question" dialog for the product page: name, email, phone and the
// question, with the product shown underneath. Posts to /api/product-questions,
// which emails the store and a confirmation to the visitor. Esc, the close
// button and (while the form is empty) the backdrop close it; Tab stays inside,
// page scroll is locked and focus goes back to the button that opened it.
export default function AskQuestionModal({ product, priceLabel, supportEmail = "", onClose }) {
  const baseId = useId();
  const dialogRef = useRef(null);
  const fieldRefs = useRef({});
  const doneRef = useRef(null);
  const submitRef = useRef(null);
  const submittingRef = useRef(false);

  const [values, setValues] = useState(EMPTY_QUESTION);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState("idle"); // "idle" | "sending" | "sent"
  const [sent, setSent] = useState({ firstName: "", email: "", confirmationSent: false });

  const titleId = `${baseId}-title`;
  const fieldId = (name) => `${baseId}-${name}`;
  const sending = status === "sending";
  // A stray backdrop click must not throw away a half-written question.
  const dirty = status !== "sent" && QUESTION_FIELDS.some((name) => values[name].trim());

  // Lock page scroll (without the scrollbar shifting the layout), open on the
  // first field and give focus back to the trigger on the way out.
  useEffect(() => {
    const opener = document.activeElement;
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    fieldRefs.current.name?.focus();
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      opener?.focus?.();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialogRef.current.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // The submit button unmounts with the form, so hand focus to the Close button.
  useEffect(() => {
    if (status === "sent") doneRef.current?.focus();
  }, [status]);

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

    const cleaned = normalizeQuestion(values);
    const found = validateQuestion(cleaned);
    setErrors(found);
    setFormError("");
    const firstInvalid = QUESTION_FIELDS.find((name) => found[name]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }

    submittingRef.current = true;
    setStatus("sending");
    // Offered when the problem is on our side rather than in what they typed.
    const fallback = supportEmail ? ` You can also email us at ${supportEmail}.` : "";
    try {
      const res = await fetch("/api/product-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cleaned, handle: product.handle, honeypot }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setFormError(`${json?.error || SEND_FAILED}${res.status >= 500 ? fallback : ""}`);
        setStatus("idle");
        return;
      }
      setSent({
        firstName: cleaned.name.split(" ")[0],
        email: cleaned.email,
        confirmationSent: Boolean(json.data?.confirmationSent),
      });
      setStatus("sent");
    } catch {
      setFormError(`${SEND_FAILED}${fallback}`);
      setStatus("idle");
    } finally {
      submittingRef.current = false;
    }
  }

  // Everything the four controls share; `size` is the height classes.
  const fieldProps = (name, size) => ({
    id: fieldId(name),
    ref: (node) => {
      fieldRefs.current[name] = node;
    },
    value: values[name],
    onChange: (event) => update(name, event.target.value),
    disabled: sending,
    maxLength: QUESTION_LIMITS[name],
    "aria-required": "true",
    "aria-invalid": errors[name] ? "true" : undefined,
    "aria-describedby": errors[name] ? `${fieldId(name)}-error` : undefined,
    className: `${FIELD} ${size} ${errors[name] ? FIELD_ERROR : ""} disabled:opacity-60`,
  });

  const dialog = (
    <div
      onMouseDown={(event) => event.target === event.currentTarget && !dirty && onClose()}
      className="lightbox-enter fixed inset-0 z-[100] flex overflow-y-auto bg-[#0e2548]/75 p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative m-auto w-full max-w-[520px] bg-white px-5 pb-6 pt-12 sm:px-10 sm:pb-8 sm:pt-[45px]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-[#333333] transition-colors hover:text-[#ef9822] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ef9822]"
        >
          <StoreIcon name="close" className="h-5 w-5" />
        </button>

        <div className="mb-[30px] border-b border-[#ebebeb]">
          <h2
            id={titleId}
            className="-mb-px inline-block border-b border-[#1c3b6a] pb-[15px] text-[26px] font-normal leading-tight text-[#1c3b6a] sm:text-[28px]"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Ask a question
          </h2>
        </div>

        {status === "sent" ? (
          <div role="status" className="py-4 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
              <StoreIcon name="check" className="h-6 w-6" />
            </span>
            <p className="mb-2 text-[20px] text-[#333333]" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Thank you, {sent.firstName}!
            </p>
            <p className="text-[15px] leading-relaxed text-[#555555]">
              We&apos;ve received your question about <span className="font-medium text-[#333333]">{product.title}</span> and
              will reply as soon as we can.
              {sent.confirmationSent && (
                <>
                  {" "}
                  A confirmation has been sent to <span className="font-medium text-[#333333]">{sent.email}</span>.
                </>
              )}
            </p>
            <button
              ref={doneRef}
              type="button"
              onClick={onClose}
              className="mt-6 h-[50px] w-full border border-[#1c3b6a] text-[12px] font-medium uppercase tracking-[2px] text-[#1c3b6a] transition-colors hover:bg-[#1c3b6a] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ef9822]"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid gap-x-2 sm:grid-cols-2">
              <Field id={fieldId("name")} label="Your name" error={errors.name} className="mb-3">
                <input type="text" autoComplete="name" autoCapitalize="words" placeholder="Your name" {...fieldProps("name", "h-[50px]")} />
              </Field>
              <Field id={fieldId("email")} label="Your email" error={errors.email} className="mb-3">
                <input type="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" placeholder="Your email" {...fieldProps("email", "h-[50px]")} />
              </Field>
            </div>
            <Field id={fieldId("phone")} label="Phone number" error={errors.phone} className="mb-3">
              <input type="tel" inputMode="tel" autoComplete="tel" placeholder="Phone Number" {...fieldProps("phone", "h-[50px]")} />
            </Field>
            <Field id={fieldId("question")} label="Your question" error={errors.question} className="mb-3">
              <textarea rows={6} placeholder="Your message..." {...fieldProps("question", "h-[180px] resize-y py-4 sm:h-[240px]")} />
            </Field>

            {/* Honeypot: invisible to people, tempting to bots; the server drops a submission that fills it.
                Its name avoids anything browser autofill recognises ("website", "url"), which would
                make a real visitor's question vanish. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Leave this field empty
                <input type="text" name="hp_contact" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
              </label>
            </div>

            <p role="alert" className="mb-3 text-[14px] text-error empty:hidden">
              {formError}
            </p>

            <button
              ref={submitRef}
              type="submit"
              disabled={sending}
              className="h-[50px] w-full border border-[#1c3b6a] px-3 text-[12px] font-medium uppercase tracking-[2px] text-[#1c3b6a] transition-colors hover:bg-[#1c3b6a] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ef9822] disabled:pointer-events-none disabled:opacity-60"
            >
              {sending ? "Sending..." : "Send Message"}
            </button>

            <div className="mt-[25px] flex items-center gap-4">
              <div className="h-[100px] w-[100px] shrink-0 bg-[#f4f4f4]">
                {product.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[14px] leading-snug text-[#1c3b6a]">{product.title}</p>
                <p className="mt-1 text-[14px] text-[#555555]">{priceLabel}</p>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  // Portal into the storefront root (keeps fonts/colors) rather than the page
  // wrapper, whose fade-in transform would otherwise trap a fixed overlay.
  return createPortal(dialog, document.getElementById("storefront-root") ?? document.body);
}
