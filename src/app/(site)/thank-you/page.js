import ContactThankYou from "@/components/storefront/contact/ContactThankYou";

// Where the storefront Contact form (src/components/storefront/contact/ContactForm.js) sends a
// visitor after a successful submission, instead of showing the "sent" message in place of the
// form. Reserved in src/lib/cmsRules.js so a CMS page can never take this slug.
export const metadata = { title: "Thank You | shopmyband.com" };

export default function ThankYouPage() {
  return <ContactThankYou />;
}
