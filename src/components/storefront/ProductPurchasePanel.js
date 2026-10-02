"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StoreIcon from "./icons";
import StarRating from "./StarRating";
import { isMetalOption, metalColor } from "./metals";
import { useCart } from "./cart/CartProvider";
import { findVariant } from "./cart/cartHelpers";
import WishlistHeart from "./wishlist/WishlistHeart";
import AskQuestionModal from "./ask-question/AskQuestionModal";
import { formatCurrency } from "@/lib/currency";

const MINI_ACTION = "flex items-center gap-1.5 hover:text-[#ef9822] transition-colors";

// Rounded card whose title is a small bordered pill centered on the top edge.
function Section({ title, children }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="relative min-w-0 mb-6 rounded-xl border border-gray-200 px-5 pb-5 pt-7">
      <h2
        id={headingId}
        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-4 py-1 text-[13px] font-medium text-[#333333]"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

// Start on the first purchasable variant so the page never opens on "Out of stock".
function defaultSelection(product) {
  const first = product.variants.find((variant) => variant.available) || product.variants[0];
  return Object.fromEntries(product.options.map((option) => [option.name, first?.options[option.name] ?? option.values[0]]));
}

export default function ProductPurchasePanel({ product, currency, reviews, supportEmail = "" }) {
  const baseId = useId();
  const router = useRouter();
  const { addItem, ensureItem, closeCart } = useCart();
  const [selection, setSelection] = useState(() => defaultSelection(product));
  const [copied, setCopied] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const copiedTimer = useRef(null);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const hasVariants = product.variants.length > 0;
  const variant = hasVariants ? findVariant(product, selection) : null;
  const price = variant ? variant.price : product.price;
  const compareAtPrice = variant ? variant.compareAtPrice : product.compareAtPrice;
  const sku = variant?.sku || product.sku;

  let notice = "";
  if (hasVariants && !variant) notice = "This combination is currently unavailable.";
  else if (variant && !variant.available) notice = "This item is currently out of stock.";
  const canBuy = !notice;

  const select = (name, value) => setSelection((current) => ({ ...current, [name]: value }));

  // The selected variant (or the plain product) as a cart line.
  function cartLine() {
    return {
      productId: product.id,
      variantId: variant?.id ?? null,
      handle: product.handle,
      title: product.title,
      image: product.image,
      // In the product's own option order; the variant's keys come back from SQL in no fixed order.
      options: variant ? Object.fromEntries(product.options.map((option) => [option.name, variant.options[option.name]])) : {},
      sku,
      price,
      compareAtPrice: compareAtPrice > price ? compareAtPrice : null,
      maxQuantity: variant?.maxQuantity ?? null,
    };
  }

  // Adds the selected variant and opens the cart drawer.
  function addToCart() {
    if (!canBuy) return;
    addItem(cartLine());
  }

  // Puts the selected variant in the cart and goes straight to checkout, without
  // the drawer. The cart provider lives in the layout, so the line is still there
  // when the checkout page renders.
  function buyNow() {
    if (!canBuy || !ensureItem(cartLine())) return;
    closeCart();
    router.push("/checkout");
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // The visitor dismissed the share sheet, or clipboard access was blocked.
    }
  }

  const hasAbout = Boolean(sku) || product.attributes.length > 0;

  return (
    <div className="w-full lg:w-[45%] flex flex-col pt-1 sm:pt-4 lg:pr-8">
      <h1
        className="text-[34px] sm:text-[40px] font-normal text-[#333333] tracking-normal leading-tight mb-1"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        {product.title}
      </h1>

      <div className="text-[22px] font-medium text-[#555555] mb-3" aria-live="polite">
        <span>{formatCurrency(price, currency)}</span>
        {compareAtPrice > price && (
          <s className="ml-2 text-base font-normal text-gray-400" aria-label={`Was ${formatCurrency(compareAtPrice, currency)}`}>
            {formatCurrency(compareAtPrice, currency)}
          </s>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4">
        {reviews.count > 0 ? (
          <>
            <StarRating rating={reviews.average} />
            <span className="text-[12px] text-gray-400 font-medium ml-1">
              ({reviews.count} {reviews.count === 1 ? "Review" : "Reviews"})
            </span>
          </>
        ) : (
          <span className="text-[12px] text-gray-400 font-medium">No reviews yet</span>
        )}
      </div>

      {hasAbout && (
        <Section title="About Item">
          <dl className="text-[16px] text-[#555555] space-y-1.5">
            {sku && (
              <div>
                <dt className="inline">SKU: </dt>
                <dd className="inline text-gray-800 font-medium">{sku}</dd>
              </div>
            )}
            {product.attributes.map((attribute, index) => (
              <div key={`${attribute.label}-${index}`}>
                <dt className="inline">{attribute.label}: </dt>
                <dd className="inline text-gray-800 font-medium">{attribute.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {product.options.length > 0 && (
        <Section title="Customize">
          <div className="space-y-6">
            {product.options.map((option, index) => {
              const fieldId = `${baseId}-${index}`;
              const selected = selection[option.name];

              if (isMetalOption(option)) {
                return (
                  <div key={option.name} role="radiogroup" aria-labelledby={`${fieldId}-label`}>
                    <p id={`${fieldId}-label`} className="text-[16px] text-[#555555] mb-3">
                      {option.name}: <span className="text-gray-800 font-medium">{selected}</span>
                    </p>
                    <div className="flex flex-wrap gap-4">
                      {option.values.map((value) => {
                        const checked = selected === value;
                        return (
                          <label key={value} className="flex flex-col items-center gap-1.5 cursor-pointer group">
                            <input
                              type="radio"
                              name={fieldId}
                              value={value}
                              checked={checked}
                              onChange={() => select(option.name, value)}
                              className="peer sr-only"
                            />
                            <span
                              style={{ backgroundColor: metalColor(value) }}
                              className={`w-[22px] h-[22px] rounded-full ring-1 ring-offset-2 transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-[#ef9822] ${
                                checked ? "ring-gray-400" : "ring-transparent group-hover:ring-[#ef9822]"
                              }`}
                            />
                            <span className="max-w-[64px] text-center leading-tight text-[10px] text-gray-400 font-medium group-hover:text-[#ef9822] transition-colors">
                              {value}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <div key={option.name} role="radiogroup" aria-labelledby={`${fieldId}-label`}>
                  <p id={`${fieldId}-label`} className="text-[16px] text-[#555555] mb-3">
                    {option.name}: <span className="text-gray-800 font-medium">{selected}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {option.values.map((value) => {
                      const checked = selected === value;
                      return (
                        <label key={value} className="cursor-pointer">
                          <input
                            type="radio"
                            name={fieldId}
                            value={value}
                            checked={checked}
                            onChange={() => select(option.name, value)}
                            className="peer sr-only"
                          />
                          <span
                            className={`flex h-9 min-w-[36px] items-center justify-center rounded-[2px] border px-3 text-[14px] leading-tight transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#ef9822] peer-focus-visible:ring-offset-1 ${
                              checked
                                ? "border-[#1c3b6a] bg-[#1c3b6a] text-white"
                                : "border-gray-300 text-[#555555] hover:border-[#ef9822] hover:text-[#ef9822]"
                            }`}
                          >
                            {value}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <p role="status" className={`text-sm text-error ${notice ? "mb-3" : ""}`}>
        {notice}
      </p>

      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          onClick={addToCart}
          disabled={!canBuy}
          className="flex-1 py-3 bg-white border border-gray-300 rounded text-[18px] font-semibold text-gray-800 hover:border-[#ef9822] hover:text-[#ef9822] transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          Add To Cart
        </button>
        <WishlistHeart
          productId={product.id}
          variantId={variant?.id ?? null}
          title={product.title}
          className="w-[48px] h-[53px] flex-shrink-0 flex items-center justify-center border border-gray-300 rounded text-gray-400 hover:text-[#ef9822] hover:border-[#ef9822] transition-colors disabled:pointer-events-none"
          activeClassName="!text-[#ef9822] !border-[#ef9822]"
        />
        <button
          type="button"
          onClick={buyNow}
          disabled={!canBuy}
          className="flex-1 py-3.5 bg-[#4A4A4A] rounded text-[18px] font-semibold text-white hover:bg-[#ef9822] transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          Buy Now
        </button>
      </div>

      <div className="flex items-center gap-5 text-[14px] text-[#555555] font-medium mb-6 uppercase tracking-wider">
        <button type="button" onClick={() => setAskOpen(true)} aria-haspopup="dialog" className={MINI_ACTION}>
          <StoreIcon name="mail" className="w-[14px] h-[14px]" />
          Ask a question
        </button>
        <button type="button" onClick={share} className={MINI_ACTION}>
          <StoreIcon name="share" className="w-[14px] h-[14px]" />
          {copied ? "Link copied" : "Share"}
        </button>
        <span role="status" className="sr-only">
          {copied ? "Link copied to clipboard" : ""}
        </span>
      </div>

      {askOpen && (
        <AskQuestionModal
          product={{ title: product.title, handle: product.handle, image: product.image }}
          priceLabel={formatCurrency(price, currency)}
          supportEmail={supportEmail}
          onClose={() => setAskOpen(false)}
        />
      )}

      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-[#555555] mb-8 font-[500]">
        {[
          { icon: "refresh", label: "Free Returns" },
          { icon: "box", label: "Free Shipping in US" },
          { icon: "clock", label: "Finance Options Available" },
        ].map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <StoreIcon name={item.icon} className="w-4 h-4" />
            {item.label}
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-4 text-[14px] bg-white border border-gray-200 py-3.5 px-4 rounded">
        <span className="text-gray-500 uppercase tracking-wider font-medium">Safe &amp; Secure Checkout</span>
        <div
          role="img"
          aria-label="Accepted payment methods: Visa, PayPal, Mastercard, American Express"
          className="flex gap-1.5 ml-auto"
        >
          <div className="w-7 h-[18px] bg-[#0E4595] rounded flex items-center justify-center text-[7px] font-bold text-white italic">VISA</div>
          <div className="w-7 h-[18px] bg-[#0070BA] rounded flex items-center justify-center text-[7px] font-bold text-white italic">PayPal</div>
          <div className="w-7 h-[18px] bg-white border border-gray-200 rounded flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-[#EB001B] rounded-full mix-blend-multiply" />
            <div className="w-2.5 h-2.5 bg-[#F79E1B] rounded-full mix-blend-multiply -ml-1" />
          </div>
          <div className="w-7 h-[18px] bg-[#279FC8] rounded flex items-center justify-center text-[6px] font-bold text-white uppercase text-center leading-none">AMEX</div>
        </div>
      </div>
    </div>
  );
}
