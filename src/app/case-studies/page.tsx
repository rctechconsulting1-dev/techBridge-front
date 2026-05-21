import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Case Studies | RC Tech Bridge",
  description:
    "Real results for real businesses. See how RC Tech Bridge helped clients increase traffic by 114%, improve performance by 34%, and save 10+ hours per week through automation.",
  keywords:
    "case studies, client results, web development results, automation ROI, RC Tech Bridge",
};

const caseStudies = [
  {
    id: "ecommerce-traffic",
    tag: "eCommerce",
    tagColor: "bg-[#C67C2A]/10 text-[#C67C2A]",
    accentColor: "#C67C2A",
    stat: "+114%",
    statLabel: "Organic Traffic",
    headline: "From Invisible to Unstoppable Online",
    summary:
      "An eCommerce brand was losing ground to competitors despite having a great product. Their site was slow, unoptimized, and barely ranking. We rebuilt their tech foundation and SEO strategy from scratch.",
    challenge:
      "The client had zero structured data, poor Core Web Vitals, and a product catalog that search engines couldn't crawl. They were invisible on Google for their core product keywords.",
    solution:
      "We rebuilt the storefront on Next.js with server-side rendering for fast indexing, implemented structured product schema, optimized image delivery through AWS S3 + CDN, and wired up automated sitemap generation.",
    results: [
      "114% increase in organic traffic within 90 days",
      "First-page rankings for 12 target product keywords",
      "Core Web Vitals score moved from 38 to 91 (Lighthouse)",
      "28% lift in conversion rate from organic visitors",
    ],
    tech: ["Next.js", "AWS S3", "Structured Data", "SEO Architecture"],
  },
  {
    id: "performance-overhaul",
    tag: "Web Performance",
    tagColor: "bg-[#1ED28C]/10 text-[#009762]",
    accentColor: "#1ED28C",
    stat: "+34%",
    statLabel: "Lighthouse Score",
    headline: "A Performance Audit That Changed Everything",
    summary:
      "A service business had a visually polished website that was quietly killing conversions. Page load times over 6 seconds were sending visitors straight to competitors. We ran a deep Lighthouse audit and rebuilt the critical path.",
    challenge:
      "Unoptimized images, render-blocking scripts, and a legacy WordPress theme combined to produce abysmal load performance — especially on mobile, where 70% of their traffic arrived.",
    solution:
      "We migrated from WordPress to a headless Next.js stack, replaced all unoptimized assets with WebP via automated pipelines, removed 14 unnecessary third-party scripts, and deployed to Vercel edge with proper caching headers.",
    results: [
      "34% improvement in overall Lighthouse performance score",
      "Time-to-interactive dropped from 6.2s to 1.8s",
      "Mobile bounce rate reduced by 41%",
      "Hosting cost reduced by 60% vs. managed WordPress",
    ],
    tech: ["Next.js", "Vercel Edge", "WebP Pipeline", "Lighthouse Audit"],
  },
  {
    id: "workflow-automation",
    tag: "Automation",
    tagColor: "bg-[#0A0F1E]/10 text-[#0A0F1E]",
    accentColor: "#0A0F1E",
    stat: "10 hrs",
    statLabel: "Saved Per Week",
    headline: "Cutting 40% of Manual Work Through Smart Automation",
    summary:
      "A growing service business was drowning in repetitive admin tasks — manual invoicing, follow-up emails, appointment confirmations, and data entry across disconnected tools. We mapped their bottlenecks and automated the entire pipeline.",
    challenge:
      "The team was spending 2+ hours daily on tasks that should take minutes: copying data between systems, manually sending follow-up messages, and chasing invoices. Every new client added more manual overhead.",
    solution:
      "We built a Node.js automation layer connected to their CRM, calendar, and billing system. AI agents (Claude + GPT-4) handled email drafting and routing. MCP connections tied their internal tools together without replacing any existing systems.",
    results: [
      "10 hours per week reclaimed by eliminating manual data entry",
      "40% reduction in time-to-complete core business processes",
      "Zero missed follow-ups — all handled by AI agents",
      "Invoices now auto-generated and sent within 60 seconds of job completion",
    ],
    tech: ["Node.js", "Claude AI", "GPT-4", "MCP Connections", "PostgreSQL"],
  },
];

export default function CaseStudiesPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-16 md:py-24 px-5 md:px-16 max-w-[1280px] mx-auto">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A0F1E]/5 text-[#0A0F1E] rounded-full border border-[#0A0F1E]/10">
            <span className="text-xs font-bold uppercase tracking-widest">
              Real Results
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-[#0A0F1E]">
            Work That Speaks for Itself
          </h1>
          <p className="text-lg text-[#46464c]">
            Every engagement starts with a real problem. Here&apos;s how we
            solved them — and what the numbers looked like after.
          </p>
        </div>
      </section>

      {/* Case Studies */}
      <section className="pb-[120px] px-5 md:px-16 max-w-[1280px] mx-auto space-y-16">
        {caseStudies.map((cs) => (
          <div
            key={cs.id}
            className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
          >
            {/* Card header */}
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-8 p-8 md:p-12 space-y-6">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${cs.tagColor}`}
                  >
                    {cs.tag}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#0A0F1E]">
                  {cs.headline}
                </h2>
                <p className="text-[#46464c] leading-relaxed">{cs.summary}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#0A0F1E] uppercase tracking-wider mb-2">
                      The Challenge
                    </h3>
                    <p className="text-sm text-[#46464c] leading-relaxed">
                      {cs.challenge}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0A0F1E] uppercase tracking-wider mb-2">
                      Our Approach
                    </h3>
                    <p className="text-sm text-[#46464c] leading-relaxed">
                      {cs.solution}
                    </p>
                  </div>
                </div>

                {/* Tech tags */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {cs.tech.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1 bg-[#F5F7FF] text-[#46464c] rounded-full text-xs font-semibold border border-[#e0e2ea]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Results panel */}
              <div
                className="lg:col-span-4 p-8 md:p-12 flex flex-col justify-between"
                style={{ backgroundColor: `${cs.accentColor}08` }}
              >
                <div>
                  <div
                    className="text-5xl font-black mb-1"
                    style={{ color: cs.accentColor }}
                  >
                    {cs.stat}
                  </div>
                  <div className="text-sm font-bold text-[#46464c] uppercase tracking-wider mb-8">
                    {cs.statLabel}
                  </div>

                  <h3 className="text-sm font-bold text-[#0A0F1E] uppercase tracking-wider mb-4">
                    Key Results
                  </h3>
                  <ul className="space-y-3">
                    {cs.results.map((r) => (
                      <li
                        key={r}
                        className="flex items-start gap-2 text-sm text-[#0A0F1E]"
                      >
                        <span
                          className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                          style={{ backgroundColor: cs.accentColor }}
                        >
                          ✓
                        </span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="bg-[#0A0F1E] py-24 px-5">
        <div className="max-w-3xl mx-auto text-center text-white space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">
            Your business has bottlenecks too.
          </h2>
          <p className="text-[#e0e2ea] text-lg">
            Book a free 30-minute discovery call. We&apos;ll identify your
            biggest tech gap and tell you exactly what we&apos;d do about it —
            no obligation.
          </p>
          <Link
            href="/#contact"
            className="inline-block bg-[#C67C2A] text-white px-10 py-5 rounded-lg text-sm font-bold hover:brightness-90 active:scale-95 transition-all"
          >
            Book Free Discovery Call
          </Link>
        </div>
      </section>
    </>
  );
}
