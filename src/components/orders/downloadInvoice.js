// Fetches an order's invoice PDF and saves it through the browser. Used by the Edit
// Order page and the Orders list. Throws an Error whose message is fit to show to staff.
export async function downloadOrderInvoice(orderId, orderNumber) {
  const res = await fetch(`/api/orders/${orderId}/invoice`);
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error || "The invoice couldn't be created. Try again.");
  }

  const filename = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "")?.[1] || `invoice-${orderNumber}.pdf`;
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
