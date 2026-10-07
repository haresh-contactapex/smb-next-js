import { engravingLines } from "@/lib/engravingRules";

// "Engraving: Forever" and "Font: Elegant Script", shown under a product name in the cart and the
// checkout summary. Renders nothing for a line without engraving. The text is a plain text node,
// so whatever it holds is shown, never interpreted.
export default function EngravingLines({ engraving, className = "" }) {
  const lines = engravingLines(engraving);
  if (lines.length === 0) return null;
  return (
    <div role="group" aria-label="Personalization" className={className}>
      {lines.map((line) => (
        <p key={line.label} className="break-words">
          <span>{line.label}:</span> <span className="font-medium text-[#333333]">{line.value}</span>
        </p>
      ))}
    </div>
  );
}
