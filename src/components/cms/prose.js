// Tailwind classes that give CMS page HTML its typography inside the admin panel
// (the editor surface and the preview), in light and dark mode. Tailwind's reset
// strips heading, list and table styling, so each element is styled here. The
// storefront draws the same HTML with .cms-content in storefront.css instead.
export const CMS_ADMIN_PROSE = [
  "text-sm leading-relaxed text-slate-800 dark:text-slate-100",
  "[&_h1]:my-3 [&_h1]:text-2xl [&_h1]:font-semibold",
  "[&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-semibold",
  "[&_h3]:my-2 [&_h3]:text-[17px] [&_h3]:font-semibold",
  "[&_h4]:my-2 [&_h4]:text-base [&_h4]:font-semibold",
  "[&_p]:my-2",
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_li_p]:my-0",
  "[&_a]:text-primary-600 [&_a]:underline dark:[&_a]:text-accent-400",
  "[&_a.cms-btn]:inline-block [&_a.cms-btn]:rounded [&_a.cms-btn]:bg-[#d14b4b] [&_a.cms-btn]:px-5 [&_a.cms-btn]:py-2 [&_a.cms-btn]:font-semibold [&_a.cms-btn]:text-white [&_a.cms-btn]:no-underline",
  "[&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic dark:[&_blockquote]:border-white/20",
  "[&_img]:h-auto [&_img]:max-w-full",
  "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse",
  "[&_td]:border [&_td]:border-slate-300 [&_td]:px-2 [&_td]:py-1 dark:[&_td]:border-white/15",
  "[&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left dark:[&_th]:border-white/15 dark:[&_th]:bg-white/5",
  "[&_table.cms-plain_td]:border-0 [&_table.cms-plain_td]:py-0.5 [&_table.cms-plain_td:nth-child(odd)]:font-semibold [&_table.cms-plain_td:nth-child(even)]:text-right",
  "[&_h2.cms-lg]:text-[28px] [&_h2.cms-lg]:font-normal [&_h3.cms-lg]:text-xl [&_h3.cms-lg]:font-normal",
  "[&_h2.cms-accent]:text-xl [&_h2.cms-accent]:font-semibold [&_h2.cms-accent]:text-[#2f6f9f] dark:[&_h2.cms-accent]:text-sky-400",
  "[&_a.cms-btn-outline]:inline-block [&_a.cms-btn-outline]:rounded-sm [&_a.cms-btn-outline]:border [&_a.cms-btn-outline]:border-slate-500 [&_a.cms-btn-outline]:px-5 [&_a.cms-btn-outline]:py-1.5 [&_a.cms-btn-outline]:no-underline",
  "[&_table.cms-striped_th]:border-0 [&_table.cms-striped_th]:bg-slate-600 [&_table.cms-striped_th]:font-normal [&_table.cms-striped_th]:text-white [&_table.cms-striped_td]:border-0 [&_table.cms-striped_tr:nth-child(even)_td]:bg-slate-100 dark:[&_table.cms-striped_tr:nth-child(even)_td]:bg-white/5",
  "[&_table.cms-cards_td]:border-0 [&_table.cms-cards_td]:border-t-4 [&_table.cms-cards_td]:border-t-slate-300 [&_table.cms-cards_td]:p-4 [&_table.cms-cards_td]:align-top [&_table.cms-cards_td]:shadow-md",
  "[&_table.cms-columns_td]:border-0 [&_table.cms-columns_td]:align-middle",
  "[&_p.cms-embed-contact-form]:rounded-lg [&_p.cms-embed-contact-form]:border [&_p.cms-embed-contact-form]:border-dashed [&_p.cms-embed-contact-form]:border-slate-400 [&_p.cms-embed-contact-form]:p-3 [&_p.cms-embed-contact-form]:text-slate-500",
  "[&_table.cms-products_td]:border-0 [&_table.cms-products_td]:align-top [&_img.cms-photo-right]:float-right [&_img.cms-photo-right]:ml-6 [&_img.cms-photo-right]:w-2/5 [&_img.cms-photo-right]:rounded-2xl [&_img.cms-photo-right]:shadow-md",
  "[&_table.cms-hero_td]:border-0 [&_table.cms-hero_td]:align-middle [&_table.cms-tiles_td]:border-0 [&_table.cms-tiles_td]:bg-slate-50 [&_table.cms-tiles_td]:p-4 [&_table.cms-tiles_td]:text-center dark:[&_table.cms-tiles_td]:bg-white/5 [&_p.cms-small]:text-xs",
  "[&_hr]:my-4 [&_hr]:border-slate-200 dark:[&_hr]:border-white/10",
  "[&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-slate-100 [&_pre]:p-3 dark:[&_pre]:bg-white/5 [&_code]:text-[13px]",
  "[&_.cms-align-center]:text-center [&_.cms-align-right]:text-right",
].join(" ");
