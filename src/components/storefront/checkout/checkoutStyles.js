// Class strings for the checkout page. Its palette (a warm gold on white, soft
// bordered cards) follows the checkout design rather than the orange accent
// used by the rest of the storefront.
export const CHECKOUT_CARD = "rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.05)]";

export const CHECKOUT_LABEL = "mb-2 block text-[14px] font-medium text-[#333333]";

export const CHECKOUT_FIELD_BOX =
  "rounded-lg border border-[#E4E4E4] bg-white transition-colors hover:border-[#AF8C5A]/60 focus-within:border-[#AF8C5A] focus-within:ring-1 focus-within:ring-[#AF8C5A]";

export const CHECKOUT_FIELD = `w-full px-4 py-3.5 text-[15px] text-[#333333] placeholder:text-[#B5B5B5] outline-none ${CHECKOUT_FIELD_BOX}`;

// Matches the pink fill + red border the storefront uses for invalid fields.
export const CHECKOUT_FIELD_ERROR = "!border-error !bg-error/5";

export const CHECKOUT_BUTTON =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-[#AF8C5A] px-6 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#9B7A49] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AF8C5A] disabled:pointer-events-none disabled:opacity-50";
