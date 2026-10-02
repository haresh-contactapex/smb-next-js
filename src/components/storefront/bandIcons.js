// Line icons for the wedding-band mega menu, in the same outline style as
// ./icons.js (24x24 grid, round caps). Each is a list of paths plus an optional
// stroke width; the thin band is drawn lighter so it reads as thin next to the
// wide men's band.
const BAND_ICONS = {
  // Band with a stone set on top.
  women: { paths: ["M18.5 15.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z", "M9 5.5L10.5 3h3L15 5.5 12 9z", "M9 5.5h6"] },
  // Plain wide band: two circles far apart.
  men: { paths: ["M21 12a9 9 0 11-18 0 9 9 0 0118 0z", "M17 12a5 5 0 11-10 0 5 5 0 0110 0z"] },
  // Geometric band: a faceted outline and finger hole instead of round ones.
  contemporary: { paths: ["M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z", "M12 7l4.33 2.5v5L12 17l-4.33-2.5v-5z"] },
  // Cut stone.
  labDiamond: { paths: ["M6.5 3.5h11L22 9.5 12 21 2 9.5z", "M2 9.5h20", "M9 3.5L7.5 9.5 12 21", "M15 3.5l1.5 6L12 21"] },
  // Band that arches over, like one that curves around a stone.
  curved: { paths: ["M3 19C3 11 7 4.5 12 4.5S21 11 21 19", "M8 19c0-5 1.5-9 4-9s4 4 4 9", "M3 19h5", "M16 19h5"] },
  // A single fine circle.
  thin: { paths: ["M20 12a8 8 0 11-16 0 8 8 0 0116 0z"], strokeWidth: 1 },
};

export default function BandIcon({ name, className = "h-[18px] w-[18px]" }) {
  const icon = BAND_ICONS[name];
  if (!icon) return null;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={icon.strokeWidth || 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {icon.paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
