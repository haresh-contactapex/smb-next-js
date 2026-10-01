import StoreIcon from "../icons";

const BADGE = "flex h-11 w-[72px] items-center justify-center rounded-lg border border-[#E6E6E6] bg-white shadow-sm";

// The accepted-payment strip from the checkout design. These are fixed marks,
// not read from Settings -> Payment: trim the list to what the store's gateway
// actually takes once payments go live.
const PAYMENT_BADGES = [
  { label: "Visa", mark: <span className="text-[19px] font-extrabold italic tracking-tight text-[#1A1F71]">VISA</span> },
  {
    label: "Mastercard",
    mark: (
      <span className="flex items-center">
        <span className="h-6 w-6 rounded-full bg-[#EB001B]" />
        <span className="-ml-2.5 h-6 w-6 rounded-full bg-[#F79E1B]/90" />
      </span>
    ),
  },
  { label: "American Express", mark: <span className="text-[16px] font-extrabold tracking-tight text-[#006FCF]">AMEX</span> },
  {
    label: "PayPal",
    mark: (
      <span className="text-[15px] font-extrabold italic tracking-tight">
        <span className="text-[#003087]">Pay</span>
        <span className="text-[#009CDE]">Pal</span>
      </span>
    ),
  },
  { label: "Apple Pay", mark: <span className="whitespace-nowrap text-[13px] font-semibold text-black">Apple Pay</span> },
];

// The checkout's own footer: encryption note and the accepted payment marks.
export default function CheckoutFooter() {
  return (
    <footer className="border-t border-[#EFEFEF] bg-white">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-center gap-6 px-4 py-8 sm:flex-row sm:gap-12 sm:px-8">
        <div className="flex items-center gap-3">
          <StoreIcon name="lockClosed" className="h-10 w-10 text-[#9E9E9E] [stroke-width:1.25]" />
          <p>
            <span className="block text-[15px] font-semibold uppercase tracking-wide text-[#333333]">SSL Secure</span>
            <span className="block text-[14px] text-[#777777]">Encrypted Payments</span>
          </p>
        </div>

        <ul aria-label="Accepted payment methods" className="flex flex-wrap items-center justify-center gap-3">
          {PAYMENT_BADGES.map((badge) => (
            <li key={badge.label} className={BADGE} aria-label={badge.label} title={badge.label}>
              <span aria-hidden="true">{badge.mark}</span>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
