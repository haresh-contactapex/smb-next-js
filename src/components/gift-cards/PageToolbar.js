import Icon from "@/components/admin-panel/Icon";

export default function PageToolbar({ onRedeemClick }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Icon name="gift" className="w-4 h-4" />
          <span>My Account</span>
          <span>/</span>
          <span className="font-semibold text-slate-800 dark:text-white">Gift Cards</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Gift Cards</h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onRedeemClick}
          className="px-4 h-9 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          Redeem a Gift Card
        </button>
      </div>
    </div>
  );
}
