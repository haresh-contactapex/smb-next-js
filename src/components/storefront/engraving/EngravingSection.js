"use client";

import ProductSection from "../ProductSection";
import EngravingFields from "./EngravingFields";

// The "Engraving" block on a product page that offers it. It says up front that this is an
// optional add-on to the item, then shows the form; leaving the text empty buys the item without
// engraving.
export default function EngravingSection({ config, value, onChange }) {
  return (
    <ProductSection title="Engraving">
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-full bg-[#FEF1DD] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#9A5B00]">
          Optional personalization
        </span>
        <span className="text-[13px] text-gray-500">An additional option. Your item ships without engraving unless you add text.</span>
      </div>
      <EngravingFields config={config} value={value} onChange={onChange} />
    </ProductSection>
  );
}
