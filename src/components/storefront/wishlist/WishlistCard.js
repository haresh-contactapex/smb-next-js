"use client";

import Link from "next/link";
import StoreIcon from "../icons";
import StarRating from "../StarRating";
import CartOptionSelect from "../cart/CartOptionSelect";
import { useCart } from "../cart/CartProvider";
import { optionChoices } from "../cart/cartHelpers";
import { isMetalOption } from "../metals";
import { WishlistCardSkeleton } from "./WishlistSkeleton";
import { useWishlist } from "./WishlistProvider";
import { defaultVariant } from "./wishlistHelpers";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { formatCurrency } from "@/lib/currency";

const LOW_STOCK_AT = 5;

const REMOVE_BUTTON =
  "inline-flex items-center justify-center gap-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:text-red-500";

// One saved item: image, name, price (with the regular price struck through
// when on sale), rating, stock status, its color / size pickers, Add to Cart
// and Remove. `product` is the live catalog entry; it is undefined while it
// loads and stays undefined when the product is no longer sold.
export default function WishlistCard({ item, product, loading }) {
  const { remove, changeVariant } = useWishlist();
  const { addItem } = useCart();
  const { currency } = useGeneralSettings();

  if (!product && loading) return <WishlistCardSkeleton />;

  if (!product) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex aspect-square items-center justify-center rounded-md bg-[#FAFAFA] p-6 text-center text-[13px] text-gray-400">
          This product is no longer available.
        </div>
        <button type="button" onClick={() => remove(item.productId, item.variantId)} className={REMOVE_BUTTON}>
          <StoreIcon name="trash" className="h-4 w-4" />
          Remove from wishlist
        </button>
      </div>
    );
  }

  const hasVariants = product.variants.length > 0;
  // A product saved without picking a color/size shows (and adds) its default one.
  const variant = hasVariants ? product.variants.find((candidate) => candidate.id === item.variantId) || defaultVariant(product) : null;
  const price = variant ? variant.price : product.price;
  const compareAtPrice = variant ? variant.compareAtPrice : product.compareAtPrice;
  const onSale = compareAtPrice > price;
  const available = !variant || variant.available;
  const lowStock = available && variant?.maxQuantity > 0 && variant.maxQuantity <= LOW_STOCK_AT;

  const pickers = variant
    ? product.options.map((option) => ({
        name: option.name,
        value: variant.options[option.name],
        choices: optionChoices(product, variant, option),
        swatch: isMetalOption(option),
      }))
    : [];

  let status = { text: "In stock", className: "text-green-700" };
  if (!available) status = { text: "Out of stock", className: "text-error" };
  else if (lowStock) status = { text: `Only ${variant.maxQuantity} left`, className: "text-[#b86e00]" };

  const href = `/products/${product.handle}`;

  function addToCart() {
    if (!available) return;
    addItem({
      productId: product.id,
      variantId: variant?.id ?? null,
      handle: product.handle,
      title: product.title,
      image: product.image,
      // In the product's own option order; the variant's keys come back from SQL in no fixed order.
      options: variant ? Object.fromEntries(product.options.map((option) => [option.name, variant.options[option.name]])) : {},
      sku: variant?.sku || product.sku,
      price,
      compareAtPrice: onSale ? compareAtPrice : null,
      maxQuantity: variant?.maxQuantity ?? null,
    });
  }

  return (
    <div className="flex h-full flex-col">
      <Link href={href} aria-label={product.title} tabIndex={-1} className="relative mb-4 block aspect-square overflow-hidden rounded-md bg-[#FAFAFA]">
        {onSale && (
          <span className="absolute left-3 top-3 z-10 rounded bg-[#ef9822] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">Sale</span>
        )}
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt="" className={`h-full w-full object-contain p-6 mix-blend-multiply sm:p-8 ${available ? "" : "opacity-50"}`} />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</span>
        )}
      </Link>

      <h2 className="text-sm font-[600] leading-tight text-[#333333]">
        <Link href={href} className="transition-colors hover:text-[#ef9822]">
          {product.title}
        </Link>
      </h2>

      <p className="mt-1.5 font-semibold text-[#333333]">
        <span>{formatCurrency(price, currency)}</span>
        {onSale && (
          <s className="ml-2 text-sm font-normal text-gray-400" aria-label={`Was ${formatCurrency(compareAtPrice, currency)}`}>
            {formatCurrency(compareAtPrice, currency)}
          </s>
        )}
      </p>

      <div className="mt-1.5 flex items-center gap-2">
        {product.rating.count > 0 ? (
          <>
            <StarRating rating={product.rating.average} className="h-[14px] w-[14px]" />
            <span className="text-[12px] font-medium text-gray-400">
              ({product.rating.count} {product.rating.count === 1 ? "Review" : "Reviews"})
            </span>
          </>
        ) : (
          <span className="text-[12px] font-medium text-gray-400">No reviews yet</span>
        )}
      </div>

      <p className={`mt-2 text-[13px] font-medium ${status.className}`}>{status.text}</p>

      {pickers.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
          {pickers.map((picker) => (
            <CartOptionSelect
              key={picker.name}
              name={picker.name}
              value={picker.value}
              choices={picker.choices}
              swatch={picker.swatch}
              inset
              onChange={(value) => {
                const choice = picker.choices.find((candidate) => candidate.value === value);
                if (choice?.variant) changeVariant(product.id, item.variantId, choice.variant.id);
              }}
            />
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3 pt-5">
        <button
          type="button"
          onClick={addToCart}
          disabled={!available}
          className="w-full rounded bg-[#4A4A4A] py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#ef9822] disabled:pointer-events-none disabled:opacity-50"
        >
          {available ? "Add To Cart" : "Out of Stock"}
        </button>
        <button type="button" onClick={() => remove(item.productId, item.variantId)} aria-label={`Remove ${product.title} from wishlist`} className={REMOVE_BUTTON}>
          <StoreIcon name="trash" className="h-4 w-4" />
          Remove from wishlist
        </button>
      </div>
    </div>
  );
}
