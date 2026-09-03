"use client";

import Icon from "@/components/admin-panel/Icon";

const CHANNELS = [
  { key: "online_store", icon: "shopping-bag", label: "Online Store" },
  { key: "pos", icon: "credit-card", label: "Point of Sale" },
  { key: "shop", icon: "gift", label: "Shop" },
];

export default function PublishingSidebar({ publishing, onChannelChange }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Publishing</h2>
      <p className="text-xs text-slate-400 mb-3">Choose the sales channels where this product will be available.</p>
      <div className="space-y-1">
        {CHANNELS.map((channel) => (
          <label
            key={channel.key}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">
              <Icon name={channel.icon} className="w-4 h-4 text-slate-400" /> {channel.label}
            </span>
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-primary-500 dark:accent-accent-500"
              checked={!!publishing[channel.key]}
              onChange={(e) => onChannelChange(channel.key, e.target.checked)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
