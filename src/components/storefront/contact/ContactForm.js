"use client";

import { useEffect, useId, useRef, useState } from "react";
import Icon from "@/components/admin-panel/Icon";
import { CONTACT_FIELDS, CONTACT_LIMITS, EMPTY_CONTACT, normalizeContact, validateContact } from "./helpers";

const DEFAULT_FALLBACK_EMAIL = "info@shopmyband.com";
const SEND_FAILED = "We couldn't send your message. Please try again.";

// Every field has a real <label> (screen-reader only) because the placeholder is the visible hint.
const LABELS = { name: "Name", email: "Email address", phone: "Phone number", message: "Message" };
const PLACEHOLDERS = {
  name: "What's your good name?",
  email: "Enter your email address",
  phone: "Enter your phone number",
  message: "Enter your message",
};
const ICONS = { name: "user", email: "mail", phone: "phone", message: "message-square" };

// Borderless control with a thin rule underneath. The storefront is light-only, so the colors are
// fixed rather than following the admin's dark mode. The placeholder is the only visible hint, so
// it is dark enough to read (#767676 on white is 4.5:1). Focus darkens and thickens the rule.
const CONTROL =
  "block w-full min-w-0 appearance-none rounded-none border-0 border-b bg-transparent py-[18px] pl-0 pr-9 text-base leading-6 text-[#333333] placeholder:text-[#767676] focus:outline-none disabled:opacity-60";
const CONTROL_OK = "border-[#e0e0e0] focus:border-[#333333] focus:shadow-[0_1px_0_0_#333333]";
const CONTROL_INVALID = "border-error focus:border-error focus:shadow-[0_1px_0_0_#dc2626]";

const SUBMIT_BUTTON =
  "inline-flex h-14 max-w-full items-center justify-center rounded-sm bg-[#333333] px-8 text-base text-white transition-colors hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#333333] disabled:opacity-60";

// Label (hidden), control with its icon at the right end, message underneath.
function Field({ id, name, error, children }) {
  return (
    <div>
      <label className="sr-only" htmlFor={id}>
        {LABELS[name]}
      </label>
      <div className="relative">
        {children}
        {/* Lines up with the first line of the control, so it sits at the top of the message box. */}
        <span aria-hidden="true" className="pointer-events-none absolute right-0.5 top-0 flex h-[60px] items-center text-[#333333]">
          <Icon name={ICONS[name]} className="h-[18px] w-[18px] [stroke-width:1.5]" />
        </span>
      </div>
      <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-error empty:hidden">
        {error}
      </p>
    </div>
  );
}

// The storefront Contact form: name, email, phone and a message, rendered inline (a CMS page
// mounts it in its right-hand column). Posts to /api/contact, which emails the store and sends the
// visitor a confirmation copy. `fallbackEmail` is offered when the problem is on our side.
export default function ContactForm({ fallbackEmail = DEFAULT_FALLBACK_EMAIL }) {
  const baseId = useId();
  const fieldRefs = useRef({});
  const doneRef = useRef(null);
  const submitRef = useRef(null);
  const submittingRef = useRef(false);

  const [values, setValues] = useState(EMPTY_CONTACT);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null); // { text, offerEmail } | null
  const [status, setStatus] = useState("idle"); // "idle" | "sending" | "sent"
  const [sent, setSent] = useState({ firstName: "", email: "", confirmationSent: false });

  const fieldId = (name) => `${baseId}-${name}`;
  const sending = status === "sending";

  // The form unmounts on success, so hand focus to the thank-you message.
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

    const cleaned = normalizeContact(values);
    const found = validateContact(cleaned);
    setErrors(found);
    setFormError(null);
    const firstInvalid = CONTACT_FIELDS.find((name) => found[name]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }

    submittingRef.current = true;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cleaned, honeypot }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        // The fallback address is offered when the problem is on our side rather than in what they typed.
        setFormError({ text: json?.error || SEND_FAILED, offerEmail: res.status >= 500 });
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
      setFormError({ text: SEND_FAILED, offerEmail: true });
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
    maxLength: CONTACT_LIMITS[name],
    placeholder: PLACEHOLDERS[name],
    "aria-required": "true",
    "aria-invalid": errors[name] ? "true" : undefined,
    "aria-describedby": errors[name] ? `${fieldId(name)}-error` : undefined,
    className: `${CONTROL} ${errors[name] ? CONTROL_INVALID : CONTROL_OK} ${extra}`,
  });

  if (status === "sent") {
    return (
      <div ref={doneRef} tabIndex={-1} role="status" className="break-words text-[#555555] outline-none">
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-green-50 text-success">
          <Icon name="check-circle" className="h-6 w-6" />
        </span>
        <p className="text-base leading-relaxed">
          Thank you, {sent.firstName}. We&apos;ve received your message and will reply soon.
          {sent.confirmationSent && (
            <>
              {" "}
              A confirmation has been sent to <span className="font-semibold text-[#333333]">{sent.email}</span>.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Contact us" aria-busy={sending} className="relative w-full min-w-0 text-[#333333]">
      <Field id={fieldId("name")} name="name" error={errors.name}>
        <input type="text" autoComplete="name" autoCapitalize="words" {...fieldProps("name")} />
      </Field>
      <Field id={fieldId("email")} name="email" error={errors.email}>
        <input type="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" {...fieldProps("email")} />
      </Field>
      <Field id={fieldId("phone")} name="phone" error={errors.phone}>
        <input type="tel" inputMode="tel" autoComplete="tel" {...fieldProps("phone")} />
      </Field>
      <Field id={fieldId("message")} name="message" error={errors.message}>
        <textarea rows={4} {...fieldProps("message", "h-32 resize-none")} />
      </Field>

      {/* Honeypot: invisible to people and assistive tech, tempting to bots; the server drops a
          submission that fills it. Its name avoids anything browser autofill recognises ("website",
          "url"), which would make a real visitor's message vanish. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" name="hp_contact" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
        </label>
      </div>

      <p role="alert" className="mt-6 break-words rounded-sm border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-error empty:hidden">
        {formError && (
          <>
            {formError.text}
            {formError.offerEmail && fallbackEmail && (
              <>
                {" "}
                You can also email us at{" "}
                <a href={`mailto:${fallbackEmail}`} className="font-semibold underline underline-offset-2">
                  {fallbackEmail}
                </a>
                .
              </>
            )}
          </>
        )}
      </p>

      <button ref={submitRef} type="submit" disabled={sending} className={`mt-8 ${SUBMIT_BUTTON}`}>
        {sending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
