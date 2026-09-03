export default function Toast({ message, visible }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 transition-all duration-300 bg-slate-800 dark:bg-darksurface2 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-popover z-50${
        visible ? "" : " translate-y-20 opacity-0"
      }`}
    >
      {message}
    </div>
  );
}
