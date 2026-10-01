import { CHECKOUT_CARD, CHECKOUT_CONTAINER, CHECKOUT_GRID } from "./checkoutStyles";

// Shimmer placeholder mirroring the checkout's body (stepper, the open Contact
// card, the two collapsed cards, the order summary), in the same frame as the
// real page. Shown by loading.js while the server page reads the store settings,
// and by CheckoutPage until the cart has been read from the browser. The header
// and footer are static, so they are rendered for real around it.
//
// Each bar sits in a slot as tall as the line of text it stands in for (the page
// uses a 1.5 line height), so the skeleton is as tall as the real page and the
// content doesn't jump when it replaces it.
function Bar({ className = "" }) {
  return <div className={`shimmer rounded ${className}`} />;
}

function Line({ slot, bar }) {
  return (
    <div className={`flex items-center ${slot}`}>
      <Bar className={bar} />
    </div>
  );
}

function Field({ label, className = "" }) {
  return (
    <div className={className}>
      <Line slot="mb-2 h-[21px]" bar={`h-3.5 ${label}`} />
      <div className="shimmer h-[52px] rounded-lg" />
    </div>
  );
}

function StepHeader({ title, subtitle }) {
  return (
    <div className="flex items-center gap-4 p-5 sm:p-7">
      <div className="shimmer h-7 w-7 flex-shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Line slot="h-[27px] sm:h-[30px]" bar={`h-5 ${title}`} />
        <Line slot="mt-0.5 h-[21px] sm:h-[22.5px]" bar={`h-3.5 ${subtitle}`} />
      </div>
      <Bar className="h-4 w-4 flex-shrink-0" />
    </div>
  );
}

function StepperStep({ last = false }) {
  return (
    <li className={`flex items-start ${last ? "" : "flex-1"}`}>
      <div className="flex w-[84px] flex-col items-center sm:w-[120px]">
        <div className="shimmer h-10 w-10 rounded-full sm:h-11 sm:w-11" />
        <Line slot="mt-2.5 h-[22.5px] sm:h-[25.5px]" bar="h-4 w-14 sm:h-[18px] sm:w-16" />
        {/* two lines on a phone, where "Delivery address" wraps */}
        <Line slot="mt-0.5 h-[36px] sm:h-[21px]" bar="h-3 w-16 sm:h-3.5 sm:w-20" />
      </div>
      {!last && <div aria-hidden="true" className="shimmer mt-[19px] h-0.5 flex-1 sm:mt-[21px]" />}
    </li>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex h-6 items-center justify-between gap-4">
      <Bar className={`h-4 ${label}`} />
      <Bar className={`h-4 ${value}`} />
    </div>
  );
}

// The first line is a short product name; on a phone both wrap, and the second one wraps on a desktop too.
const LINE_MIN_HEIGHT = ["min-h-[96px] sm:min-h-[80px]", "min-h-[96px]"];

export default function CheckoutSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={CHECKOUT_CONTAINER}>
      <span className="sr-only">Loading checkout…</span>

      <div className={CHECKOUT_GRID}>
        <div>
          <ol aria-hidden="true" className="mb-8 flex items-start">
            <StepperStep />
            <StepperStep />
            <StepperStep last />
          </ol>

          <div className="space-y-5">
            <div className={CHECKOUT_CARD}>
              <StepHeader title="w-48" subtitle="w-64 max-w-full" />
              <div className="px-5 pb-6 sm:px-7 sm:pb-8">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="w-20" />
                  <Field label="w-20" />
                </div>
                <Field label="w-28" className="mt-5" />
                <Field label="w-28" className="mt-5" />
                <div className="mt-6 flex min-h-[45px] items-center gap-3 sm:min-h-[22.5px]">
                  <div className="shimmer h-5 w-5 flex-shrink-0 rounded" />
                  <Bar className="h-4 w-64 max-w-full" />
                </div>
                <div className="shimmer mt-7 h-14 rounded-lg" />
              </div>
            </div>

            <div className={CHECKOUT_CARD}>
              <StepHeader title="w-44" subtitle="w-56 max-w-full" />
            </div>
            <div className={CHECKOUT_CARD}>
              <StepHeader title="w-48" subtitle="w-64 max-w-full" />
            </div>
          </div>
        </div>

        <div className={`${CHECKOUT_CARD} p-6 sm:p-8`}>
          <div className="flex h-[33px] items-center justify-between gap-4 sm:h-9">
            <Bar className="h-6 w-40" />
            <Bar className="h-4 w-16" />
          </div>

          <div className="mt-6 space-y-5">
            {LINE_MIN_HEIGHT.map((minHeight) => (
              <div key={minHeight} className={`flex items-start gap-4 ${minHeight}`}>
                <div className="shimmer h-20 w-20 flex-shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <Bar className="h-4 w-3/4" />
                  <Bar className="mt-2.5 h-3.5 w-1/2" />
                  <Bar className="mt-2.5 h-3.5 w-12" />
                </div>
                <Bar className="h-4 w-16 flex-shrink-0" />
              </div>
            ))}
          </div>

          <hr className="my-6 border-[#EEEEEE]" />
          <div className="flex gap-3">
            <div className="shimmer h-[52px] min-w-0 flex-1 rounded-lg" />
            <div className="shimmer h-[52px] w-24 flex-shrink-0 rounded-lg" />
          </div>

          <div className="mt-6 space-y-4">
            <SummaryRow label="w-32" value="w-20" />
            <SummaryRow label="w-20" value="w-12" />
            <SummaryRow label="w-28" value="w-16" />
          </div>

          <div className="mt-6 border-t border-[#EEEEEE] pt-6">
            <div className="flex h-9 items-center justify-between gap-4 sm:h-[39px]">
              <Bar className="h-6 w-16" />
              <Bar className="h-7 w-28" />
            </div>
          </div>

          <div className="mt-7 space-y-5 rounded-xl bg-[#FCF9F3] p-5 sm:p-6">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-4">
                <div className="shimmer h-8 w-8 flex-shrink-0 rounded-full" />
                <div className="flex-1">
                  <Line slot="h-[22.5px]" bar="h-4 w-28" />
                  <Line slot="h-[21px]" bar="h-3.5 w-40 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
