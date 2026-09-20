export default function TextAreaField({
  id,
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  hint,
  error,
  disabled = false,
  inputRef,
}) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        ref={inputRef}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        disabled={disabled}
        className={`w-full p-3 rounded-xl bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:bg-white dark:focus:bg-darksurface2 focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-sm transition-all font-medium text-slate-800 dark:text-white resize-y${
          error
            ? " !border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10"
            : ""
        }${disabled ? " opacity-50 cursor-not-allowed" : ""}`}
      />
      {error && <p className="text-xs text-error mt-1">{error}</p>}
      {!error && hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
