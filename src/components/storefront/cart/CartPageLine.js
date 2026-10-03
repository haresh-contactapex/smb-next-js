"use client";

import Link from "next/link";
import StoreIcon from "../icons";
import CartOptionSelect from "./CartOptionSelect";
import { useCart } from "./CartProvider";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { isMetalOption } from "../metals";
import useImageLoaded from "../useImageLoaded";
import { lineLimit, optionChoices } from "./cartHelpers";

const STEP_BUTTON =
  "flex h-7 w-7 items-center justify-center text-[#555555] transition-colors hover:text-[#ef9822] disabled:pointer-events-none disabled:opacity-40";

// One product line on the cart page: image, name, price, editable color and
// size, quantity and remove. `product` ({ options, variants }) is what the
// pickers choose from. While it is still being fetched (`loading`) the pickers
// shimmer; if the product is no longer sold, the line's current options are
// shown but can't be changed.
export default function CartPageLine({ item, product, loading = false, onVariantChange }) {
  const { removeItem, setQuantity } = useCart();
  const { formatMoney } = useGeneralSettings();
  const { loaded: imageLoaded, imageProps } = useImageLoaded();

  const variant = product?.variants.find((candidate) => candidate.id === item.variantId) || null;
  const editable = Boolean(product && variant);

  const pickers = editable
    ? product.options.map((option) => ({
        name: option.name,
        value: variant.options[option.name],
        choices: optionChoices(product, variant, option),
        swatch: isMetalOption(option),
      }))
    : Object.entries(item.options).map(([name, value]) => ({
        name,
        value,
        choices: [{ value, state: "current" }],
        swatch: isMetalOption({ name, values: [value] }),
      }));

  const atLimit = item.quantity >= lineLimit(item);
  const stockLimited = atLimit && item.maxQuantity > 0 && item.quantity >= item.maxQuantity;
  const image = (
    <div className={`aspect-square w-full rounded p-3 sm:p-4 ${item.image && !imageLoaded ? "shimmer" : "bg-[#FAFAFA]"}`}>
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          {...imageProps}
          src={item.image}
          alt=""
          className={`h-full w-full object-contain mix-blend-multiply transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-400">No image</div>
      )}
    </div>
  );

  return (
    <li className="flex gap-4 py-8 first:pt-0 sm:gap-8">
      <div className="w-[104px] flex-shrink-0 sm:w-[180px]">
        {item.handle ? (
          <Link href={`/products/${item.handle}`} aria-label={item.title} tabIndex={-1}>
            {image}
          </Link>
        ) : (
          image
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[18px] font-bold uppercase leading-tight tracking-tight text-[#333333] sm:text-[26px]">
              {item.handle ? (
                <Link href={`/products/${item.handle}`} className="transition-colors hover:text-[#ef9822]">
                  {item.title}
                </Link>
              ) : (
                item.title
              )}
            </h2>
            <p className="mt-1.5 text-[15px] text-[#555555] sm:text-[17px]">
              {item.compareAtPrice > item.price && (
                <s className="mr-2 text-gray-400" aria-label={`Was ${formatMoney(item.compareAtPrice)}`}>
                  {formatMoney(item.compareAtPrice)}
                </s>
              )}
              <span>{formatMoney(item.price)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeItem(item.key)}
            aria-label={`Remove ${item.title} from cart`}
            className="-mr-1 flex-shrink-0 p-1 text-gray-400 transition-colors hover:text-red-500"
          >
            <StoreIcon name="close" className="h-5 w-5" />
          </button>
        </div>

        {loading && !product ? (
          // Same captions as the real pickers, with a shimmer where the select goes.
          <div aria-hidden="true" className="mt-5 flex flex-wrap gap-x-8 gap-y-4 sm:mt-7">
            {pickers.map((picker) => (
              <div key={picker.name}>
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#555555]">{picker.name}</span>
                <div className="shimmer h-[37px] w-36 rounded" />
              </div>
            ))}
          </div>
        ) : (
          pickers.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-x-8 gap-y-4 sm:mt-7">
              {pickers.map((picker) => (
                <CartOptionSelect
                  key={picker.name}
                  name={picker.name}
                  value={picker.value}
                  choices={picker.choices}
                  swatch={picker.swatch}
                  disabled={!editable}
                  onChange={(value) => {
                    const choice = picker.choices.find((candidate) => candidate.value === value);
                    if (choice?.variant) onVariantChange(item, choice.variant);
                  }}
                />
              ))}
            </div>
          )
        )}

        <div className="mt-5 flex items-center gap-5 sm:mt-7">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#333333]">Quantity</span>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setQuantity(item.key, item.quantity - 1)}
              disabled={item.quantity <= 1}
              aria-label={`Decrease quantity of ${item.title}`}
              className={STEP_BUTTON}
            >
              <StoreIcon name="minus" className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[1.75rem] rounded-sm bg-[#4A4A4A] px-1.5 py-0.5 text-center text-[13px] font-semibold text-white" aria-live="polite">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(item.key, item.quantity + 1)}
              disabled={atLimit}
              aria-label={`Increase quantity of ${item.title}`}
              className={STEP_BUTTON}
            >
              <StoreIcon name="plus" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {stockLimited && <p className="mt-2 text-[12px] text-gray-400">Only {item.maxQuantity} available</p>}
      </div>
    </li>
  );
}
