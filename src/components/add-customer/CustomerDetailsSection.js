export default function CustomerDetailsSection({
  firstName,
  lastName,
  firstNameError,
  lastNameError,
  firstNameInputRef,
  email,
  emailError,
  phone,
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
            className={`field-input${firstNameError ? " border-red-400" : ""}`}
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
            className={`field-input${lastNameError ? " border-red-400" : ""}`}
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
            className={`field-input system-field${emailError ? " border-red-400" : ""}`}
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
            placeholder="Optional"
            aria-label="Phone"
            className="field-input system-field"
          />
        </div>
      </div>
    </section>
  );
}
