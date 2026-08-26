import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Data Processing Agreement | RD TechBridge",
  description:
    "Terms governing how RD TechBridge processes personal data on behalf of tenant businesses using the platform.",
};

const EFFECTIVE_DATE = "August 26, 2026";
const CONTACT_EMAIL = "rctechconsulting1@gmail.com";
const CONTACT_PHONE = "(626) 922-0091";
const COMPANY_NAME = "RD TechBridge, LLC";

export default function DataProcessingAgreementPage() {
  return (
    <article className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A0F1E]/5 text-[#0A0F1E] rounded-full border border-[#0A0F1E]/10 mb-6">
          <span className="text-xs font-bold uppercase tracking-widest">
            Legal
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#0A0F1E] mb-4">
          Data Processing Agreement
        </h1>
        <p className="text-sm text-[#46464c]">
          Effective date: {EFFECTIVE_DATE}
        </p>
      </div>

      <div className="prose prose-gray max-w-none space-y-8 text-[#0A0F1E]">
        <section>
          <p className="text-[#46464c] leading-relaxed">
            This Data Processing Agreement (&quot;DPA&quot;) supplements and
            is incorporated into our{" "}
            <Link href="/terms-of-service" className="text-[#C67C2A] underline">
              Terms of Service
            </Link>{" "}
            and any Statement of Work, order form, or Enterprise agreement
            (together, the &quot;Agreement&quot;) between {COMPANY_NAME}{" "}
            (&quot;RD TechBridge,&quot; &quot;we,&quot; &quot;us,&quot; or
            &quot;our&quot;) and a business using our platform to operate its
            own website, bookings, e-commerce, or customer communications
            (&quot;Tenant,&quot; &quot;you&quot;). This DPA applies whenever
            RD TechBridge processes personal data on your behalf as part of
            delivering the Services — for example, your customers&apos;
            booking details, leads, or order information. It does not cover
            RD TechBridge&apos;s own collection of data directly from you or
            from visitors to our marketing site, which is addressed in our{" "}
            <Link href="/privacy-policy" className="text-[#C67C2A] underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">1. Roles of the Parties</h2>
          <p className="text-[#46464c] leading-relaxed">
            As between RD TechBridge and Tenant, Tenant is the &quot;Business&quot;
            (or, where applicable under other privacy laws, the
            &quot;Controller&quot;) and RD TechBridge is the &quot;Service
            Provider&quot; (or &quot;Processor&quot;) with respect to any
            personal data of Tenant&apos;s own customers, leads, or end users
            (&quot;Tenant Customer Data&quot;) that RD TechBridge processes
            while providing the Services. Tenant determines the purposes for
            which its customers&apos; personal data is collected and used; RD
            TechBridge processes Tenant Customer Data only to deliver,
            support, and secure the Services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">2. Scope of Processing</h2>
          <p className="text-[#46464c] leading-relaxed mb-2">
            Depending on which features of the platform you use, Tenant
            Customer Data processed on your behalf may include:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li>Names, email addresses, and phone numbers of your leads and customers</li>
            <li>Booking, appointment, and scheduling details</li>
            <li>E-commerce order information (payment card data itself is tokenized and handled directly by our payment processor — see Section 6)</li>
            <li>Content your customers submit through forms, chat, or AI agents you have configured on your site</li>
            <li>Communications sent or logged through the platform on your behalf</li>
          </ul>
          <p className="text-[#46464c] leading-relaxed mt-4">
            RD TechBridge processes Tenant Customer Data only as necessary to
            provide the Services, in accordance with your configuration of
            the platform and your documented instructions, and as otherwise
            required by law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">3. Confidentiality</h2>
          <p className="text-[#46464c] leading-relaxed">
            RD TechBridge restricts access to Tenant Customer Data to
            personnel and contractors who need it to provide the Services,
            and requires those personnel to be bound by confidentiality
            obligations at least as protective as those in our Terms of
            Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">4. Security Measures</h2>
          <p className="text-[#46464c] leading-relaxed">
            RD TechBridge maintains technical and organizational measures
            designed to protect Tenant Customer Data, including HTTPS
            encryption in transit, role-based access controls on our AWS
            infrastructure, and limiting production data access to personnel
            who need it. No method of transmission or storage is completely
            secure, and RD TechBridge cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">5. Sub-processors</h2>
          <p className="text-[#46464c] leading-relaxed mb-2">
            Tenant authorizes RD TechBridge to engage the following
            sub-processors to deliver the Services:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[#46464c]">
            <li><strong>Amazon Web Services (AWS)</strong> — application hosting (EC2) and file/asset storage (S3)</li>
            <li><strong>Vercel</strong> — hosting for the client-facing website and admin dashboard</li>
            <li><strong>Stripe</strong> — payment processing and, where applicable, Stripe Connect for tenant payouts</li>
            <li><strong>Resend</strong> — transactional and outreach email delivery</li>
            <li><strong>OpenAI</strong> — AI-generated content, lead parsing, and AI agent features you enable</li>
            <li><strong>Google</strong> — Google Business Profile, Calendar, Maps/Places, and related integrations you connect</li>
          </ul>
          <p className="text-[#46464c] leading-relaxed mt-4">
            Each sub-processor is contractually bound to data protection
            obligations consistent with this DPA. If we engage a new
            sub-processor with access to Tenant Customer Data, we will update
            this list and notify active Tenants by email at least 15 days in
            advance, giving you an opportunity to raise concerns before the
            change takes effect.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">
            6. Payment Data
          </h2>
          <p className="text-[#46464c] leading-relaxed">
            Payment card data is collected and processed directly by Stripe
            and does not pass through or get stored on RD TechBridge
            servers. RD TechBridge receives only tokenized payment
            references and transaction metadata (amount, status, timestamps)
            necessary to display order and billing information within the
            platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">
            7. Assistance with Data Subject Requests
          </h2>
          <p className="text-[#46464c] leading-relaxed">
            If one of your customers contacts RD TechBridge directly to
            exercise a privacy right (such as access, correction, or
            deletion) regarding data you control, we will refer the request
            to you. We will provide reasonable assistance, through the
            platform&apos;s existing tools or otherwise, to help you respond
            to such requests within the time required by applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">8. Data Breach Notification</h2>
          <p className="text-[#46464c] leading-relaxed">
            If RD TechBridge becomes aware of a breach of security leading to
            the accidental or unlawful destruction, loss, alteration,
            unauthorized disclosure of, or access to Tenant Customer Data, we
            will notify you without undue delay, and in no event later than
            72 hours after becoming aware of the breach, with information
            reasonably available to us at the time regarding the nature of
            the breach and any remediation steps taken or planned.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">
            9. Data Retention and Deletion
          </h2>
          <p className="text-[#46464c] leading-relaxed">
            RD TechBridge retains Tenant Customer Data for as long as your
            account is active. Upon termination of your Agreement, RD
            TechBridge will delete or anonymize Tenant Customer Data within
            30 days, except to the extent retention is required by law or
            necessary to resolve disputes or enforce our agreements. You are
            responsible for exporting any data you wish to keep before
            termination takes effect.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">10. Audits</h2>
          <p className="text-[#46464c] leading-relaxed">
            On reasonable written request, no more than once per 12-month
            period, RD TechBridge will provide a written summary of its
            security practices and complete a reasonable, standard-form
            security questionnaire. RD TechBridge does not commit to
            unlimited on-demand audits or on-site inspections; alternative
            audit arrangements may be negotiated as part of an Enterprise
            agreement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">
            11. CCPA Service Provider Terms
          </h2>
          <p className="text-[#46464c] leading-relaxed">
            To the extent the California Consumer Privacy Act, as amended by
            the California Privacy Rights Act (&quot;CCPA/CPRA&quot;),
            applies to Tenant Customer Data, RD TechBridge is a
            &quot;Service Provider&quot; as defined under that law and
            certifies that it will: (a) not sell or share Tenant Customer
            Data; (b) not retain, use, or disclose Tenant Customer Data for
            any purpose other than performing the Services, including any
            commercial purpose outside the direct business relationship
            between RD TechBridge and Tenant; and (c) not combine Tenant
            Customer Data with personal data received from another source,
            except as permitted under the CCPA/CPRA.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">12. International Scope</h2>
          <p className="text-[#46464c] leading-relaxed">
            This DPA is written for Tenants and Tenant customers located in
            the United States. If you or your customers are located outside
            the United States (including the EU/UK), contact us before
            onboarding — additional terms, such as Standard Contractual
            Clauses, may be required and are not included in this version of
            the DPA.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">
            13. Relationship to Other Agreements
          </h2>
          <p className="text-[#46464c] leading-relaxed">
            This DPA works together with our{" "}
            <Link href="/terms-of-service" className="text-[#C67C2A] underline">
              Terms of Service
            </Link>
            , our{" "}
            <Link href="/privacy-policy" className="text-[#C67C2A] underline">
              Privacy Policy
            </Link>
            , and any signed SOW, order form, or Enterprise agreement. If
            there is a conflict between this DPA and a signed Enterprise
            agreement specifically addressing data processing, the signed
            agreement controls.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">14. Governing Law</h2>
          <p className="text-[#46464c] leading-relaxed">
            This DPA is governed by the laws of the State of California,
            consistent with the governing law provision in our{" "}
            <Link href="/terms-of-service" className="text-[#C67C2A] underline">
              Terms of Service
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">15. Changes to This DPA</h2>
          <p className="text-[#46464c] leading-relaxed">
            We may update this DPA from time to time, including to reflect a
            change in sub-processors as described in Section 5. Material
            changes will be communicated to active Tenants by email.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">16. Contact</h2>
          <p className="text-[#46464c] leading-relaxed">
            Questions about this DPA can be sent to:
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
        <Link href="/privacy-policy" className="text-[#C67C2A] hover:underline">
          Privacy Policy →
        </Link>
        <Link href="/subscription-terms" className="text-[#C67C2A] hover:underline">
          Subscription Terms →
        </Link>
        <Link href="/help" className="text-[#C67C2A] hover:underline">
          Help Center →
        </Link>
      </div>
    </article>
  );
}
