// Class strings for the account area. It reuses the checkout's field and card
// styling (soft bordered white cards, orange #ef9822 highlight) so the two read
// as one storefront. The account area is light-only, like the rest of the storefront.
import { CHECKOUT_CARD, CHECKOUT_FIELD, CHECKOUT_FIELD_ERROR, CHECKOUT_LABEL } from "../storefront/checkout/checkoutStyles";

export { CHECKOUT_FIELD as FIELD, CHECKOUT_FIELD_ERROR as FIELD_ERROR, CHECKOUT_LABEL as LABEL };

export const CARD = CHECKOUT_CARD;

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg text-[14px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EF9822] disabled:pointer-events-none disabled:opacity-50";

export const BTN_PRIMARY = `${BUTTON_BASE} bg-[#EF9822] px-6 py-3 text-white hover:bg-[#D9850F]`;
export const BTN_DARK = `${BUTTON_BASE} bg-[#4A4A4A] px-6 py-3 text-white hover:bg-[#ef9822]`;
export const BTN_OUTLINE = `${BUTTON_BASE} border border-gray-300 bg-white px-5 py-2.5 text-[#333333] hover:border-[#ef9822] hover:text-[#ef9822]`;
export const BTN_DANGER = `${BUTTON_BASE} border border-red-200 bg-white px-5 py-2.5 text-red-600 hover:border-red-400 hover:bg-red-50`;
export const BTN_DANGER_SOLID = `${BUTTON_BASE} bg-red-600 px-6 py-3 text-white hover:bg-red-700`;

// A quiet text button for in-card actions ("Edit", "Remove").
export const BTN_TEXT =
  "inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:text-[#ef9822] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EF9822] disabled:pointer-events-none disabled:opacity-50";
export const BTN_TEXT_DANGER = BTN_TEXT.replace("hover:text-[#ef9822]", "hover:text-red-500");

export const TEXT_LINK = "font-semibold text-[#333333] underline transition-colors hover:text-[#ef9822]";

export const HEADING_FONT = { fontFamily: "var(--font-playfair), serif" };
