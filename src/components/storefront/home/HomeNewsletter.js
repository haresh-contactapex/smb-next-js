"use client";

import { useRef, useState } from "react";
import Recaptcha from "@/components/auth/Recaptcha";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { normalizeNewsletterEmail, validateNewsletterEmail } from "@/lib/shared/newsletter";

const SEND_FAILED = "We couldn't subscribe you right now. Please try again.";

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
      setMessage(json.data?.alreadySubscribed ? "You're already subscribed. Thank you!" : "Thanks for subscribing! Check your inbox for a welcome email.");
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
          className="bg-[#ef9822] px-5 text-xs font-semibold text-white transition-colors hover:bg-[#d9861a] disabled:cursor-not-allowed disabled:opacity-70"
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
