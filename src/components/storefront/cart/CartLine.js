"use client";

import Link from "next/link";
import StoreIcon from "../icons";
import { useCart } from "./CartProvider";
import useImageLoaded from "../useImageLoaded";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { lineLimit, round2 } from "./cartHelpers";

const STEP_BUTTON =
  "w-8 h-8 flex items-center justify-center text-gray-500 hover:text-[#ef9822] transition-colors disabled:opacity-40 disabled:pointer-events-none";

// One product line in the drawer: image, name, chosen options, price,
// quantity stepper and remove button.
export default function CartLine({ item }) {
  const { closeCart, removeItem, setQuantity } = useCart();
  const { formatMoney } = useGeneralSettings();
  const { loaded: imageLoaded, imageProps } = useImageLoaded();

  const optionText = Object.entries(item.options)
    .map(([name, value]) => `${name}: ${value}`)
    .join(" / ");
  const atLimit = item.quantity >= lineLimit(item);
  const stockLimited = atLimit && item.maxQuantity > 0 && item.quantity >= item.maxQuantity;

  return (
    <li className="flex gap-4 py-4">
      <div className={`w-20 h-20 flex-shrink-0 rounded p-2 ${item.image && !imageLoaded ? "shimmer" : "bg-[#FAFAFA]"}`}>
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            {...imageProps}
            src={item.image}
            alt=""
            className={`w-full h-full object-contain mix-blend-multiply transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">No image</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[14px] font-semibold leading-tight text-[#333333]">
            {item.handle ? (
              <Link href={`/products/${item.handle}`} onClick={closeCart} className="hover:text-[#ef9822] transition-colors">
                {item.title}
              </Link>
            ) : (
              item.title
            )}
          </h3>
          <button
            type="button"
            onClick={() => removeItem(item.key)}
            aria-label={`Remove ${item.title} from cart`}
            className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
          >
            <StoreIcon name="trash" className="w-[18px] h-[18px]" />
          </button>
        </div>

        {optionText && <p className="mt-0.5 text-[12px] text-gray-400">{optionText}</p>}

        <p className="mt-1 text-[13px] text-[#555555]">
          {formatMoney(item.price)}
          {item.compareAtPrice > item.price && (
            <s className="ml-1.5 text-gray-400" aria-label={`Was ${formatMoney(item.compareAtPrice)}`}>
              {formatMoney(item.compareAtPrice)}
            </s>
          )}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <div className="inline-flex items-center border border-gray-200 rounded">
            <button
              type="button"
              onClick={() => setQuantity(item.key, item.quantity - 1)}
              disabled={item.quantity <= 1}
              aria-label={`Decrease quantity of ${item.title}`}
              className={STEP_BUTTON}
            >
              <StoreIcon name="minus" className="w-3.5 h-3.5" />
            </button>
            <span className="min-w-[2rem] text-center text-[13px] font-medium text-[#333333]" aria-live="polite">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(item.key, item.quantity + 1)}
              disabled={atLimit}
              aria-label={`Increase quantity of ${item.title}`}
              className={STEP_BUTTON}
            >
              <StoreIcon name="plus" className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-[14px] font-semibold text-[#333333]">{formatMoney(round2(item.price * item.quantity))}</span>
        </div>

        {stockLimited && <p className="mt-1 text-[11px] text-gray-400">Only {item.maxQuantity} available</p>}
      </div>
    </li>
  );
}
