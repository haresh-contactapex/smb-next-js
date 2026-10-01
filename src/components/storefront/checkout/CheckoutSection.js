import StoreIcon from "../icons";
import { CHECKOUT_CARD } from "./checkoutStyles";

// The circle at the left of a section header: an empty ring until the step is
// reached, a ringed gold dot while it is open, a gold check once it is saved.
function StatusMark({ state }) {
  if (state === "done") {
    return (
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#EF9822] text-white">
        <StoreIcon name="check" className="h-4 w-4 [stroke-width:2.5]" />
      </span>
    );
  }
  return (
    <span
      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 ${state === "open" ? "border-[#EF9822]" : "border-[#D9D9D9]"}`}
    >
      {state === "open" && <span className="h-3.5 w-3.5 rounded-full bg-[#EF9822]" />}
    </span>
  );
}

// One accordion card of the checkout. Closed, its subtitle becomes `summary`
// (what the visitor entered) once the step is saved. The panel is hidden rather
// than unmounted so nothing typed or flagged in it is lost when it collapses.
// A step that can't be opened yet (`locked`) stays inert until the one before it is saved.
export default function CheckoutSection({ id, title, subtitle, summary, open, done, locked, onOpen, children }) {
  const headingId = `${id}-heading`;
  const panelId = `${id}-panel`;
  const state = open ? "open" : done ? "done" : "idle";

  return (
    <section className={CHECKOUT_CARD} aria-labelledby={headingId}>
      <h2 id={headingId}>
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={open}
          aria-controls={panelId}
          aria-disabled={locked || undefined}
          title={locked ? "Complete the previous step first" : undefined}
          className={`flex w-full items-center gap-4 rounded-2xl p-5 text-left sm:p-7 ${locked ? "cursor-not-allowed" : ""} focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#EF9822]`}
        >
          <StatusMark state={state} />
          <span className="min-w-0 flex-1">
            <span className="block text-[18px] font-semibold text-[#222222] sm:text-[20px]">{title}</span>
            <span className="mt-0.5 block truncate text-[14px] text-[#777777] sm:text-[15px]">{open || !done ? subtitle : summary}</span>
          </span>
          <StoreIcon name={open ? "chevronUp" : "chevronRight"} className="h-5 w-5 flex-shrink-0 text-[#555555]" />
        </button>
      </h2>

      <div id={panelId} hidden={!open} className="px-5 pb-6 sm:px-7 sm:pb-8">
        {children}
      </div>
    </section>
  );
}
