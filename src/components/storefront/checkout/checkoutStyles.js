// Class strings for the checkout page: soft bordered cards on white, with the
// storefront's orange accent (#ef9822) as the highlight colour.
export const CHECKOUT_CARD = "rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.05)]";

export const CHECKOUT_LABEL = "mb-2 block text-[14px] font-medium text-[#333333]";

export const CHECKOUT_FIELD_BOX =
  "rounded-lg border border-[#E4E4E4] bg-white transition-colors hover:border-[#EF9822]/60 focus-within:border-[#EF9822] focus-within:ring-1 focus-within:ring-[#EF9822]";

export const CHECKOUT_FIELD = `w-full px-4 py-3.5 text-[15px] text-[#333333] placeholder:text-[#B5B5B5] outline-none ${CHECKOUT_FIELD_BOX}`;

// Matches the pink fill + red border the storefront uses for invalid fields.
export const CHECKOUT_FIELD_ERROR = "!border-error !bg-error/5";

export const CHECKOUT_BUTTON =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-[#EF9822] px-6 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#D9850F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EF9822] disabled:pointer-events-none disabled:opacity-50";
