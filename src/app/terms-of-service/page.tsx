import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | RC Tech Bridge",
  description:
    "Terms and conditions governing the use of RC Tech Bridge services.",
};

const EFFECTIVE_DATE = "May 20, 2026";
const CONTACT_EMAIL = "rctechconsulting1@gmail.com";
const COMPANY_NAME = "RC Tech Bridge";

export default function TermsOfServicePage() {
  return (
    <article className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A0F1E]/5 text-[#0A0F1E] rounded-full border border-[#0A0F1E]/10 mb-6">
          <span className="text-xs font-bold uppercase tracking-widest">
            Legal
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#0A0F1E] mb-4">
          Terms of Service
        </h1>
        <p className="text-sm text-[#46464c]">
          Effective date: {EFFECTIVE_DATE}
        </p>
      </div>

      <div className="prose prose-gray max-w-none space-y-8 text-[#0A0F1E]">
        <section>
          <h2 className="text-xl font-bold mb-3">1. Agreement to Terms</h2>
          <p className="text-[#46464c] leading-relaxed">
            By accessing our website or engaging {COMPANY_NAME} for services,
            you agree to be bound by these Terms of Service. If you do not
            agree, please do not use our website or services. For questions,
            contact us at{" "}
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
          <h2 className="text-xl font-bold mb-3">2. Services</h2>
          <p className="text-[#46464c] leading-relaxed">
            {COMPANY_NAME} provides web development, system integration,
            workflow automation, AI agent implementation, and related technology
            consulting services. The specific scope, timeline, and deliverables
            for each engagement are defined in a separate Statement of Work
            (SOW) or service agreement between the parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">3. Payment Terms</h2>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>All pricing is stated in USD unless otherwise specified.</li>
            <li>
              Monthly retainer plans require a minimum 4-month commitment. Early
              termination may result in a prorated fee as outlined in your
              service agreement.
            </li>
            <li>
              A one-time setup fee applies to most plans and is due before work
              commences.
            </li>
            <li>
              Invoices are due within 15 days of issuance unless otherwise
              agreed. Late payments may accrue interest at 1.5% per month.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">4. Intellectual Property</h2>
          <p className="text-[#46464c] leading-relaxed">
            Upon receipt of full payment, you own the custom code and designs
            we build specifically for your project. {COMPANY_NAME} retains
            ownership of any proprietary frameworks, internal tooling, or
            reusable components incorporated into the work. Open-source
            software used in your project is subject to its respective
            licenses.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">5. Client Responsibilities</h2>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>Provide timely access to systems, credentials, and content needed to complete work</li>
            <li>Review and provide feedback within agreed timeframes</li>
            <li>Ensure you have the rights to any content, images, or materials you provide to us</li>
            <li>Notify us promptly of any issues after launch</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">6. Limitation of Liability</h2>
          <p className="text-[#46464c] leading-relaxed">
            To the maximum extent permitted by law, {COMPANY_NAME} shall not
            be liable for any indirect, incidental, special, or consequential
            damages arising from the use of our services. Our total liability
            for any claim shall not exceed the amount paid by you for the
            specific service giving rise to the claim in the three months
            preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">7. Confidentiality</h2>
          <p className="text-[#46464c] leading-relaxed">
            Both parties agree to keep confidential any proprietary information,
            business data, or trade secrets shared during the engagement.
            This obligation survives termination of the service relationship.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">8. Termination</h2>
          <p className="text-[#46464c] leading-relaxed">
            Either party may terminate a service engagement with 30 days
            written notice, subject to any minimum commitment terms in your
            service agreement. Work completed up to the termination date is
            billable. We reserve the right to terminate immediately for
            non-payment or violation of these terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">9. Governing Law</h2>
          <p className="text-[#46464c] leading-relaxed">
            These Terms shall be governed by the laws of the applicable
            jurisdiction. Any disputes shall be resolved through good-faith
            negotiation first, followed by binding arbitration if unresolved.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">10. Changes to Terms</h2>
          <p className="text-[#46464c] leading-relaxed">
            We may update these Terms from time to time. Continued use of our
            services after changes constitutes acceptance of the updated Terms.
            Material changes will be communicated to active clients by email.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">11. Contact</h2>
          <p className="text-[#46464c] leading-relaxed">
            For any questions about these Terms, email us at{" "}
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
        <Link href="/privacy-policy" className="text-[#C67C2A] hover:underline">
          Privacy Policy →
        </Link>
        <Link href="/help" className="text-[#C67C2A] hover:underline">
          Help Center →
        </Link>
      </div>
    </article>
  );
}
