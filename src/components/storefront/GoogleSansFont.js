// Google Sans isn't in next/font's built-in list for this Next version (only
// "Google Sans Code"), so it is loaded from the Google Fonts stylesheet as a
// variable font (weights 400-700). Render this once per customer-facing shell
// and apply the .font-google-sans class (globals.css) to that shell's root.
// `precedence` makes React hoist the link into <head> and de-duplicate it.
const GOOGLE_SANS_CSS = "https://fonts.googleapis.com/css2?family=Google+Sans:wght@400..700&display=swap";

export default function GoogleSansFont() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={GOOGLE_SANS_CSS} precedence="default" />
    </>
  );
}
