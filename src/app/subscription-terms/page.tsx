import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Paid Plan Subscription Terms & Conditions | RD TechBridge",
  description:
    "Billing, commitment term, renewal, and cancellation terms governing RD TechBridge Starter, Professional, Business, and Enterprise plans.",
};

const EFFECTIVE_DATE = "August 15, 2026";
const CONTACT_EMAIL = "rctechconsulting1@gmail.com";
const CONTACT_PHONE = "(626) 922-0091";
const COMPANY_NAME = "RD TechBridge, LLC";

export default function SubscriptionTermsPage() {
  return (
    <article className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A0F1E]/5 text-[#0A0F1E] rounded-full border border-[#0A0F1E]/10 mb-6">
          <span className="text-xs font-bold uppercase tracking-widest">
            Legal
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#0A0F1E] mb-4">
          Paid Plan Subscription Terms &amp; Conditions
        </h1>
        <p className="text-sm text-[#46464c]">
          Effective date: {EFFECTIVE_DATE}
        </p>
      </div>

      <div className="prose prose-gray max-w-none space-y-8 text-[#0A0F1E]">
        <section>
          <p className="text-[#46464c] leading-relaxed">
            These Subscription Terms &amp; Conditions (&quot;Subscription
            Terms&quot;) supplement and are incorporated into our{" "}
            <Link href="/terms-of-service" className="text-[#C67C2A] underline">
              Terms of Service
            </Link>{" "}
            and govern your purchase of a recurring Starter, Professional,
            Business, or Enterprise plan (each, a &quot;Plan&quot;) from{" "}
            {COMPANY_NAME} (&quot;RD TechBridge,&quot; &quot;we,&quot;
            &quot;us,&quot; or &quot;our&quot;). By submitting a Plan
            inquiry, signing a service agreement, or making a first payment,
            you (&quot;Client,&quot; &quot;you&quot;) agree to these
            Subscription Terms. In the event of a conflict between these
            Subscription Terms and your signed service agreement or
            Statement of Work (&quot;SOW&quot;), the signed agreement
            controls.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">1. Plans Offered</h2>
          <p className="text-[#46464c] leading-relaxed mb-2">
            We currently offer the following Plans, described in full on our{" "}
            <Link href="/plans" className="text-[#C67C2A] underline">
              Plans page
            </Link>
            :
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li><strong>Starter</strong> — core website and hosting, SEO basics, lead capture, basic metrics reporting</li>
            <li><strong>Professional</strong> — Starter features plus appointment scheduling, Google Business Profile setup, lead-gen emails, advanced metrics, and up to 5 custom pages</li>
            <li><strong>Business</strong> — Professional features plus e-commerce/Stripe checkout, initial Google Ads setup, lead-gen calls, and priority support</li>
            <li><strong>Enterprise</strong> — custom, multi-location solutions with negotiated terms, quoted and contracted separately</li>
          </ul>
          <p className="text-[#46464c] leading-relaxed mt-4">
            Plan features, exact pricing, and setup fees are confirmed on
            your kickoff call and documented in your SOW or order form.
            Displayed pricing on our website (&quot;Starting at...&quot;) is
            indicative and may vary based on your business&apos;s specific
            requirements.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">2. Setup Fees</h2>
          <p className="text-[#46464c] leading-relaxed">
            A one-time setup fee applies to the Starter, Professional, and
            Business plans as listed on the Plans page (Enterprise setup
            fees are quoted individually). Setup fees are due in full before
            onboarding work begins and are non-refundable once work has
            commenced, except as required by law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">3. Recurring Billing</h2>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>
              Plans are billed monthly in advance, starting on the date your
              Plan is activated (&quot;Billing Date&quot;), unless otherwise
              stated in your SOW.
            </li>
            <li>
              Payments are processed via our designated payment processor
              (e.g., Stripe). By providing payment information, you
              authorize us to charge your payment method on each Billing
              Date.
            </li>
            <li>
              If a payment fails, we will attempt to notify you and may
              retry the charge. Accounts with payments more than 10 days
              past due may be suspended until payment is received, subject
              to Section 8.
            </li>
            <li>
              All fees are stated in U.S. dollars and are exclusive of
              applicable taxes, which will be added where required.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">4. Minimum Commitment Term</h2>
          <p className="text-[#46464c] leading-relaxed">
            Starter, Professional, and Business plans require a minimum
            4-month commitment from the Billing Date, unless a different
            minimum term is specified in your SOW. Enterprise plan terms are
            negotiated individually and set out in your Enterprise
            agreement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">5. Early Termination</h2>
          <p className="text-[#46464c] leading-relaxed">
            If you cancel a Plan before the end of its minimum commitment
            term, you remain responsible for the remaining monthly fees for
            the balance of the minimum term, payable either as a lump-sum
            early termination charge or per your SOW. We may, at our
            discretion, agree to a reduced payoff amount on a case-by-case
            basis.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">
            6. Renewal and Cancellation After the Minimum Term
          </h2>
          <p className="text-[#46464c] leading-relaxed">
            After the minimum commitment term ends, your Plan automatically
            renews on a month-to-month basis until cancelled. You may cancel
            at any time after the minimum term by providing at least 15
            days&apos; written notice (email is sufficient) to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#C67C2A] underline">
              {CONTACT_EMAIL}
            </a>{" "}
            or{" "}
            <a href="mailto:info@rctechbridge.com" className="text-[#C67C2A] underline">
              info@rctechbridge.com
            </a>
            . Cancellation takes effect at the end of the then-current
            billing cycle. We do not provide refunds or credits for partial
            billing periods.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">7. Price Changes</h2>
          <p className="text-[#46464c] leading-relaxed">
            We may change Plan pricing for future billing cycles by giving
            you at least 30 days&apos; advance notice by email. Continuing
            to use the service after a price change takes effect
            constitutes acceptance of the new pricing. Price changes will
            not apply retroactively or during your then-current minimum
            commitment term.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">
            8. Suspension and Termination for Non-Payment
          </h2>
          <p className="text-[#46464c] leading-relaxed">
            We may suspend access to Plan services (including hosting, AI
            agents, and ad campaign management) if payment is more than 10
            days past due, after providing notice. We may terminate the
            agreement entirely if payment remains outstanding more than 30
            days, without relieving you of the obligation to pay amounts
            owed, including any remaining minimum-term balance under
            Section 5.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">9. Third-Party and Pass-Through Costs</h2>
          <p className="text-[#46464c] leading-relaxed mb-2">
            Certain costs are billed separately from your monthly Plan fee
            and are your responsibility in addition to it, including:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>
              <strong>Advertising spend</strong> — for Business and
              Enterprise plans that include Google Ads or Meta Ads
              management, the underlying ad spend (media budget) is billed
              separately from our management fee, either directly by the ad
              platform to your payment method or passed through by us as
              noted in your SOW.
            </li>
            <li>
              <strong>Third-party subscriptions or licenses</strong> —
              domain registration, premium plugins, stock
              photography/licensing, or other third-party tools requested
              by you or required for your specific build, unless bundled
              into your Plan.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">10. Changes in Scope</h2>
          <p className="text-[#46464c] leading-relaxed">
            Work outside the defined features of your Plan (e.g., additional
            custom pages beyond your Plan&apos;s allotment, major redesigns,
            or new integrations) will be quoted separately and is not
            included in your monthly Plan fee unless agreed in writing.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">11. Service Levels and Support</h2>
          <p className="text-[#46464c] leading-relaxed">
            Support response times and priority levels vary by Plan tier as
            described on the Plans page (e.g., &quot;Priority support&quot;
            on the Business plan). We do not guarantee specific uptime
            percentages unless a Service Level Agreement is separately
            negotiated as part of an Enterprise agreement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">12. Refund Policy</h2>
          <p className="text-[#46464c] leading-relaxed">
            Except as required by law or expressly stated in your SOW, all
            setup fees and monthly Plan fees are non-refundable once billed,
            including in cases of early cancellation. If you believe you
            were billed in error, contact us within 30 days of the charge
            at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#C67C2A] underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">13. Enterprise Plans</h2>
          <p className="text-[#46464c] leading-relaxed">
            Enterprise plans are governed by a separate negotiated agreement
            covering pricing, term, service levels, and termination, which
            will reference and supplement these Subscription Terms where not
            otherwise specified.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">14. Relationship to Other Agreements</h2>
          <p className="text-[#46464c] leading-relaxed">
            These Subscription Terms work together with our general{" "}
            <Link href="/terms-of-service" className="text-[#C67C2A] underline">
              Terms of Service
            </Link>{" "}
            and any SOW or service agreement you sign. Together, these
            documents make up the entire agreement between you and RD
            TechBridge regarding your Plan, superseding prior discussions
            about pricing or scope not reflected in your SOW.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">15. Changes to These Terms</h2>
          <p className="text-[#46464c] leading-relaxed">
            We may update these Subscription Terms from time to time.
            Material changes affecting active Plan subscribers (such as
            changes to minimum terms, cancellation notice periods, or
            billing practices) will be communicated by email at least 30
            days before taking effect for existing clients.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">16. Contact</h2>
          <p className="text-[#46464c] leading-relaxed">
            Questions about billing or your Plan can be directed to:
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
        <Link href="/terms-of-service" className="text-[#C67C2A] hover:underline">
          Terms of Service →
        </Link>
        <Link href="/privacy-policy" className="text-[#C67C2A] hover:underline">
          Privacy Policy →
        </Link>
        <Link href="/plans" className="text-[#C67C2A] hover:underline">
          Plans →
        </Link>
        <Link href="/data-processing-agreement" className="text-[#C67C2A] hover:underline">
          Data Processing Agreement →
        </Link>
      </div>
    </article>
  );
}
