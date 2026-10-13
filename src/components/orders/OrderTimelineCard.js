import Icon from "@/components/admin-panel/Icon";
import { CARD } from "./OrderDetailsSections";
import {
  CANCELLED_PAYMENT_NOTES,
  CANCELLED_UNPAID_NOTE,
  ORDER_STATUS_NOTES,
  ORDER_STEPS,
  ORDER_STEP_LABELS,
} from "./orderHelpers";

// Where the order is: placed -> processing -> completed, with the current step
// highlighted and a line of context. A cancelled order replaces the tracker with a
// notice, since it won't move further. Only the placed and cancelled dates are
// known, so no other step is given one. Mirrors the customer's own order page.
export default function OrderTimelineCard({ order }) {
  if (order.status === "Cancelled") {
    return (
      <section aria-label="Order progress" className={`${CARD} flex items-start gap-3.5`}>
        <span className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-error/10 text-error">
          <Icon name="x-circle" className="w-5 h-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-white">
            Order cancelled{order.cancelledDate ? ` on ${order.cancelledDate}` : ""}
          </p>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {CANCELLED_PAYMENT_NOTES[order.payment] || CANCELLED_UNPAID_NOTE}
          </p>
        </div>
      </section>
    );
  }

  const current = ORDER_STEPS.indexOf(order.status);

  return (
    <section aria-label="Order progress" className={CARD}>
      <ol className="grid grid-cols-3">
        {ORDER_STEPS.map((step, index) => {
          // Placing the order is always done; "Processing" is the live step while it is being prepared.
          const done = index === 0 || index < current || (index === current && order.status === "Completed");
          const active = index === current && !done;
          return (
            <li key={step} className="relative flex flex-col items-center text-center" aria-current={index === current ? "step" : undefined}>
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute right-1/2 top-[17px] h-0.5 w-full ${index <= current ? "bg-primary-500 dark:bg-accent-500" : "bg-slate-200 dark:bg-white/10"}`}
                />
              )}
              <span
                className={`relative z-10 w-9 h-9 grid place-items-center rounded-full text-[13px] font-semibold ${
                  done
                    ? "bg-primary-500 dark:bg-accent-500 text-white"
                    : active
                      ? "bg-accent-500 text-white ring-4 ring-accent-500/20"
                      : "bg-slate-100 dark:bg-white/10 text-slate-400"
                }`}
              >
                {done ? <Icon name="check" className="w-[18px] h-[18px]" /> : index + 1}
              </span>
              <span className={`mt-2 text-[13px] font-semibold ${index <= current ? "text-slate-800 dark:text-white" : "text-slate-400"}`}>
                {ORDER_STEP_LABELS[step]}
              </span>
              {index === 0 && <span className="text-xs text-slate-400">{order.date}</span>}
            </li>
          );
        })}
      </ol>
      <p className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 text-center text-sm text-slate-500 dark:text-slate-400">
        {ORDER_STATUS_NOTES[order.status]}
      </p>
    </section>
  );
}
