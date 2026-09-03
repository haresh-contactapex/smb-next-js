import Icon from "@/components/admin-panel/Icon";
import { LANGUAGES, TIMEZONES } from "@/data/accountData";

export default function PreferencesSidebar({ language, timezone, onFieldChange }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Preferences</h2>

      <div className="space-y-4">
        <div>
          <label className="field-label" htmlFor="f-language">
            Language
          </label>
          <div className="relative">
            <select
              id="f-language"
              value={language}
              onChange={(e) => onFieldChange("language", e.target.value)}
              aria-label="Language"
              className="field-input appearance-none pr-8 cursor-pointer"
            >
              {LANGUAGES.map((opt) => (
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

        <div>
          <label className="field-label" htmlFor="f-timezone">
            Timezone
          </label>
          <div className="relative">
            <select
              id="f-timezone"
              value={timezone}
              onChange={(e) => onFieldChange("timezone", e.target.value)}
              aria-label="Timezone"
              className="field-input appearance-none pr-8 cursor-pointer"
            >
              {TIMEZONES.map((opt) => (
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
      </div>
    </section>
  );
}
