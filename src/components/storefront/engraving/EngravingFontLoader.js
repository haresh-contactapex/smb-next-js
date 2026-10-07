import { engravingFontsHref } from "@/lib/engravingRules";

// Loads the Google Fonts the engraving previews use. React hoists the stylesheet link into
// <head> and de-duplicates it (the same approach as GoogleSansFont), and the href is built only
// from validated Google Fonts family names. System fonts such as Arial need nothing.
export default function EngravingFontLoader({ fonts }) {
  const href = engravingFontsHref(fonts);
  if (!href) return null;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={href} precedence="default" />
    </>
  );
}
