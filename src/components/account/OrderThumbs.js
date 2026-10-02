import StoreIcon from "../storefront/icons";

// Up to three tiles of overlapping product photos from an order: the photos
// themselves for up to three items, otherwise two photos and a "+N" tile for the
// rest. Orders with no photos (or no line items on record) show a box icon
// instead. The row is a fixed width so order titles line up down the list.
// Decorative: the order's text carries the facts.
export default function OrderThumbs({ preview, itemCount }) {
  const crowded = itemCount > 3;
  const shown = preview.slice(0, crowded ? 2 : 3);
  const extra = crowded ? itemCount - shown.length : 0;

  if (shown.length === 0) {
    return (
      <span aria-hidden="true" className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-lg bg-[#FAFAFA] text-gray-300 sm:mr-[88px]">
        <StoreIcon name="box" className="h-6 w-6" />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="flex w-[144px] flex-shrink-0 items-center">
      {shown.map((line, index) => (
        <span
          key={`${line.title}-${index}`}
          className="-ml-3 grid h-14 w-14 flex-shrink-0 place-items-center overflow-hidden rounded-lg border-2 border-white bg-[#FAFAFA] first:ml-0"
        >
          {line.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={line.image} alt="" className="h-full w-full object-contain p-1 mix-blend-multiply" />
          ) : (
            <StoreIcon name="box" className="h-5 w-5 text-gray-300" />
          )}
        </span>
      ))}
      {extra > 0 && (
        <span className="-ml-3 grid h-14 w-14 flex-shrink-0 place-items-center rounded-lg border-2 border-white bg-gray-100 text-[13px] font-semibold text-gray-500">
          +{extra}
        </span>
      )}
    </span>
  );
}
