export default function TextAreaField({ id, label, value, onChange, rows = 3, placeholder, hint }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="w-full p-3 rounded-xl bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:bg-white dark:focus:bg-darksurface2 focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-sm transition-all font-medium text-slate-800 dark:text-white resize-y"
      />
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
