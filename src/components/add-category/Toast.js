export default function Toast({ message, visible, variant = "success", onDismiss }) {
  if (variant === "error") {
    return (
      <div
        role="alert"
        className={`fixed top-6 right-6 z-50 max-w-sm transition-all duration-300${
          visible ? "" : " -translate-y-4 opacity-0 pointer-events-none"
        }`}
      >
        <div className="relative flex items-start gap-3 bg-red-600 text-white rounded-xl shadow-popover pl-4 pr-9 py-3.5">
          <span className="flex-shrink-0 w-6 h-6 mt-0.5 rounded-full bg-white text-red-600 flex items-center justify-center text-sm font-bold">
            !
          </span>
          <div>
            <p className="text-sm font-bold leading-tight">Error!</p>
            <p className="text-sm leading-snug">{message}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={onDismiss}
            className="absolute top-2.5 right-2.5 text-white/80 hover:text-white text-lg leading-none"
          >
            &times;
          </button>
        </div>
      </div>
    );
  }

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
