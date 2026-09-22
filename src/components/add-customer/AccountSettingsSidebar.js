import Icon from "@/components/admin-panel/Icon";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AccountSettingsSidebar({
  customerGroup,
  loyaltyPoints,
  acceptsMarketing,
  isGuest,
  createdAt,
  isEdit,
  onFieldChange,
}) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Account Settings</h2>

      <div className="space-y-4">
        <div>
          <label className="field-label" htmlFor="f-customer-group">
            Customer group
          </label>
          <div className="relative">
            <select
              id="f-customer-group"
              value={customerGroup}
              onChange={(e) => onFieldChange("customerGroup", e.target.value)}
              aria-label="Customer group"
              className="field-input appearance-none pr-8 cursor-pointer"
            >
              <option value="Retail">Retail</option>
              <option value="Wholesale">Wholesale</option>
              <option value="VIP">VIP</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
              <Icon name="chevron-down" className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="f-loyalty-points">
            Loyalty points
          </label>
          <input
            id="f-loyalty-points"
            type="text"
            inputMode="numeric"
            value={loyaltyPoints}
            onChange={(e) => onFieldChange("loyaltyPoints", e.target.value)}
            placeholder="0"
            aria-label="Loyalty points"
            className="field-input system-field"
          />
        </div>

        <label className="toggle-row text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={acceptsMarketing}
            onChange={(e) => onFieldChange("acceptsMarketing", e.target.checked)}
          />
          Subscribed to marketing emails
        </label>

        {isEdit && (
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span>Account type</span>
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {isGuest ? "Guest checkout" : "Registered"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Joined</span>
              <span className="font-medium text-slate-600 dark:text-slate-300">{formatDate(createdAt)}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
