"use client";

import { useEffect, useId, useRef, useState } from "react";
import StoreIcon from "./icons";
import StarRating from "./StarRating";
import { metalColor } from "./metals";
import { formatCurrency } from "@/lib/currency";

const FIELDSET = "border border-gray-200 rounded px-5 pb-5 pt-1 mb-6 min-w-0";
const LEGEND = "px-2 text-[16px] font-semibold text-[#333333]";
const MINI_ACTION = "flex items-center gap-1.5 hover:text-[#ef9822] transition-colors";
const METAL_OPTION = /colou?r|metal/i;

// Start on the first purchasable variant so the page never opens on "Out of stock".
function defaultSelection(product) {
  const first = product.variants.find((variant) => variant.available) || product.variants[0];
  return Object.fromEntries(product.options.map((option) => [option.name, first?.options[option.name] ?? option.values[0]]));
}

function findVariant(product, selection) {
  return product.variants.find((variant) => product.options.every((option) => variant.options[option.name] === selection[option.name]));
}

// A color/metal option becomes swatches only when every value is a recognizable metal.
function isMetalOption(option) {
  return METAL_OPTION.test(option.name) && option.values.every((value) => metalColor(value));
}

export default function ProductPurchasePanel({ product, currency, reviews, supportEmail = "" }) {
  const baseId = useId();
  const [selection, setSelection] = useState(() => defaultSelection(product));
  const [copied, setCopied] = useState(false);
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
        <fieldset className={FIELDSET}>
          <legend className={LEGEND}>About Item</legend>
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
        </fieldset>
      )}

      {product.options.length > 0 && (
        <fieldset className={FIELDSET}>
          <legend className={LEGEND}>Customize</legend>
          <div className="pt-2 space-y-6">
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
                <div key={option.name}>
                  <label htmlFor={fieldId} className="block text-[16px] text-[#555555] mb-2">
                    {option.name}: <span className="text-gray-800 font-medium">{selected}</span>
                  </label>
                  <div className="relative w-full">
                    <select
                      id={fieldId}
                      value={selected}
                      onChange={(event) => select(option.name, event.target.value)}
                      className="w-full appearance-none bg-[#F8F8F8] border border-gray-200 text-[13px] text-gray-700 rounded px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#ef9822] cursor-pointer hover:border-[#ef9822] transition-colors"
                    >
                      {option.values.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>
      )}

      <p role="status" className={`text-sm text-error ${notice ? "mb-3" : ""}`}>
        {notice}
      </p>

      {/* Cart and checkout aren't built on the storefront yet, so these are inert placeholders. */}
      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          disabled={!canBuy}
          className="flex-1 py-3 bg-white border border-gray-300 rounded text-[18px] font-semibold text-gray-800 hover:border-[#ef9822] hover:text-[#ef9822] transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          Add To Cart
        </button>
        <button
          type="button"
          aria-label="Add to wishlist"
          className="w-[48px] h-[53px] flex-shrink-0 flex items-center justify-center border border-gray-300 rounded text-gray-400 hover:text-red-500 hover:border-red-500 transition-colors"
        >
          <StoreIcon name="heart" />
        </button>
        <button
          type="button"
          disabled={!canBuy}
          className="flex-1 py-3.5 bg-[#4A4A4A] rounded text-[18px] font-semibold text-white hover:bg-[#ef9822] transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          Buy Now
        </button>
      </div>

      <div className="flex items-center gap-5 text-[14px] text-[#555555] font-medium mb-6 uppercase tracking-wider">
        {supportEmail && (
          <a
            href={`mailto:${supportEmail}?subject=${encodeURIComponent(`Question about ${product.title}`)}`}
            className={MINI_ACTION}
          >
            <StoreIcon name="mail" className="w-[14px] h-[14px]" />
            Ask a question
          </a>
        )}
        <button type="button" onClick={share} className={MINI_ACTION}>
          <StoreIcon name="share" className="w-[14px] h-[14px]" />
          {copied ? "Link copied" : "Share"}
        </button>
        <span role="status" className="sr-only">
          {copied ? "Link copied to clipboard" : ""}
        </span>
      </div>

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
