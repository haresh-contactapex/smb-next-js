// The editable content of the storefront home page, shared by the admin form and the
// server (so a mistake is caught in the browser and again before anything is saved),
// plus the content the home page shows until staff have saved their own.
// See docs/storefront/home-page.md.

export const ASSURANCE_ICONS = [
  { value: "diamond", label: "Certificate" },
  { value: "truck", label: "Shipping box" },
  { value: "heart", label: "Returns box" },
  { value: "shield", label: "Cleaning" },
];

// Shapes the home page cycles through, so the hero photos in a column differ in height.
export const HERO_PHOTO_RATIOS = ["aspect-[4/5]", "aspect-[3/4]", "aspect-square"];

export const LIMITS = {
  heroPhotos: { min: 2, max: 8 },
  perks: { min: 1, max: 6 },
  collections: { min: 2, max: 8 },
  assurances: { min: 1, max: 6 },
};

export const DEFAULT_HOME_PAGE = {
  hero: {
    titleLead: "A Lifetime of",
    titleAccent: "love.",
    title: "dedicated to creating custom wedding bands for men and women.",
    intro:
      "Whether you're searching for classic diamond wedding bands, unique men's wedding bands, or gold wedding bands for women, Shop My Band has you covered. Our collection includes an array of stunning eternity bands, and more. If you're looking for a touch of luxury, we also offer rose gold wedding bands.",
    buttonLabel: "Shop Now",
    buttonHref: "/women-wedding-bands",
    photosLeft: [
      { src: "/storefront/wedding-bands/hero.jpg", alt: "Hands wearing wedding bands", position: "60% center" },
      { src: "/storefront/wwb_top_banner.jpg", alt: "Hand holding stacked diamond bands", position: "72% center" },
      { src: "/storefront/wedding-band-new/hero.jpg", alt: "Hands wearing wedding bands", position: "center" },
    ],
    photosRight: [
      { src: "/storefront/classic-bands/hero.jpg", alt: "Couple wearing wedding bands", position: "45% center" },
      { src: "/storefront/anniversary-bands/hero.jpg", alt: "Anniversary bands", position: "center" },
      { src: "/storefront/wwb_top_banner.jpg", alt: "Woman wearing stacked wedding bands", position: "30% center" },
    ],
  },
  perks: ["Free shipping to US", "30-day return policy", "Free lifetime cleaning & inspection"],
  collections: [
    {
      label: "Wedding Bands",
      href: "/women-wedding-bands",
      src: "/storefront/wedding-bands/hero.jpg",
      text: "Custom wedding bands for men and women, crafted in white, yellow and rose gold and platinum.",
    },
    {
      label: "Classic Bands",
      href: "/collections/classic-bands",
      src: "/storefront/classic-bands/womens-classic-wedding-bands.jpg",
      text: "Timeless plain and comfort-fit bands in polished, matte and brushed finishes.",
    },
    {
      label: "Eternity Bands",
      href: "/collections/eternity-bands",
      src: "/storefront/anniversary-bands/womens-anniversary-bands.jpg",
      text: "Discover eternity bands featuring diamonds or gemstones that encircle the entire ring, creating a timeless symbol of everlasting love.",
    },
    {
      label: "Anniversary Bands",
      href: "/collections/anniversary-bands",
      src: "/storefront/anniversary-bands/hero.jpg",
      text: "Celebrate every milestone with diamond anniversary bands made to be worn for a lifetime.",
    },
  ],
  story: {
    since: "Since 2001",
    text:
      "shopmyband.com is a division of My Bridal Ring focused on custom wedding bands for men and women. My Bridal Ring is a manufacturer based in the Los Angeles area for over 25 years. It is family owned and operated with over 60 years of combined experience from diamond manufacturing from rough diamonds to entire process of jewelry manufacturing.",
    heading: "Our Story",
    buttonLabel: "Shop Now",
    buttonHref: "/women-wedding-bands",
    imageSrc: "/storefront/wwb_top_banner.jpg",
    imageAlt: "Hand wearing stacked wedding bands",
  },
  assurances: [
    { icon: "diamond", title: "Certified by GIA", text: "A guarantee of quality and authenticity, you can trust." },
    { icon: "truck", title: "Free Shipping", text: "Ships across the United States at no additional cost." },
    { icon: "heart", title: "30-Day Return Policy", text: "Satisfaction guaranteed or your money back is our promise." },
    { icon: "shield", title: "Free Lifetime Cleaning & Inspection", text: "Professional services to maintain the safety and brilliance of your jewelry." },
  ],
  newsletterHeading: "Stay in the Loop for discounts and offers",
};

// A link may go to a page of this site ("/collections/x") or to https://. Never "//host",
// "javascript:" or other schemes, since the address ends up in an <a href>.
const isSafeAddress = (value) => (value.startsWith("/") && !value.startsWith("//") && !/[\s\\]/.test(value)) || /^https:\/\/[^\s]+$/i.test(value);

const POSITION_PATTERN = /^(center|\d{1,3}%)( (center|\d{1,3}%))?$/;

