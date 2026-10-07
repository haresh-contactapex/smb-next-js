// Share links for a post. They are plain links to each network's share page (nothing is
// loaded from them until a visitor clicks), so `url` is the post's absolute address.
const NETWORKS = [
  {
    label: "Facebook",
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    path: "M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.6V21h2.9z",
  },
  {
    label: "X",
    href: (url, title) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    label: "Pinterest",
    href: (url, title, image) =>
      `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(title)}${image ? `&media=${encodeURIComponent(image)}` : ""}`,
    path: "M12 2C6.48 2 2 6.48 2 12c0 4.24 2.65 7.86 6.39 9.29-.09-.78-.17-1.98.04-2.83.18-.77 1.22-5.15 1.22-5.15s-.31-.62-.31-1.54c0-1.44.84-2.52 1.88-2.52.89 0 1.32.67 1.32 1.47 0 .9-.57 2.24-.86 3.49-.25 1.04.52 1.89 1.54 1.89 1.85 0 3.27-1.95 3.27-4.76 0-2.49-1.79-4.23-4.35-4.23-2.96 0-4.7 2.22-4.7 4.52 0 .9.34 1.86.78 2.38.09.1.1.19.07.3-.08.33-.26 1.04-.29 1.19-.05.19-.15.23-.35.14-1.3-.6-2.12-2.5-2.12-4.03 0-3.28 2.39-6.3 6.88-6.3 3.61 0 6.42 2.57 6.42 6.01 0 3.59-2.26 6.47-5.4 6.47-1.05 0-2.05-.55-2.39-1.2l-.65 2.42c-.24.9-.88 2.02-1.31 2.7.99.31 2.04.47 3.14.47 5.52 0 10-4.48 10-10S17.52 2 12 2z",
  },
];

export default function BlogShare({ url, title, image = "" }) {
  return (
    <div className="flex items-center gap-3 text-[15px] text-[#555555]">
      <span>Share:</span>
      <ul className="flex items-center gap-3">
        {NETWORKS.map((network) => (
          <li key={network.label}>
            <a
              href={network.href(url, title, image)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Share on ${network.label}`}
              title={`Share on ${network.label}`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#333333] transition-colors hover:text-[#ef9822]"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
                <path d={network.path} />
              </svg>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
