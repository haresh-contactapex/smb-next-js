export default function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  hint,
  disabled = false,
  inputRef,
  onEnter,
}) {
  function handleKeyDown(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    onEnter?.();
  }

  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onEnter ? handleKeyDown : undefined}
        placeholder={placeholder}
        aria-label={label}
        disabled={disabled}
        className={`field-input${
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
