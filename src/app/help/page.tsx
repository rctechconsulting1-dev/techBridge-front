import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help Center | RC Tech Bridge",
  description:
    "Answers to common questions about RC Tech Bridge services, timelines, tech stack, and how we work.",
};

const faqs = [
  {
    category: "Getting Started",
    items: [
      {
        q: "How long does it take to build a website?",
        a: "It depends on scope and discovery. We can launch a professional, high-performance site in as little as one month for straightforward projects. For more custom work — where we're deeply mapping your business workflows, integrating AI agents, or building a full platform — we typically deliver in under three months. We'll give you a realistic timeline after our free discovery call.",
      },
      {
        q: "What's the first step to getting started?",
        a: "Book a free discovery call. We spend 30 minutes understanding your goals, your current tech situation, and your biggest bottlenecks. After that, we send you a written scope and proposal — no pressure, no obligation.",
      },
      {
        q: "Do you work with businesses in any industry?",
        a: "Yes. We've worked with eCommerce brands, service businesses, and B2B companies. Our process adapts to your specific workflow patterns and business model rather than applying a one-size-fits-all template.",
      },
    ],
  },
  {
    category: "Services & Support",
    items: [
      {
        q: "Do you offer ongoing monthly support?",
        a: "Yes. All of our plans include a monthly support option. Our admin dashboard platform allows you to manage content, track performance, and request changes. For deeper customization and new feature development, we offer retainer plans with dedicated capacity.",
      },
      {
        q: "What does your dashboard platform do?",
        a: "Our platform lets you manage your website content, view booking requests, track leads, and configure your AI agents — all from one place. It's built to be used by non-technical business owners, with no coding required for day-to-day management.",
      },
      {
        q: "Do you offer one-time projects or only subscriptions?",
        a: "Both. We do one-time builds with a project fee, and we offer ongoing monthly plans for businesses that want continuous improvement, support, and AI agent management. Recurring plans require a minimum 4-month commitment.",
      },
    ],
  },
  {
    category: "Technology Stack",
    items: [
      {
        q: "What technologies do you build with?",
        a: "Our frontend stack is React.js and Next.js with TypeScript. For backend services we use Node.js. Databases: PostgreSQL, MySQL, and MS SQL depending on the project. We deploy on the AWS ecosystem — S3 for storage, EC2 and nginx for compute, RDS for managed databases — as well as Vercel for frontend hosting. We use GitHub Actions for CI/CD pipelines.",
      },
      {
        q: "How do your AI agents work?",
        a: "We use Claude (Anthropic) and GPT-4 (OpenAI) as the underlying models, accessed through their APIs. We build custom agents that plug into your existing tools — email, CRM, calendar, billing — using MCP (Model Context Protocol) connections. MCP lets our agents securely read from and write to your systems without replacing them.",
      },
      {
        q: "What is MCP (Model Context Protocol)?",
        a: "MCP is an open standard that lets AI models connect to external data sources and tools in a secure, structured way. Instead of manually feeding your AI an export of your data, MCP allows live, permissioned connections between the AI agent and your systems. We use it to build agents that can pull from your CRM, update records, send emails, and trigger workflows — all in real time.",
      },
      {
        q: "Do I need to replace my existing software?",
        a: "Almost never. Our philosophy is to augment what you already have, not rip it out. We build integrations and automation layers on top of your current stack. If an existing tool is genuinely slowing you down, we'll flag it and recommend a replacement — but that's a business conversation, not a forced migration.",
      },
    ],
  },
  {
    category: "Pricing & Process",
    items: [
      {
        q: "How are your services priced?",
        a: "We have tiered monthly plans based on the services included — from core web presence and support up to full AI agent deployment and multi-campaign ad management. All plans include a one-time setup fee. Enterprise and custom projects are scoped individually. See our Pricing section on the home page for current plan details.",
      },
      {
        q: "What happens after I submit the contact form?",
        a: "You'll receive a confirmation immediately. A member of our team will reach out within one business day to schedule a discovery call. We don't do cold sales pitches — the call is a working conversation to see if and how we can help.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-16 md:py-20 px-5 md:px-16 max-w-[1280px] mx-auto">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A0F1E]/5 text-[#0A0F1E] rounded-full border border-[#0A0F1E]/10">
            <span className="text-xs font-bold uppercase tracking-widest">
              Help Center
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#0A0F1E]">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-[#46464c]">
            Answers to the questions we hear most often. If yours isn&apos;t
            here, just{" "}
            <Link href="/#contact" className="text-[#C67C2A] underline">
              contact us
            </Link>
            .
          </p>
        </div>
      </section>

      {/* FAQ Groups */}
      <section className="pb-[120px] px-5 md:px-16 max-w-[1280px] mx-auto space-y-16">
        {faqs.map((group) => (
          <div key={group.category}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#C67C2A] mb-8 border-b border-gray-100 pb-4">
              {group.category}
            </h2>
            <div className="space-y-6">
              {group.items.map(({ q, a }) => (
                <div
                  key={q}
                  className="bg-white border border-gray-100 rounded-xl p-6 md:p-8 hover:border-[#C67C2A]/30 transition-colors"
                >
                  <h3 className="text-base font-bold text-[#0A0F1E] mb-3">
                    {q}
                  </h3>
                  <p className="text-[#46464c] leading-relaxed text-sm">
                    {a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="bg-[#F5F7FF] py-20 px-5">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-2xl font-bold text-[#0A0F1E]">
            Still have questions?
          </h2>
          <p className="text-[#46464c]">
            Book a free 30-minute call and ask us anything — no pitch, just
            answers.
          </p>
          <Link
            href="/#contact"
            className="inline-block bg-[#0A0F1E] text-white px-8 py-4 rounded-lg text-sm font-bold hover:brightness-125 active:scale-95 transition-all"
          >
            Book a Free Call
          </Link>
        </div>
      </section>
    </>
  );
}
