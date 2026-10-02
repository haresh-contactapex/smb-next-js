import { CARD_BRAND_LABELS, formatExpiry } from "./cardHelpers";

// The masked number as printed on the card face: only the last four digits are
// ever known here. American Express cards are 4-6-5, the rest 4-4-4-4.
function maskedNumber(brand, last4) {
  return brand === "amex" ? `•••• •••••• •${last4}` : `•••• •••• •••• ${last4}`;
}

// A card drawn as a card: dark face, brand, masked number, name and expiry.
// An expired card is greyed out. Decorative; the details are repeated as text
// next to it for screen readers (see PaymentMethods).
export default function CardTile({ card }) {
  return (
    <div
      aria-hidden="true"
      className={`relative flex aspect-[1.65] w-full max-w-[380px] flex-col justify-between overflow-hidden rounded-2xl p-5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.14)] ${
        card.expired ? "bg-gradient-to-br from-gray-400 to-gray-500" : "bg-gradient-to-br from-[#4A4A4A] to-[#242424]"
      }`}
    >
      <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/[0.06]" />
      <span className="pointer-events-none absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-white/[0.05]" />

      <div className="relative flex items-start justify-between">
        <span className="h-7 w-10 rounded-md bg-gradient-to-br from-[#f6d98a] to-[#c9972b] opacity-90" />
        <span className="text-[13px] font-semibold uppercase tracking-[0.14em]">{CARD_BRAND_LABELS[card.brand] || "Card"}</span>
      </div>

      <p className="relative whitespace-nowrap font-mono text-[15px] tracking-[0.08em] xl:text-[18px] xl:tracking-[0.1em]">{maskedNumber(card.brand, card.last4)}</p>

      <div className="relative flex items-end justify-between gap-3 text-[12px]">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-white/60">Name on card</p>
          <p className="truncate font-medium uppercase tracking-wide">{card.holderName}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-wider text-white/60">Expires</p>
          <p className="font-mono font-medium">{formatExpiry(card.expMonth, card.expYear)}</p>
        </div>
      </div>
    </div>
  );
}
