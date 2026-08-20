import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy | RD TechBridge",
  description:
    "How RD TechBridge uses cookies and similar tracking technologies on rctechbridge.com.",
};

const EFFECTIVE_DATE = "August 15, 2026";
const CONTACT_EMAIL = "rctechconsulting1@gmail.com";
const CONTACT_PHONE = "(626) 922-0091";
const COMPANY_NAME = "RD TechBridge, LLC";

const cookieCategories = [
  {
    category: "Strictly necessary",
    purpose:
      "Required for core Site functionality, such as security, form submission, and session management.",
    disable: "No — the Site may not function properly without these.",
  },
  {
    category: "Analytics",
    purpose:
      "Help us understand how visitors use the Site (pages viewed, time on site, navigation paths) via Google Analytics.",
    disable:
      "Yes, via browser settings or the Google Analytics opt-out tool (see Section 4).",
  },
  {
    category: "Advertising / conversion tracking",
    purpose:
      "Used by Google Ads to measure the effectiveness of our ad campaigns and understand which ads led to a form submission or conversion.",
    disable: "Yes, via Google Ads Settings or browser controls (see Section 4).",
  },
];

export default function CookiePolicyPage() {
  return (
    <article className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A0F1E]/5 text-[#0A0F1E] rounded-full border border-[#0A0F1E]/10 mb-6">
          <span className="text-xs font-bold uppercase tracking-widest">
            Legal
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#0A0F1E] mb-4">
          Cookie Policy
        </h1>
        <p className="text-sm text-[#46464c]">
          Effective date: {EFFECTIVE_DATE}
        </p>
      </div>

      <div className="prose prose-gray max-w-none space-y-8 text-[#0A0F1E]">
        <section>
          <p className="text-[#46464c] leading-relaxed">
            This Cookie Policy explains how {COMPANY_NAME} (&quot;RD
            TechBridge,&quot; &quot;we,&quot; &quot;us,&quot; or
            &quot;our&quot;) uses cookies and similar tracking technologies
            on rctechbridge.com (the &quot;Site&quot;), and how you can
            control them. It should be read alongside our{" "}
            <Link href="/privacy-policy" className="text-[#C67C2A] underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">1. What Are Cookies?</h2>
          <p className="text-[#46464c] leading-relaxed">
            Cookies are small text files placed on your device when you
            visit a website. They allow a site to recognize your device,
            remember preferences, and collect information about how the
            site is used. We also use similar technologies such as pixels
            and tags (e.g., the Google Ads conversion tag) that function in
            a comparable way.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">2. Categories of Cookies We Use</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 pr-4 font-bold text-[#0A0F1E]">Category</th>
                  <th className="py-2 pr-4 font-bold text-[#0A0F1E]">Purpose</th>
                  <th className="py-2 font-bold text-[#0A0F1E]">Can you disable it?</th>
                </tr>
              </thead>
              <tbody>
                {cookieCategories.map((row) => (
                  <tr key={row.category} className="border-b border-gray-100 align-top">
                    <td className="py-3 pr-4 font-semibold text-[#0A0F1E] whitespace-nowrap">
                      {row.category}
                    </td>
                    <td className="py-3 pr-4 text-[#46464c] leading-relaxed">{row.purpose}</td>
                    <td className="py-3 text-[#46464c] leading-relaxed">{row.disable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">3. Specific Tools We Use</h2>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>
              <strong>Google Analytics (GA4):</strong> Collects information
              about how visitors interact with the Site, including pages
              visited, time spent, device/browser type, and general
              location. Data is processed by Google in accordance with the
              Google Privacy Policy.
            </li>
            <li>
              <strong>Google Ads Conversion Tracking:</strong> Places a
              cookie when you click one of our Google Search or Display ads
              and helps us measure whether that click led to a contact form
              submission, plan inquiry, or other conversion. This data is
              used to evaluate and optimize our ad campaigns and is
              processed by Google.
            </li>
          </ul>
          <p className="text-[#46464c] leading-relaxed mt-4">
            We do not currently use cookies for cross-site advertising
            retargeting through platforms such as Meta (Facebook/Instagram)
            Pixel. If that changes, we will update this policy before
            deploying any new tracking technology.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">4. How to Control Cookies</h2>
          <p className="text-[#46464c] leading-relaxed mb-2">
            You have several options for managing or disabling cookies:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>
              <strong>Browser settings:</strong> Most browsers let you block
              or delete cookies through their privacy or security settings.
              Note that disabling cookies may affect Site functionality.
            </li>
            <li>
              <strong>Google Analytics opt-out:</strong> Install the Google
              Analytics Opt-out Browser Add-on to prevent your data from
              being used by Google Analytics.
            </li>
            <li>
              <strong>Google Ads settings:</strong> Visit Google Ads
              Settings to control how Google uses your data for ad
              personalization, or opt out of interest-based advertising via
              the Digital Advertising Alliance&apos;s opt-out page.
            </li>
            <li>
              <strong>Mobile device settings:</strong> Most mobile operating
              systems offer settings to limit ad tracking at the device
              level.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">5. Third-Party Cookies</h2>
          <p className="text-[#46464c] leading-relaxed">
            Some cookies on our Site are set by third parties (such as
            Google) rather than by us directly. We do not control these
            cookies, and their use is governed by the applicable third
            party&apos;s own privacy and cookie policies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">6. Changes to This Policy</h2>
          <p className="text-[#46464c] leading-relaxed">
            We may update this Cookie Policy as our use of cookies and
            tracking technologies changes, including if we add new
            analytics or advertising tools. We will post the revised policy
            on this page with an updated effective date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">7. Contact Us</h2>
          <p className="text-[#46464c] leading-relaxed">
            Questions about this Cookie Policy can be sent to:
          </p>
          <p className="text-[#46464c] leading-relaxed mt-2">
            {COMPANY_NAME}
            <br />
            Email:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#C67C2A] underline">
              {CONTACT_EMAIL}
            </a>
            <br />
            Phone: {CONTACT_PHONE}
          </p>
        </section>
      </div>

      <div className="mt-16 pt-8 border-t border-gray-100 flex flex-wrap gap-6 text-sm">
        <Link href="/privacy-policy" className="text-[#C67C2A] hover:underline">
          Privacy Policy →
        </Link>
        <Link href="/terms-of-service" className="text-[#C67C2A] hover:underline">
          Terms of Service →
        </Link>
        <Link href="/help" className="text-[#C67C2A] hover:underline">
          Help Center →
        </Link>
      </div>
    </article>
  );
}
