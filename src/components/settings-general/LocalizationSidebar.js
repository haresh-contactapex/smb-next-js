import Icon from "@/components/admin-panel/Icon";
import { CURRENCIES, DATE_TIME_FORMATS, LANGUAGES, TIMEZONES } from "@/data/accountData";

function SelectField({ id, label, value, options, onChange }) {
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
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
          <Icon name="chevron-down" className="w-4 h-4" />
        </span>
      </div>
    </div>
  );
}

export default function LocalizationSidebar({ timezone, dateTimeFormat, language, currency, onFieldChange }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-1.5">
        <Icon name="globe" className="w-4 h-4 text-slate-400" /> Localization
      </h2>

      <div className="space-y-4">
        <SelectField
          id="f-timezone"
          label="Time Zone"
          value={timezone}
          options={TIMEZONES}
          onChange={(value) => onFieldChange("timezone", value)}
        />
        <SelectField
          id="f-datetime-format"
          label="Date & Time Format"
          value={dateTimeFormat}
          options={DATE_TIME_FORMATS}
          onChange={(value) => onFieldChange("dateTimeFormat", value)}
        />
        <SelectField
          id="f-language"
          label="Default Language"
          value={language}
          options={LANGUAGES}
          onChange={(value) => onFieldChange("language", value)}
        />
        <SelectField
          id="f-currency"
          label="Default Currency"
          value={currency}
          options={CURRENCIES}
          onChange={(value) => onFieldChange("currency", value)}
        />
      </div>
    </section>
  );
}
