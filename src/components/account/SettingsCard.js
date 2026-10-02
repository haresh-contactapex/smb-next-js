import { CARD } from "./accountStyles";

// A titled card for one group of settings on the Profile & security page.
// `tone="danger"` outlines it in red for the delete-account section.
export default function SettingsCard({ id, title, description, tone, children }) {
  return (
    <section aria-labelledby={`${id}-title`} className={`${CARD} p-5 sm:p-7 ${tone === "danger" ? "!border-red-200" : ""}`}>
      <h2 id={`${id}-title`} className={`text-[18px] font-semibold ${tone === "danger" ? "text-red-700" : "text-[#333333]"}`}>
        {title}
      </h2>
      {description && <p className="mt-1 max-w-2xl text-[14px] text-gray-500">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
