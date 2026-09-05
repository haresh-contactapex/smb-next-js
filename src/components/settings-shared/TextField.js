export default function TextField({ id, label, value, onChange, type = "text", placeholder, error, hint }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={`field-input${error ? " border-red-400" : ""}`}
      />
      {error && <p className="text-xs text-error mt-1">{error}</p>}
      {!error && hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
