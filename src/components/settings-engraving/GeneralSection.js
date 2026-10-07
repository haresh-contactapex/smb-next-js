import Icon from "@/components/admin-panel/Icon";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextAreaField from "@/components/settings-shared/TextAreaField";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import {
  ENGRAVING_ABSOLUTE_MAX,
  ENGRAVING_HELP_MAX,
  ENGRAVING_SYMBOL_CHOICES,
  cleanHelpText,
  describeAllowedCharacters,
  invalidCharactersMessage,
} from "@/lib/engravingRules";
import { SETTINGS_FIELD_IDS, symbolName, toggleSymbol } from "./helpers";

const SYMBOLS = [...ENGRAVING_SYMBOL_CHOICES];

const LINK_BUTTON =
  "text-xs font-semibold text-primary-500 dark:text-accent-400 hover:underline disabled:opacity-50 disabled:pointer-events-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:focus-visible:ring-accent-500";

// `settings` is the form's copy: maxCharacters is the text typed into the number field.
export default function GeneralSection({ settings, errors, onChange, disabled = false }) {
  const allowedSymbols = String(settings.allowedSymbols || "");
  const helpLength = String(settings.helpText || "").length;
  const helpTooLong = helpLength > ENGRAVING_HELP_MAX;

  const maxNumber = Number(settings.maxCharacters);
  const maxIsValid = Number.isInteger(maxNumber) && maxNumber >= 1 && maxNumber <= ENGRAVING_ABSOLUTE_MAX;

  const allowedText = describeAllowedCharacters(settings);
  const previewHelp = cleanHelpText(settings.helpText);

  return (
    <SectionCard title="General Settings">
      <ToggleField
        label="Enable engraving"
        description="Master switch for the whole store. When off, engraving is hidden on every product, whatever the categories below or a product's own Engraving setting say."
        checked={settings.enabled}
        onChange={(value) => onChange("enabled", value)}
        disabled={disabled}
      />

      <div className="max-w-xs">
        <TextField
          id={SETTINGS_FIELD_IDS.maxCharacters}
          label="Maximum characters"
          type="number"
          value={settings.maxCharacters}
          onChange={(value) => onChange("maxCharacters", value)}
          placeholder="20"
          error={errors.maxCharacters}
          hint={`A whole number from 1 to ${ENGRAVING_ABSOLUTE_MAX}. Longer engraving text is not accepted.`}
          disabled={disabled}
        />
      </div>

      <fieldset
        id={SETTINGS_FIELD_IDS.characters}
        aria-describedby={errors.characters ? "engraving-characters-error" : undefined}
        className="min-w-0 border-0 p-0 m-0"
      >
        <legend className="field-label">Allowed characters</legend>
        <div
          className={`rounded-xl border p-4 space-y-3 ${
            errors.characters
              ? "border-red-400 bg-red-50 dark:bg-red-500/10"
              : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03]"
          }`}
        >
          <div className="space-y-0.5">
            <ToggleField
              label="Letters (A-Z, a-z)"
              checked={settings.allowLetters}
              onChange={(value) => onChange("allowLetters", value)}
              disabled={disabled}
            />
            <ToggleField
              label="Numbers (0-9)"
              checked={settings.allowNumbers}
              onChange={(value) => onChange("allowNumbers", value)}
              disabled={disabled}
            />
            <ToggleField
              label="Spaces"
              checked={settings.allowSpaces}
              onChange={(value) => onChange("allowSpaces", value)}
              disabled={disabled}
            />
          </div>

          <div className="border-t border-slate-200 dark:border-white/10 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-2">
              <p id="engraving-symbols-label" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Symbols
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {allowedSymbols.length} of {SYMBOLS.length} allowed
                </span>
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={LINK_BUTTON}
                  onClick={() => onChange("allowedSymbols", ENGRAVING_SYMBOL_CHOICES)}
                  disabled={disabled || allowedSymbols.length === SYMBOLS.length}
                >
                  Allow all
                </button>
                <button
                  type="button"
                  className={LINK_BUTTON}
                  onClick={() => onChange("allowedSymbols", "")}
                  disabled={disabled || allowedSymbols.length === 0}
                >
                  Allow none
                </button>
              </div>
            </div>

            <div role="group" aria-labelledby="engraving-symbols-label" className="flex flex-wrap gap-2">
              {SYMBOLS.map((char) => {
                const on = allowedSymbols.includes(char);
                return (
                  <button
                    key={char}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${symbolName(char)} ${char}`}
                    title={`${symbolName(char)}: ${on ? "allowed" : "not allowed"}`}
                    disabled={disabled}
                    onClick={() => onChange("allowedSymbols", toggleSymbol(allowedSymbols, char))}
                    className={`relative flex h-11 w-11 items-center justify-center rounded-xl border text-lg font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/20 dark:focus-visible:ring-accent-500/30 disabled:opacity-50 disabled:cursor-not-allowed ${
                      on
                        ? "border-primary-500 bg-primary-50 text-primary-700 dark:border-accent-500 dark:bg-accent-500/15 dark:text-accent-300"
                        : "border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-darksurface2 dark:text-slate-500 dark:hover:text-slate-300"
                    }`}
                  >
                    <span aria-hidden="true">{char}</span>
                    {on && (
                      <span
                        aria-hidden="true"
                        className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-white dark:bg-accent-500"
                      >
                        <Icon name="check" className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Only plain keyboard symbols are offered. Accented letters, emoji and other special characters are never
              allowed.
            </p>
          </div>
        </div>
        {errors.characters && (
          <p id="engraving-characters-error" className="text-xs text-error mt-1">
            {errors.characters}
          </p>
        )}
      </fieldset>

      <div>
        <TextAreaField
          id={SETTINGS_FIELD_IDS.helpText}
          label="Engraving instructions / help text"
          value={settings.helpText}
          onChange={(value) => onChange("helpText", value)}
          rows={3}
          placeholder="Add a personal message to your band."
          hint="Shown to customers on the product page next to the engraving field. Plain text only."
          error={errors.helpText}
          disabled={disabled}
        />
        <p
          className={`text-xs text-right mt-1 tabular-nums ${helpTooLong ? "text-error font-semibold" : "text-slate-400"}`}
        >
          {helpLength} / {ENGRAVING_HELP_MAX}
        </p>
      </div>

      <section
        aria-label="What customers will see"
        className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4 space-y-3"
      >
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          What customers will see
        </h3>
        {!settings.enabled && (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Engraving is switched off, so customers will not see any of this.
          </p>
        )}
        {previewHelp ? (
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line break-words">{previewHelp}</p>
        ) : (
          <p className="text-sm italic text-slate-400">No help text will be shown.</p>
        )}
        <div
          aria-hidden="true"
          className="flex items-center justify-between gap-3 h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-darksurface2 px-3 text-sm text-slate-400"
        >
          <span className="truncate">Your engraving text</span>
          <span className="shrink-0 tabular-nums text-xs">0 / {maxIsValid ? maxNumber : "-"}</span>
        </div>
        <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
          <li>Allowed: {allowedText || "nothing yet"}.</li>
          {allowedSymbols && (
            <li>
              Symbols: <span className="font-medium tracking-wider">{allowedSymbols.split("").join(" ")}</span>
            </li>
          )}
          <li>Up to {maxIsValid ? maxNumber : "?"} characters.</li>
          <li>
            If a customer types anything else, they see: <span className="font-medium">&ldquo;{invalidCharactersMessage(settings)}&rdquo;</span>
          </li>
        </ul>
      </section>
    </SectionCard>
  );
}
