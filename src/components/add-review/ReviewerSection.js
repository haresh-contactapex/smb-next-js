import { MAX_DISPLAY_NAME_LENGTH, MAX_EMAIL_LENGTH } from "@/lib/reviewFields";
import { INVALID_FIELD_CLASSES } from "./helpers";

export default function ReviewerSection({ displayName, email, errors, registerRef, onFieldChange }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Reviewer</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label" htmlFor="f-display-name">
            Display name
          </label>
          <input
            id="f-display-name"
            ref={registerRef("displayName")}
            type="text"
            value={displayName}
            maxLength={MAX_DISPLAY_NAME_LENGTH}
            onChange={(e) => onFieldChange("displayName", e.target.value)}
            placeholder="e.g. Kavya R."
            autoComplete="off"
            aria-invalid={errors.displayName ? "true" : undefined}
            aria-describedby="f-display-name-help"
            className={`field-input${errors.displayName ? INVALID_FIELD_CLASSES : ""}`}
          />
          {errors.displayName && <p className="text-xs text-error mt-1">{errors.displayName}</p>}
          <p id="f-display-name-help" className="text-[11px] text-slate-400 mt-1.5">
            Shown publicly next to the review.
          </p>
        </div>

        <div>
          <label className="field-label" htmlFor="f-email">
            Email address
          </label>
          <input
            id="f-email"
            ref={registerRef("email")}
            type="email"
            value={email}
            maxLength={MAX_EMAIL_LENGTH}
            onChange={(e) => onFieldChange("email", e.target.value)}
            placeholder="reviewer@example.com"
            autoComplete="off"
            aria-invalid={errors.email ? "true" : undefined}
            aria-describedby="f-email-help"
            className={`field-input system-field${errors.email ? INVALID_FIELD_CLASSES : ""}`}
          />
          {errors.email && <p className="text-xs text-error mt-1">{errors.email}</p>}
          <p id="f-email-help" className="text-[11px] text-slate-400 mt-1.5">
            For staff only — never shown on the storefront.
          </p>
        </div>
      </div>
    </section>
  );
}
