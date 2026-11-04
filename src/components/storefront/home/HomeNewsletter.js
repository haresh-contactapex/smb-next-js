"use client";

import { useEffect, useRef, useState } from "react";
import Recaptcha from "@/components/auth/Recaptcha";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { normalizeNewsletterEmail, validateNewsletterEmail } from "@/lib/shared/newsletter";

const SEND_FAILED = "We couldn't subscribe you right now. Please try again.";
const DISPLAY = { fontFamily: "var(--font-display), serif" };

// What the visitor sees once the address is saved, in place of the form. `already` is true when
// the address was on the list before, so the card never claims to have sent a welcome email then.
function SubscribedCard({ email, already, onReset }) {
  const headingRef = useRef(null);
  const [shown, setShown] = useState(false);

  // Fade the card in, and move focus to it so a screen reader announces the result.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    headingRef.current?.focus();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      role="status"
      className={`mx-auto mt-6 w-full max-w-md border border-[#e6dfd2] border-t-[3px] border-t-[#d4920a] bg-white px-6 py-7 text-center shadow-[0_8px_24px_rgba(51,51,51,0.06)] transition-all duration-500 ease-out motion-reduce:transition-none ${
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <span
        className={`mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#d4920a] text-white transition-transform delay-150 duration-500 ease-out motion-reduce:transition-none ${
          shown ? "scale-100" : "scale-50"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <h3 ref={headingRef} tabIndex={-1} className="mt-4 text-[22px] font-normal leading-tight text-[#333333] outline-none" style={DISPLAY}>
        {already ? "You're already subscribed" : "You're on the list!"}
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-[#555555]">
        {already ? (
          <>
            <strong className="break-all font-semibold text-[#333333]">{email}</strong> is already on our list. Keep an eye on your inbox for our next discounts and offers.
          </>
        ) : (
          <>
            Thank you for subscribing. Watch your inbox at <strong className="break-all font-semibold text-[#333333]">{email}</strong> for a welcome note and our latest discounts and offers.
          </>
        )}
      </p>
      <button type="button" onClick={onReset} className="mt-4 text-xs font-semibold text-[#b87c06] underline underline-offset-4 transition-colors hover:text-[#d4920a]">
        Use a different email
      </button>
    </div>
  );
}

// "Stay in the Loop" signup. Posts to /api/newsletter, which stores the address, emails the
// subscriber a welcome message and tells the store about the new subscriber.
export default function HomeNewsletter() {
  // The Google reCAPTCHA box shows only when Settings -> Security and Settings -> Integrations both turn it on.
  const { enableRecaptcha } = useGeneralSettings();
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [recaptchaKey, setRecaptchaKey] = useState(0); // remounting the widget gives a fresh challenge
  const [message, setMessage] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(null); // { email, already } once the signup succeeded
  const submittingRef = useRef(false);

  // A token works once, so a failed attempt needs a new challenge.
  function resetRecaptcha() {
    setRecaptchaToken("");
    setRecaptchaKey((key) => key + 1);
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;

    const cleaned = normalizeNewsletterEmail(email);
    const problem = validateNewsletterEmail(cleaned) || (enableRecaptcha && !recaptchaToken ? "Please complete the reCAPTCHA verification." : "");
    setInvalid(Boolean(problem));
    setMessage(problem);
    if (problem) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleaned, honeypot, recaptchaToken }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setInvalid(true);
        setMessage(json?.error || SEND_FAILED);
        resetRecaptcha();
        return;
      }
      setInvalid(false);
      setMessage("");
      setSubscribed({ email: cleaned, already: Boolean(json.data?.alreadySubscribed) });
      setEmail("");
      resetRecaptcha();
    } catch {
      setInvalid(true);
      setMessage(SEND_FAILED);
      resetRecaptcha();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (subscribed) return <SubscribedCard email={subscribed.email} already={subscribed.already} onReset={() => setSubscribed(null)} />;

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto mt-6 w-full max-w-md">
      <div className="flex border border-[#d9d9d9] bg-white p-1">
        <label htmlFor="home-newsletter-email" className="sr-only">Email address</label>
        <input
          id="home-newsletter-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email Address"
          autoComplete="email"
          aria-invalid={invalid}
          aria-describedby="home-newsletter-message"
          className="min-w-0 flex-1 px-3 py-2 text-sm text-[#333333] outline-none placeholder:text-[#999999]"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-[#d4920a] px-5 text-xs font-semibold text-white transition-colors hover:bg-[#b87c06] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Subscribing…" : "Subscribe"}
        </button>
      </div>

      {/* Honeypot: invisible to people and assistive tech, tempting to bots; the server drops a
          submission that fills it. Its name avoids anything browser autofill recognises. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" name="hp_newsletter" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
        </label>
      </div>

      {enableRecaptcha && (
        <div className="mt-3 flex justify-center">
          <Recaptcha key={recaptchaKey} theme="light" onChange={setRecaptchaToken} />
        </div>
      )}

      <p id="home-newsletter-message" role="status" className={`mt-2 min-h-[1.25rem] text-xs ${invalid ? "text-red-600" : "text-[#555555]"}`}>
        {message}
      </p>
    </form>
  );
}
