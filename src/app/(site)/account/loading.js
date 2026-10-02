import { CARD } from "@/components/account/accountStyles";

// Shimmer shown inside the account frame while a section reads its data. It uses
// the storefront's shared .shimmer placeholder (storefront.css).
export default function AccountLoading() {
  return (
    <div aria-busy="true" aria-label="Loading your account" className="flex flex-col gap-6">
      <div className="space-y-3">
        <div className="shimmer h-9 w-56 rounded" />
        <div className="shimmer h-4 w-80 max-w-full rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={`${CARD} shimmer h-24`} />
        <div className={`${CARD} shimmer h-24`} />
      </div>
      <div className={`${CARD} shimmer h-40`} />
      <div className={`${CARD} shimmer h-40`} />
    </div>
  );
}
