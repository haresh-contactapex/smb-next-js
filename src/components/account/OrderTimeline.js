import StoreIcon from "../storefront/icons";
import { CARD } from "./accountStyles";
import { ORDER_STATUS_HELP, ORDER_STEPS, ORDER_STEP_LABELS, formatDate, orderStepIndex } from "./accountHelpers";

// Where the order is: placed -> processing -> completed, with the current step
// highlighted and a one-line explanation. A cancelled order replaces the tracker
// with a notice, since it won't move further. Only the placed and cancelled dates
// are known, so no other step is given one.
export default function OrderTimeline({ order }) {
  if (order.status === "Cancelled") {
    return (
      <section aria-label="Order progress" className={`${CARD} flex items-start gap-3.5 p-5`}>
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-gray-100 text-gray-500">
          <StoreIcon name="close" className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-[#333333]">Order cancelled{order.cancelledAt ? ` on ${formatDate(order.cancelledAt)}` : ""}</p>
          <p className="mt-0.5 text-[13.5px] text-gray-500">
            {order.paymentStatus === "Refunded"
              ? "Your payment has been refunded to your original payment method. It can take 5 to 10 business days to appear on your statement."
              : order.paymentStatus === "Paid"
                ? "You paid for this order, so the store will refund your payment to your original payment method and be in touch to confirm."
                : "You haven't been charged for this order."}
          </p>
        </div>
      </section>
    );
  }

  const current = orderStepIndex(order.status);

  return (
    <section aria-label="Order progress" className={`${CARD} p-5 sm:p-6`}>
      <ol className="grid grid-cols-3">
        {ORDER_STEPS.map((step, index) => {
          // Placing the order is always done; "Processing" is the live step while it is being prepared.
          const done = index === 0 || index < current || (index === current && order.status === "Completed");
          const active = index === current && !done;
          return (
            <li key={step} className="relative flex flex-col items-center text-center" aria-current={index === current ? "step" : undefined}>
              {index > 0 && (
                <span aria-hidden="true" className={`absolute right-1/2 top-[17px] h-0.5 w-full ${index <= current ? "bg-[#4A4A4A]" : "bg-gray-200"}`} />
              )}
              <span
                className={`relative z-10 grid h-9 w-9 place-items-center rounded-full text-[13px] font-semibold ${
                  done ? "bg-[#4A4A4A] text-white" : active ? "bg-[#ef9822] text-white ring-4 ring-[#ef9822]/20" : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? <StoreIcon name="check" className="h-[18px] w-[18px]" /> : index + 1}
              </span>
              <span className={`mt-2 text-[13px] font-semibold ${index <= current ? "text-[#333333]" : "text-gray-400"}`}>{ORDER_STEP_LABELS[step]}</span>
              {index === 0 && <span className="text-[12px] text-gray-400">{formatDate(order.placedAt)}</span>}
            </li>
          );
        })}
      </ol>
      <p className="mt-5 border-t border-gray-100 pt-4 text-center text-[14px] text-[#555555]">{ORDER_STATUS_HELP[order.status]}</p>
    </section>
  );
}
