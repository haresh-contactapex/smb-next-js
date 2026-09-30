import { STORE_ANNOUNCEMENTS } from "./navLinks";

// Blue announcement strip above the header. It scrolls away with the page so
// the sticky header can take the top of the viewport.
export default function TopBar() {
  return (
    <div className="w-full bg-[#1c3b6a] px-4 py-2.5 text-center text-[12px] sm:text-[14px] font-medium tracking-wide text-white/80">
      <ul className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-10 gap-y-1">
        {STORE_ANNOUNCEMENTS.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
