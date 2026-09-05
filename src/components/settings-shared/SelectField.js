import Icon from "@/components/admin-panel/Icon";

export default function SelectField({ id, label, value, options, onChange, hint }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="field-input appearance-none pr-8 cursor-pointer"
        >
          {options.map((opt) => {
            const optValue = typeof opt === "string" ? opt : opt.value;
            const optLabel = typeof opt === "string" ? opt : opt.label;
            return (
              <option key={optValue} value={optValue}>
                {optLabel}
              </option>
            );
          })}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
          <Icon name="chevron-down" className="w-4 h-4" />
        </span>
      </div>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
