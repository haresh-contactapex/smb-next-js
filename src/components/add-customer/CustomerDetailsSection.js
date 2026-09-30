// Matches the invalid-field treatment in settings-shared/TextField.js: a
// pink tint plus a red border, kept through focus so the error stays visible
// while the field is being corrected.
const ERROR_INPUT_CLASSES =
  " !border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10";

export default function CustomerDetailsSection({
  firstName,
  lastName,
  firstNameError,
  lastNameError,
  firstNameInputRef,
  email,
  emailError,
  phone,
  phoneError,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onPhoneChange,
}) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Customer Details</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label" htmlFor="f-first-name">
            First name
          </label>
          <input
            id="f-first-name"
            ref={firstNameInputRef}
            type="text"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            placeholder="e.g. Kavya"
            aria-label="First name"
            className={`field-input${firstNameError ? ERROR_INPUT_CLASSES : ""}`}
          />
          {firstNameError && <p className="text-xs text-error mt-1">First name is required.</p>}
        </div>

        <div>
          <label className="field-label" htmlFor="f-last-name">
            Last name
          </label>
          <input
            id="f-last-name"
            type="text"
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            placeholder="e.g. Reddy"
            aria-label="Last name"
            className={`field-input${lastNameError ? ERROR_INPUT_CLASSES : ""}`}
          />
          {lastNameError && <p className="text-xs text-error mt-1">Last name is required.</p>}
        </div>

        <div>
          <label className="field-label" htmlFor="f-email">
            Email
          </label>
          <input
            id="f-email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="customer@example.com"
            aria-label="Email"
            className={`field-input system-field${emailError ? ERROR_INPUT_CLASSES : ""}`}
          />
          {emailError && <p className="text-xs text-error mt-1">Enter a valid email address.</p>}
        </div>

        <div>
          <label className="field-label" htmlFor="f-phone">
            Phone
          </label>
          <input
            id="f-phone"
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="(555) 123-4567"
            aria-label="Phone"
            className={`field-input system-field${phoneError ? ERROR_INPUT_CLASSES : ""}`}
          />
          {phoneError && <p className="text-xs text-error mt-1">Enter a valid 10-digit US phone number.</p>}
        </div>
      </div>
    </section>
  );
}
