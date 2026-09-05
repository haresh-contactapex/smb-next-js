import Icon from "@/components/admin-panel/Icon";
import { normalizeGiftCardCode } from "./helpers";

export default function RedeemGiftCardSection({ code, codeError, inputRef, onCodeChange, onRedeem }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-1.5">
        <Icon name="plus-circle" className="w-4 h-4 text-slate-400" /> Redeem a Gift Card
      </h2>
      <p className="text-xs text-slate-400 mb-4">Enter the code from the back of your card or from the email.</p>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="sr-only" htmlFor="f-giftcard-code">
            Gift card code
          </label>
          <input
            id="f-giftcard-code"
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => onCodeChange(normalizeGiftCardCode(e.target.value))}
            placeholder="GC-XXXX-XXXX"
            aria-label="Gift card code"
            className={`field-input font-mono tracking-wide${codeError ? " border-red-400" : ""}`}
          />
          {codeError && <p className="text-xs text-error mt-1.5">{codeError}</p>}
        </div>
        <button
          type="button"
          onClick={onRedeem}
          className="h-9 sm:mt-0 px-5 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-xs font-semibold shadow-sm transition-colors shrink-0"
        >
          Apply to Account
        </button>
      </div>
    </section>
  );
}
