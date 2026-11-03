"use client";

import { useState } from "react";

// "Stay in the Loop" signup. There is no subscription endpoint yet, so a valid address
// is only acknowledged, not stored.
export default function HomeNewsletter() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [invalid, setInvalid] = useState(false);

  function onSubmit(event) {
    event.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    setInvalid(!valid);
    setMessage(valid ? "Subscriptions are opening soon. Please check back." : "Enter a valid email address.");
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
        <button type="submit" className="bg-[#ef9822] px-5 text-xs font-semibold text-white transition-colors hover:bg-[#d9861a]">
          Subscribe
        </button>
      </div>
      <p id="home-newsletter-message" role="status" className={`mt-2 min-h-[1.25rem] text-xs ${invalid ? "text-red-600" : "text-[#555555]"}`}>
        {message}
      </p>
    </form>
  );
}
