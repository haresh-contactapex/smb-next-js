// Loads Stripe.js once. Stripe requires it to be fetched from js.stripe.com on the
// page (it is not bundled), and only the publishable key is ever given to it.
let loading;

export function loadStripeJs() {
  if (typeof window === "undefined") return Promise.reject(new Error("Stripe.js needs a browser."));
  if (window.Stripe) return Promise.resolve(window.Stripe);

  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3";
      script.async = true;
      script.onload = () => (window.Stripe ? resolve(window.Stripe) : reject(new Error("Stripe.js did not load.")));
      script.onerror = () => {
        // Allow another attempt (e.g. after a dropped connection) instead of caching the failure.
        loading = undefined;
        script.remove();
        reject(new Error("Stripe.js could not be loaded."));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}
