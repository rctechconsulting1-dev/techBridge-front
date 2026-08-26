import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | RD TechBridge",
  description:
    "Terms and conditions governing the use of RD TechBridge services.",
};

const EFFECTIVE_DATE = "August 15, 2026";
const CONTACT_EMAIL = "rctechconsulting1@gmail.com";
const CONTACT_PHONE = "(626) 922-0091";
const COMPANY_NAME = "RD TechBridge, LLC";

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
            These Terms of Service (&quot;Terms&quot;) govern your access to
            and use of rctechbridge.com (the &quot;Site&quot;) and any web
            development, digital advertising management, AI agent,
            automation, or consulting services provided by {COMPANY_NAME}{" "}
            (&quot;RD TechBridge,&quot; &quot;we,&quot; &quot;us,&quot; or
            &quot;our&quot;), a California limited liability company. By
            accessing the Site, submitting a contact or Plan inquiry, or
            engaging us for services, you (&quot;Client,&quot; &quot;you&quot;)
            agree to be bound by these Terms. If you do not agree, do not use
            the Site or our services.
          </p>
          <p className="text-[#46464c] leading-relaxed mt-3">
            If you purchase a recurring Starter, Professional, Business, or
            Enterprise plan, our{" "}
            <Link href="/subscription-terms" className="text-[#C67C2A] underline">
              Paid Plan Subscription Terms &amp; Conditions
            </Link>{" "}
            also apply and are incorporated into these Terms by reference.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">2. Services</h2>
          <p className="text-[#46464c] leading-relaxed">
            RD TechBridge provides website development, system integration,
            workflow and business process automation, AI agent
            implementation, digital advertising management (Google Ads, Meta
            Ads), and related technology consulting services (collectively,
            the &quot;Services&quot;). The specific scope, deliverables,
            timeline, and fees for each engagement are defined in a separate
            Statement of Work (&quot;SOW&quot;), order form, or service
            agreement between you and RD TechBridge. In the event of a
            conflict between these Terms and a signed SOW, the SOW controls
            with respect to the matters it addresses.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">3. Eligibility</h2>
          <p className="text-[#46464c] leading-relaxed">
            You must be at least 18 years old and have the authority to bind
            the business or entity on whose behalf you are engaging our
            Services to agree to these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">4. Payment Terms</h2>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>All pricing is stated in U.S. dollars unless otherwise specified.</li>
            <li>
              For recurring Plan subscriptions, billing, minimum commitment
              terms, renewal, and cancellation are governed by our{" "}
              <Link href="/subscription-terms" className="text-[#C67C2A] underline">
                Paid Plan Subscription Terms &amp; Conditions
              </Link>
              .
            </li>
            <li>
              For project-based or non-recurring engagements, payment terms
              (deposits, milestones, invoicing schedule) are set out in your
              SOW. Unless otherwise agreed, invoices are due within 15 days
              of issuance, and late payments may accrue interest at 1.5% per
              month or the maximum rate permitted by law, whichever is lower.
            </li>
            <li>
              We reserve the right to pause work on any engagement with an
              outstanding invoice more than 15 days past due.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">
            5. Access Credentials and Third-Party Accounts
          </h2>
          <p className="text-[#46464c] leading-relaxed">
            Delivering our Services may require access to your website
            hosting, domain registrar, Google/Meta advertising accounts,
            Google Business Profile, or other third-party accounts. You are
            responsible for the accuracy of any credentials or permissions
            you provide and for ensuring you have the authority to grant us
            access. We are not responsible for actions taken by third-party
            platforms (including account suspension, policy changes, or ad
            disapprovals) that are outside our control.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">6. Intellectual Property</h2>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>
              <strong>Client deliverables:</strong> Upon receipt of full
              payment for a given deliverable, you own the custom code,
              designs, and content created specifically for your project,
              excluding any pre-existing or reusable materials described
              below.
            </li>
            <li>
              <strong>RD TechBridge tools:</strong> We retain ownership of
              any proprietary frameworks, templates, internal tooling, AI
              agent configurations, or other reusable components we
              developed prior to or independent of your engagement, even if
              incorporated into your project. We grant you a non-exclusive,
              royalty-free license to use such components as part of your
              delivered project for as long as you remain a client in good
              standing or as otherwise agreed in your SOW.
            </li>
            <li>
              <strong>Open-source and third-party software:</strong> Any
              open-source or third-party software used in your project
              remains subject to its own license terms.
            </li>
            <li>
              <strong>Site content:</strong> All content on the Site
              (excluding client-submitted content) is owned by RD
              TechBridge or its licensors and may not be copied or reused
              without permission.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">7. Client Responsibilities</h2>
          <p className="text-[#46464c] leading-relaxed mb-2">You agree to:</p>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>Provide timely access to systems, credentials, and content reasonably needed to perform the Services</li>
            <li>Review deliverables and provide feedback within the timeframes agreed in your SOW</li>
            <li>Ensure you own or have the rights to use any content, images, trademarks, or materials you provide to us</li>
            <li>Comply with the terms of service and advertising policies of any third-party platform we manage on your behalf (e.g., Google Ads policies)</li>
            <li>Notify us promptly of any issues, bugs, or concerns after launch or deployment</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">8. Acceptable Use</h2>
          <p className="text-[#46464c] leading-relaxed">
            You may not use the Site or Services to: violate any law;
            infringe on the rights of others; transmit malicious code;
            attempt to gain unauthorized access to our systems or those of
            other clients; or use our AI agents or automation tools to send
            unlawful, deceptive, or unsolicited communications (including in
            violation of the CAN-SPAM Act or Telephone Consumer Protection
            Act).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">9. Disclaimers</h2>
          <p className="text-[#46464c] leading-relaxed">
            The Site and any general information on it are provided
            &quot;as is&quot; without warranties of any kind, express or
            implied. Except as expressly stated in a signed SOW, we do not
            guarantee specific business outcomes, search rankings,
            advertising performance, conversion rates, or revenue results
            from our Services, as these depend on factors outside our
            control.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">10. Limitation of Liability</h2>
          <p className="text-[#46464c] leading-relaxed">
            To the maximum extent permitted by law, RD TechBridge shall not
            be liable for any indirect, incidental, special, consequential,
            or punitive damages, or any loss of profits, revenue, data, or
            business opportunity, arising from your use of the Site or our
            Services. Our total aggregate liability for any claim arising
            out of or relating to these Terms or our Services shall not
            exceed the amount you paid us for the specific Service giving
            rise to the claim during the three (3) months preceding the
            event giving rise to the claim.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">11. Indemnification</h2>
          <p className="text-[#46464c] leading-relaxed">
            You agree to indemnify and hold RD TechBridge harmless from any
            claims, damages, or expenses (including reasonable attorneys&apos;
            fees) arising from: your breach of these Terms; content or
            materials you provide to us; or your violation of any law or
            third-party right.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">12. Confidentiality</h2>
          <p className="text-[#46464c] leading-relaxed">
            Both parties agree to keep confidential any proprietary
            information, business data, credentials, or trade secrets
            disclosed during the engagement, and to use such information
            only as necessary to perform obligations under these Terms.
            This obligation survives termination of the relationship.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">13. Termination</h2>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>
              Either party may terminate a non-Plan service engagement with
              30 days&apos; written notice, subject to any minimum
              commitment or notice terms in your SOW.
            </li>
            <li>
              Termination of a Plan subscription is governed by our{" "}
              <Link href="/subscription-terms" className="text-[#C67C2A] underline">
                Subscription Terms
              </Link>
              .
            </li>
            <li>Work completed and expenses incurred up to the termination date are billable.</li>
            <li>
              We may terminate or suspend Services immediately for
              non-payment, violation of these Terms, or unlawful use of our
              Services.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">
            14. Dispute Resolution and Governing Law
          </h2>
          <p className="text-[#46464c] leading-relaxed">
            These Terms are governed by the laws of the State of California,
            without regard to its conflict-of-laws principles. Any dispute
            arising out of or relating to these Terms or our Services will
            first be addressed through good-faith negotiation. If unresolved
            within 30 days, the dispute will be submitted to binding
            arbitration in California under the rules of the American
            Arbitration Association, except that either party may seek
            injunctive relief in court to protect confidential information
            or intellectual property. Venue for any court proceeding
            permitted under these Terms shall be in the state or federal
            courts located in California.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">15. Changes to These Terms</h2>
          <p className="text-[#46464c] leading-relaxed">
            We may update these Terms from time to time. Continued use of
            the Site or Services after changes take effect constitutes
            acceptance of the updated Terms. Material changes affecting
            active clients will be communicated by email.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">
            16. Severability and Entire Agreement
          </h2>
          <p className="text-[#46464c] leading-relaxed">
            If any provision of these Terms is found unenforceable, the
            remaining provisions remain in full effect. These Terms,
            together with any applicable SOW and our Subscription Terms,
            constitute the entire agreement between you and RD TechBridge
            regarding the Services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">17. Contact</h2>
          <p className="text-[#46464c] leading-relaxed">
            Questions about these Terms can be sent to:
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
        <Link href="/privacy-policy" className="text-[#C67C2A] hover:underline">
          Privacy Policy →
        </Link>
        <Link href="/cookie-policy" className="text-[#C67C2A] hover:underline">
          Cookie Policy →
        </Link>
        <Link href="/subscription-terms" className="text-[#C67C2A] hover:underline">
          Subscription Terms →
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
