import StoreIcon from "../icons";

// Contact -> Billing -> Payment progress at the top of the checkout. `statuses`
// maps a step id to "complete", "current" or "upcoming". The line leading out of
// a step is gold once that step is saved and partly gold while it is the open one.
export default function CheckoutStepper({ steps, statuses }) {
  return (
    <ol aria-label="Checkout progress" className="mb-8 flex items-start">
      {steps.map((step, index) => {
        const status = statuses[step.id];
        const isLast = index === steps.length - 1;
        return (
          <li key={step.id} className={`flex items-start ${isLast ? "" : "flex-1"}`} aria-current={status === "current" ? "step" : undefined}>
            <div className="flex w-[84px] flex-col items-center text-center sm:w-[120px]">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full border text-[16px] font-semibold sm:h-11 sm:w-11 ${
                  status === "upcoming" ? "border-[#D9D9D9] bg-white text-[#555555]" : "border-[#EF9822] bg-[#EF9822] text-white"
                }`}
              >
                {status === "complete" ? <StoreIcon name="check" className="h-5 w-5 [stroke-width:2.5]" /> : index + 1}
              </span>
              <span className="mt-2.5 text-[15px] font-semibold text-[#222222] sm:text-[17px]">{step.title}</span>
              <span className="mt-0.5 text-[12px] text-[#9A9A9A] sm:text-[14px]">{step.caption}</span>
              <span className="sr-only">{status === "complete" ? "(completed)" : status === "current" ? "(current step)" : ""}</span>
            </div>

            {!isLast && (
              <span aria-hidden="true" className="relative mt-[19px] h-0.5 flex-1 bg-[#E6E6E6] sm:mt-[21px]">
                <span
                  className="absolute inset-y-0 left-0 bg-[#EF9822]"
                  style={{ width: status === "complete" ? "100%" : status === "current" ? "18%" : "0%" }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
