import { HEADING_FONT } from "./accountStyles";

// Title block at the top of each account section: heading, a line of context,
// and optional action buttons on the right.
export default function AccountPageHeader({ title, description, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[28px] font-normal leading-tight text-[#333333] sm:text-[32px]" style={HEADING_FONT}>
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-gray-500">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}
