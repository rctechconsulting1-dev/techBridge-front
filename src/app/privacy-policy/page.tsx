import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | RD TechBridge",
  description:
    "How RD TechBridge collects, uses, and protects your personal information.",
};

const EFFECTIVE_DATE = "August 15, 2026";
const CONTACT_EMAIL = "rctechconsulting1@gmail.com";
const CONTACT_PHONE = "(626) 922-0091";
const COMPANY_NAME = "RD TechBridge, LLC";

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
            {COMPANY_NAME} (&quot;RD TechBridge,&quot; &quot;we,&quot;
            &quot;us,&quot; or &quot;our&quot;) is a California limited
            liability company that provides website development, digital
            advertising management, AI agent implementation, and related
            technology consulting services. This Privacy Policy explains how
            we collect, use, disclose, and protect information when you
            visit rctechbridge.com (the &quot;Site&quot;), submit a contact
            or booking form, or engage us as a client.
          </p>
          <p className="text-[#46464c] leading-relaxed mt-3">
            If you do not agree with this Privacy Policy, please do not use
            the Site or provide us with personal information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">2. Information We Collect</h2>
          <p className="text-[#46464c] leading-relaxed mb-2 font-semibold">
            Information you provide directly:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>Name, email address, and phone number when you contact us, request a demo, or submit a booking or plan inquiry</li>
            <li>Company name, service needed, and project details submitted through contact or onboarding forms</li>
            <li>Billing and payment information when you become a client (processed by our third-party payment processor — see Section 4)</li>
            <li>Any other information you choose to share with us, such as login credentials or content you provide for us to build or manage on your behalf as part of a service engagement</li>
          </ul>
          <p className="text-[#46464c] leading-relaxed mt-4 mb-2 font-semibold">
            Information collected automatically:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>IP address, browser type and version, device type, operating system, pages viewed, time spent on pages, and referring/exit URLs</li>
            <li>Approximate location (derived from IP address)</li>
            <li>
              Cookie and tracking data from Google Analytics and Google Ads
              conversion tracking (see our{" "}
              <Link href="/cookie-policy" className="text-[#C67C2A] underline">
                Cookie Policy
              </Link>{" "}
              for full details)
            </li>
          </ul>
          <p className="text-[#46464c] leading-relaxed mt-4">
            We do not knowingly collect sensitive personal information (such
            as Social Security numbers, financial account credentials, or
            health information) through the Site unless you voluntarily
            provide it in the course of a service engagement, and only to
            the extent necessary to deliver that service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">3. How We Use Your Information</h2>
          <p className="text-[#46464c] leading-relaxed mb-2">
            We use the information we collect to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>Respond to inquiries, schedule consultations, and process plan/service requests</li>
            <li>Deliver, manage, and support the services outlined in your Statement of Work or service agreement</li>
            <li>Process payments and manage billing for subscription plans</li>
            <li>Send project-related communications, invoices, and service updates</li>
            <li>Send marketing or promotional communications, only where you have opted in (you may opt out at any time)</li>
            <li>Analyze Site usage and ad campaign performance to improve our website, services, and marketing</li>
            <li>Detect, prevent, and address fraud, security issues, or technical problems</li>
            <li>Comply with legal obligations and enforce our agreements</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">4. How We Share Your Information</h2>
          <p className="text-[#46464c] leading-relaxed mb-2">
            We do not sell or rent your personal information. We may share
            it with:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>
              Service providers who perform functions on our behalf,
              including cloud hosting (AWS), email and communications
              platforms, payment processing (e.g., Stripe), scheduling
              tools, and analytics/advertising platforms (Google Analytics,
              Google Ads). These providers are contractually restricted from
              using your data for purposes unrelated to the services they
              provide us.
            </li>
            <li>Professional advisors, such as accountants or attorneys, where necessary to operate our business.</li>
            <li>
              Legal and regulatory authorities, if required by law,
              subpoena, or legal process, or to protect the rights,
              property, or safety of RD TechBridge, our clients, or others.
            </li>
            <li>A successor entity, in the event of a merger, acquisition, or sale of assets, subject to standard confidentiality protections.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">5. Cookies and Tracking Technologies</h2>
          <p className="text-[#46464c] leading-relaxed">
            We use cookies and similar technologies, including Google
            Analytics and Google Ads conversion tracking, to understand Site
            usage and measure advertising performance. Full details,
            including how to opt out, are available in our{" "}
            <Link href="/cookie-policy" className="text-[#C67C2A] underline">
              Cookie Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">6. Data Retention</h2>
          <p className="text-[#46464c] leading-relaxed">
            We retain personal information for as long as necessary to
            fulfill the purposes described in this Policy, including the
            duration of any client engagement plus a reasonable period
            afterward for accounting, legal, and record-keeping purposes,
            unless a longer retention period is required by law. Contact
            form submissions that do not result in a client relationship are
            generally retained for up to 24 months, after which they are
            deleted or anonymized.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">7. Your Privacy Rights</h2>
          <p className="text-[#46464c] leading-relaxed mb-2">
            Depending on where you live, you may have rights regarding your
            personal information, including the right to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>Know what personal information we have collected about you and how it has been used and shared</li>
            <li>Request access to or a copy of your personal information</li>
            <li>Request correction of inaccurate personal information</li>
            <li>Request deletion of your personal information</li>
            <li>
              Opt out of the sale or &quot;sharing&quot; of personal
              information (RD TechBridge does not sell personal information
              and does not &quot;share&quot; it for cross-context behavioral
              advertising as those terms are defined under the California
              Consumer Privacy Act, as amended by the California Privacy
              Rights Act (&quot;CCPA/CPRA&quot;))
            </li>
            <li>Not be discriminated against for exercising your privacy rights</li>
          </ul>
          <p className="text-[#46464c] leading-relaxed mt-4">
            <strong>California residents:</strong> To the extent the
            CCPA/CPRA applies to our business, you have the rights described
            above. We do not knowingly sell or share the personal
            information of consumers we know to be under 16 years of age.
          </p>
          <p className="text-[#46464c] leading-relaxed mt-3">
            To exercise any privacy right, email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#C67C2A] underline">
              {CONTACT_EMAIL}
            </a>{" "}
            with your request. We will verify your identity before
            fulfilling the request and will respond within the time required
            by applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">8. Children&apos;s Privacy</h2>
          <p className="text-[#46464c] leading-relaxed">
            Our Site and services are not directed to individuals under 18,
            and we do not knowingly collect personal information from
            children. If you believe a child has provided us with personal
            information, contact us so we can delete it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">9. Security</h2>
          <p className="text-[#46464c] leading-relaxed">
            We use industry-standard safeguards to protect personal
            information, including HTTPS encryption, secure cloud
            infrastructure with access controls (AWS with IAM role-based
            permissions), and limited internal access to personal data. No
            method of transmission or storage is 100% secure, and we cannot
            guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">10. Third-Party Links</h2>
          <p className="text-[#46464c] leading-relaxed">
            The Site may link to third-party websites, including social
            media pages and client sites we have built. We are not
            responsible for the content or privacy practices of third-party
            sites and encourage you to review their policies before
            providing information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">11. Do Not Track</h2>
          <p className="text-[#46464c] leading-relaxed">
            Some browsers offer a &quot;Do Not Track&quot; signal. Because
            there is no accepted industry standard for how to respond to
            these signals, our Site does not currently respond to them.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">12. International Users</h2>
          <p className="text-[#46464c] leading-relaxed">
            Our services are directed at businesses and individuals located
            in the United States. If you access the Site from outside the
            United States, your information will be transferred to and
            processed in the United States, which may have different data
            protection laws than your country of residence.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">13. Changes to This Policy</h2>
          <p className="text-[#46464c] leading-relaxed">
            We may update this Privacy Policy from time to time to reflect
            changes in our practices or for legal, operational, or
            regulatory reasons. We will post the revised policy on this page
            with an updated effective date, and for material changes, we
            will notify active clients by email.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">14. Contact Us</h2>
          <p className="text-[#46464c] leading-relaxed">
            Questions or requests regarding this Privacy Policy or your
            personal information can be sent to:
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
            <br />
            Location: California, United States
          </p>
        </section>
      </div>

      <div className="mt-16 pt-8 border-t border-gray-100 flex flex-wrap gap-6 text-sm">
        <Link href="/terms-of-service" className="text-[#C67C2A] hover:underline">
          Terms of Service →
        </Link>
        <Link href="/cookie-policy" className="text-[#C67C2A] hover:underline">
          Cookie Policy →
        </Link>
        <Link href="/data-processing-agreement" className="text-[#C67C2A] hover:underline">
          Data Processing Agreement →
        </Link>
        <Link href="/help" className="text-[#C67C2A] hover:underline">
          Help Center →
        </Link>
      </div>
    </article>
  );
}
