// Checkout isn't built on the storefront yet (Buy Now is inert for the same
// reason), so this stays disabled until there is a checkout to go to.
export default function CartCheckoutButton({ label = "Checkout", className = "" }) {
  return (
    <button
      type="button"
      disabled
      title="Checkout is coming soon"
      className={`w-full rounded bg-[#4A4A4A] py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-[#ef9822] disabled:opacity-50 disabled:pointer-events-none ${className}`}
    >
      {label}
    </button>
  );
}
