import { engravingLines } from "@/lib/engravingRules";

// The "Personalization" block under an ordered item (order confirmation, the account's order page):
//
//   Personalization
//   Engraving: Forever
//   Font: Elegant Script
//
// Renders nothing for an item without engraving. The text is shown as plain text, never as markup.
export default function PersonalizationSummary({ engraving, className = "" }) {
  const lines = engravingLines(engraving);
  if (lines.length === 0) return null;
  return (
    <div className={`rounded-lg border border-[#F0E6D2] bg-[#FBF7EF] px-3 py-2 text-[13.5px] leading-snug text-[#555555] ${className}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#8A7A55]">Personalization</p>
      {lines.map((line) => (
        <p key={line.label} className="mt-0.5 break-words">
          {line.label}: <span className="font-semibold text-[#222222]">{line.value}</span>
        </p>
      ))}
    </div>
  );
}
