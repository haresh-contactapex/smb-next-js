import Icon from "@/components/admin-panel/Icon";

export default function ToggleField({ icon, label, description, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer py-1.5">
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          {icon && <Icon name={icon} className="w-4 h-4 text-slate-400 shrink-0" />}
          {label}
        </span>
        {description && <span className="block text-xs text-slate-400 mt-0.5">{description}</span>}
      </span>
      <input
        type="checkbox"
        className="w-4 h-4 rounded accent-primary-500 dark:accent-accent-500 shrink-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
    </label>
  );
}