const text = (value) => String(value ?? "").replace(/\r\n?/g, "\n").trim();

/**
 * Checks and cleans home page content. Returns { content, errors } where `errors` is
 * { [dotted path]: message } (for example "collections.1.href") and `content` is the
 * cleaned copy. Anything unknown in `input` is dropped.
 */
export function normalizeHomePage(input) {
  const errors = {};
  const source = input && typeof input === "object" ? input : {};

  const field = (path, value, { label, max, required = true, multiline = false }) => {
    const cleaned = multiline ? text(value) : text(value).replace(/\s+/g, " ");
    if (!cleaned && required) errors[path] = `${label} is required.`;
    else if (cleaned.length > max) errors[path] = `${label} must be ${max} characters or fewer.`;
    return cleaned;
  };
  const address = (path, value, label) => {
    const cleaned = field(path, value, { label, max: 300 });
    if (cleaned && !errors[path] && !isSafeAddress(cleaned)) {
      errors[path] = `${label} must start with / (a page of this site) or https://.`;
    }
    return cleaned;
  };
  const image = (path, value, label) => {
    const cleaned = field(path, value, { label, max: 500 });
    if (cleaned && !errors[path] && !isSafeAddress(cleaned)) errors[path] = `${label} must be an image from the Media library or an https:// address.`;
    return cleaned;
  };
  const list = (path, value, { min, max, label }) => {
    const items = Array.isArray(value) ? value : [];
    if (items.length < min) errors[path] = `Add at least ${min} ${label}.`;
    else if (items.length > max) errors[path] = `Use at most ${max} ${label}.`;
    return items.slice(0, max);
  };

  const hero = source.hero && typeof source.hero === "object" ? source.hero : {};
  const photos = (key) =>
    list(`hero.${key}`, hero[key], { ...LIMITS.heroPhotos, label: "photos" }).map((photo, index) => {
      const p = photo && typeof photo === "object" ? photo : {};
      const position = text(p.position);
      return {
        src: image(`hero.${key}.${index}.src`, p.src, "Photo"),
        alt: field(`hero.${key}.${index}.alt`, p.alt, { label: "Description", max: 200, required: false }),
        position: POSITION_PATTERN.test(position) ? position : "center",
      };
    });

  const story = source.story && typeof source.story === "object" ? source.story : {};

  const content = {
    hero: {
      titleLead: field("hero.titleLead", hero.titleLead, { label: "Headline start", max: 80, required: false }),
      titleAccent: field("hero.titleAccent", hero.titleAccent, { label: "Highlighted word", max: 40, required: false }),
      title: field("hero.title", hero.title, { label: "Headline", max: 200 }),
      intro: field("hero.intro", hero.intro, { label: "Introduction", max: 1000, multiline: true }),
      buttonLabel: field("hero.buttonLabel", hero.buttonLabel, { label: "Button text", max: 40 }),
      buttonHref: address("hero.buttonHref", hero.buttonHref, "Button link"),
      photosLeft: photos("photosLeft"),
      photosRight: photos("photosRight"),
    },
    perks: list("perks", source.perks, { ...LIMITS.perks, label: "lines" }).map((perk, index) =>
      field(`perks.${index}`, perk, { label: "Text", max: 80 }),
    ),
    collections: list("collections", source.collections, { ...LIMITS.collections, label: "collections" }).map((item, index) => {
      const c = item && typeof item === "object" ? item : {};
      return {
        label: field(`collections.${index}.label`, c.label, { label: "Name", max: 60 }),
        href: address(`collections.${index}.href`, c.href, "Link"),
        src: image(`collections.${index}.src`, c.src, "Photo"),
        text: field(`collections.${index}.text`, c.text, { label: "Hover text", max: 300, multiline: true }),
      };
    }),
    story: {
      since: field("story.since", story.since, { label: "Side text", max: 40, required: false }),
      text: field("story.text", story.text, { label: "Story text", max: 1500, multiline: true }),
      heading: field("story.heading", story.heading, { label: "Heading", max: 60 }),
      buttonLabel: field("story.buttonLabel", story.buttonLabel, { label: "Button text", max: 40 }),
      buttonHref: address("story.buttonHref", story.buttonHref, "Button link"),
      imageSrc: image("story.imageSrc", story.imageSrc, "Photo"),
      imageAlt: field("story.imageAlt", story.imageAlt, { label: "Photo description", max: 200, required: false }),
    },
    assurances: list("assurances", source.assurances, { ...LIMITS.assurances, label: "items" }).map((item, index) => {
      const a = item && typeof item === "object" ? item : {};
      const icon = text(a.icon);
      if (!ASSURANCE_ICONS.some((option) => option.value === icon)) errors[`assurances.${index}.icon`] = "Choose an icon.";
      return {
        icon,
        title: field(`assurances.${index}.title`, a.title, { label: "Title", max: 80 }),
        text: field(`assurances.${index}.text`, a.text, { label: "Text", max: 200, multiline: true }),
      };
    }),
    newsletterHeading: field("newsletterHeading", source.newsletterHeading, { label: "Heading", max: 120 }),
  };

  return { content, errors };
}
