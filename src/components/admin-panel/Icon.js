import { ICONS } from "./icons";

/**
 * Renders one icon from the shared ICONS path library.
 * Usage: <Icon name="grid" className="w-5 h-5" />
 */
export default function Icon({ name, className = "" }) {
  const inner = ICONS[name];
  if (!inner) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
