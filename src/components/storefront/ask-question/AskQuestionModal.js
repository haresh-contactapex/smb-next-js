"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/admin-panel/Icon";
import { EMPTY_QUESTION, QUESTION_FIELDS, QUESTION_LIMITS, normalizeQuestion, validateQuestion } from "./helpers";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Same invalid-field treatment as the register form (pink fill, red border).
const FIELD_ERROR = "!border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50";

const PRIMARY_BUTTON =
  "h-11 w-full rounded-xl bg-primary-500 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-60";

const SEND_FAILED = "We couldn't send your question. Please try again.";

// Label above the control, message below it: the register form's field layout.
function Field({ id, label, error, children }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children}
      <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-error empty:hidden">
        {error}
      </p>
    </div>
  );
}

// A control with a small icon inside its left edge (pair with `pl-10` on the control).
function IconField({ icon, children }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      {children}
    </div>
  );
}

// "Ask a question" dialog for the product page, styled like the register form:
// name, email, phone and the question, with the product shown underneath. Posts
// to /api/product-questions, which emails the store and a confirmation to the
// visitor. Esc, the close button and (while the form is empty) the backdrop
// close it; Tab stays inside, page scroll is locked and focus goes back to the
// button that opened it.
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

  // Everything the four controls share; `extra` is any per-control classes.
  const fieldProps = (name, extra = "") => ({
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
    className: `field-input ${extra} ${errors[name] ? FIELD_ERROR : ""} disabled:opacity-60`,
  });

  const dialog = (
    <div
      onMouseDown={(event) => event.target === event.currentTarget && !dirty && onClose()}
      className="lightbox-enter fixed inset-0 z-[100] flex overflow-y-auto bg-slate-900/60 p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative m-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          <Icon name="x" className="h-5 w-5" />
        </button>

        <h2 id={titleId} className="pr-8 text-2xl font-bold text-slate-800">
          Ask a question
        </h2>
        {status !== "sent" && (
          <p className="mt-1.5 text-sm text-slate-500">Have a question about this piece? Send it to us and we&apos;ll reply by email.</p>
        )}

        {status === "sent" ? (
          <div role="status" className="mt-6 text-center">
            <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-green-50 text-success">
              <Icon name="check-circle" className="h-6 w-6" />
            </span>
            <p className="mb-1.5 text-xl font-bold text-slate-800">Thank you, {sent.firstName}!</p>
            <p className="text-sm leading-relaxed text-slate-500">
              We&apos;ve received your question about <span className="font-semibold text-slate-700">{product.title}</span> and
              will reply as soon as we can.
              {sent.confirmationSent && (
                <>
                  {" "}
                  A confirmation has been sent to <span className="font-semibold text-slate-700">{sent.email}</span>.
                </>
              )}
            </p>
            <button ref={doneRef} type="button" onClick={onClose} className={`mt-6 ${PRIMARY_BUTTON}`}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <Field id={fieldId("name")} label="Name" error={errors.name}>
              <input type="text" autoComplete="name" autoCapitalize="words" placeholder="Jane Doe" {...fieldProps("name")} />
            </Field>
            <Field id={fieldId("email")} label="Email Address" error={errors.email}>
              <IconField icon="mail">
                <input type="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" placeholder="you@example.com" {...fieldProps("email", "pl-10")} />
              </IconField>
            </Field>
            <Field id={fieldId("phone")} label="Phone Number" error={errors.phone}>
              <IconField icon="phone">
                <input type="tel" inputMode="tel" autoComplete="tel" placeholder="+1 213 290 9999" {...fieldProps("phone", "pl-10")} />
              </IconField>
            </Field>
            <Field id={fieldId("question")} label="Your Question" error={errors.question}>
              <textarea rows={5} placeholder="What would you like to know?" {...fieldProps("question", "h-32 resize-y py-3 leading-relaxed")} />
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

            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-error empty:hidden">
              {formError}
            </p>

            <button ref={submitRef} type="submit" disabled={sending} className={PRIMARY_BUTTON}>
              {sending ? "Sending…" : "Send Message"}
            </button>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white">
                {product.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug text-slate-800">{product.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{priceLabel}</p>
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
