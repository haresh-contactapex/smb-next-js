import { orderStatusStyle, paymentStatusStyle } from "./accountHelpers";

const BADGE = "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ring-inset";

export function OrderStatusBadge({ status }) {
  return <span className={`${BADGE} ${orderStatusStyle(status)}`}>{status}</span>;
}

export function PaymentStatusBadge({ status }) {
  return <span className={`${BADGE} ${paymentStatusStyle(status)}`}>{status}</span>;
}
