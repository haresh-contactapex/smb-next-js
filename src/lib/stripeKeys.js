// The shapes of the Stripe credentials saved in Settings -> Payment. Pure and free of
// server code, so the admin form can use it to catch a wrongly pasted key when it is
// saved and the server uses the very same rules to decide whether a key is usable.

export const PUBLISHABLE_KEY = /^pk_(test|live)_[A-Za-z0-9]+$/;
// A restricted key (rk_) works for PaymentIntents too, so it is accepted alongside sk_.
export const SECRET_KEY = /^(?:sk|rk)_(test|live)_[A-Za-z0-9]+$/;
// The signing secret is an opaque token, so only the prefix and a plausible length are checked
// (this guards against pasting the wrong thing; it is not a security boundary).
export const WEBHOOK_SECRET = /^whsec_[A-Za-z0-9+/=_-]{8,}$/;

// What is wrong with the saved Stripe credentials, as { fieldKey: message } for the
// admin form's fields. A blank field is never an error here (it just isn't set up yet);
// only a value that is there but the wrong kind of key, or a publishable and secret key
// from different modes (test vs live), is.
export function stripeKeyErrors({ stripePublishableKey = "", stripeSecretKey = "", stripeWebhookSecret = "" }) {
  const errors = {};
  const publishable = stripePublishableKey.trim();
  const secret = stripeSecretKey.trim();
  const webhook = stripeWebhookSecret.trim();

  if (publishable && !PUBLISHABLE_KEY.test(publishable)) {
    errors.stripePublishableKey = /^(?:sk|rk)_/.test(publishable)
      ? "That is a secret key. The publishable key starts with pk_test_ or pk_live_."
      : "Enter a Stripe publishable key. It starts with pk_test_ or pk_live_.";
  }
  if (secret && !SECRET_KEY.test(secret)) {
    errors.stripeSecretKey = /^pk_/.test(secret)
      ? "That is the publishable key. The secret key starts with sk_test_ or sk_live_."
      : "Enter a Stripe secret key. It starts with sk_test_ or sk_live_.";
  }
  if (webhook && !WEBHOOK_SECRET.test(webhook)) {
    errors.stripeWebhookSecret = /^(?:pk|sk|rk)_/.test(webhook)
      ? "That is an API key, not the webhook signing secret. The signing secret starts with whsec_."
      : "Enter the signing secret of your Stripe webhook. It starts with whsec_.";
  }

  const publishableMode = PUBLISHABLE_KEY.exec(publishable)?.[1];
  const secretMode = SECRET_KEY.exec(secret)?.[1];
  if (publishableMode && secretMode && publishableMode !== secretMode) {
    errors.stripeSecretKey = `This is a ${secretMode} key but the publishable key is a ${publishableMode} key. Use keys from the same mode.`;
  }
  return errors;
}
