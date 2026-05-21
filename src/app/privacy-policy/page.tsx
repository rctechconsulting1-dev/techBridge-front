import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | RC Tech Bridge",
  description:
    "How RC Tech Bridge collects, uses, and protects your personal information.",
};

const EFFECTIVE_DATE = "May 20, 2026";
const CONTACT_EMAIL = "rctechconsulting1@gmail.com";
const COMPANY_NAME = "RC Tech Bridge";

export default function PrivacyPolicyPage() {
  return (
    <article className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A0F1E]/5 text-[#0A0F1E] rounded-full border border-[#0A0F1E]/10 mb-6">
          <span className="text-xs font-bold uppercase tracking-widest">
            Legal
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#0A0F1E] mb-4">
          Privacy Policy
        </h1>
        <p className="text-sm text-[#46464c]">
          Effective date: {EFFECTIVE_DATE}
        </p>
      </div>

      <div className="prose prose-gray max-w-none space-y-8 text-[#0A0F1E]">
        <section>
          <h2 className="text-xl font-bold mb-3">1. Who We Are</h2>
          <p className="text-[#46464c] leading-relaxed">
            {COMPANY_NAME} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;)
            provides web development, automation, and AI consulting services.
            This Privacy Policy explains how we collect, use, and protect
            information when you visit our website or contact us. For
            questions, reach us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[#C67C2A] underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">2. Information We Collect</h2>
          <p className="text-[#46464c] leading-relaxed mb-3">
            We collect information you provide directly to us, including:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>Name, email address, and phone number when you contact us or submit a booking request</li>
            <li>Company name and project details you share in contact forms</li>
            <li>Email address if you opt into communications</li>
          </ul>
          <p className="text-[#46464c] leading-relaxed mt-3">
            We also automatically collect limited technical data when you visit
            our site, including IP address, browser type, pages viewed, and
            referring URL. This is collected via standard web server logs and
            any analytics tools we use.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>To respond to your inquiries and fulfill service requests</li>
            <li>To send project-related communications and updates</li>
            <li>To improve our website and services based on usage patterns</li>
            <li>To send periodic updates or promotional content, only if you have opted in</li>
            <li>To comply with applicable laws and protect our legal rights</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">4. Sharing Your Information</h2>
          <p className="text-[#46464c] leading-relaxed">
            We do not sell your personal information. We may share it with:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c] mt-3">
            <li>
              <strong>Service providers</strong> — third-party tools we use to
              operate our business (e.g., email platforms, cloud hosting via
              AWS, analytics). These providers are contractually bound to
              protect your data.
            </li>
            <li>
              <strong>Legal authorities</strong> — if required by law or to
              protect our rights.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">5. Data Retention</h2>
          <p className="text-[#46464c] leading-relaxed">
            We retain your contact information for as long as necessary to
            provide services and fulfill our legal obligations. You may request
            deletion of your data at any time by emailing us.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">6. Cookies</h2>
          <p className="text-[#46464c] leading-relaxed">
            Our site may use cookies for analytics and session management. You
            can disable cookies in your browser settings, though some
            functionality may be affected. We do not use cookies for
            cross-site advertising tracking.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">7. Your Rights</h2>
          <p className="text-[#46464c] leading-relaxed">
            Depending on your jurisdiction, you may have the right to access,
            correct, or delete the personal information we hold about you. To
            exercise any of these rights, email us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[#C67C2A] underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">8. Security</h2>
          <p className="text-[#46464c] leading-relaxed">
            We implement industry-standard security measures including HTTPS
            encryption, secure cloud infrastructure (AWS with IAM roles), and
            access controls to protect your data. No transmission over the
            internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">9. Third-Party Links</h2>
          <p className="text-[#46464c] leading-relaxed">
            Our website may contain links to third-party sites. We are not
            responsible for the privacy practices of those sites and encourage
            you to review their policies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">10. Changes to This Policy</h2>
          <p className="text-[#46464c] leading-relaxed">
            We may update this Privacy Policy from time to time. We will post
            the revised policy on this page with an updated effective date. We
            encourage you to review it periodically.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">11. Contact Us</h2>
          <p className="text-[#46464c] leading-relaxed">
            For any questions about this Privacy Policy, please contact us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[#C67C2A] underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-16 pt-8 border-t border-gray-100 flex gap-6 text-sm">
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
