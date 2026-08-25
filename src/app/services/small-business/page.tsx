import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageIcon, BoltIcon, EyeIcon } from "@/icons";

export const metadata: Metadata = {
  title: "Small Business Tech Solutions | RD TechBridge",
  description:
    "Don't get left behind in the tech race. Affordable AI tools, professional web presence, and competitor intelligence built specifically for small businesses.",
  keywords:
    "small business technology, AI for small business, web presence, competitor intelligence, business automation, RD TechBridge",
};

export default function SmallBusinessPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-16 md:py-24 px-5 md:px-16 max-w-[1280px] mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C67C2A]/10 text-[#C67C2A] rounded-full border border-[#C67C2A]/20">
              <span className="text-xs font-bold uppercase tracking-widest">
                Small Business
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-[#0A0F1E]">
              Don&apos;t Get Left Behind{" "}
              <span className="text-[#46464c] font-normal italic">
                in the Tech Race.
              </span>
            </h1>
            <p className="text-lg text-[#46464c] max-w-xl">
              Big brands use AI to outprice, outmarket, and outmaneuver you
              every day. We give small businesses the same competitive
              firepower — at a fraction of enterprise cost.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/#contact"
                className="bg-[#0A0F1E] text-white px-8 py-4 rounded-lg text-sm font-bold hover:brightness-125 active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                Get My Free Analysis
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
              <Link
                href="/#services"
                className="text-[#0A0F1E] px-8 py-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#F5F7FF] transition-colors"
              >
                View All Services →
              </Link>
            </div>
          </div>

          {/* Image + Stat cards + AI market positioning widget */}
          <div className="lg:col-span-6 space-y-4">
            {/* Hero image */}
            <div className="relative w-full h-[220px] rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="/images/product/small-business-salon-dashboard.png"
                alt="Small business owner reviewing her AI dashboard on a tablet"
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>

            {/* Trust markers */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { stat: "150+", label: "SMBs Served" },
                { stat: "40%", label: "Cost Reduction" },
                { stat: "24/7", label: "AI Support" },
              ].map(({ stat, label }) => (
                <div
                  key={label}
                  className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm"
                >
                  <div className="text-2xl font-black text-[#0A0F1E]">
                    {stat}
                  </div>
                  <div className="text-xs text-[#46464c] mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* AI Market Positioning widget */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-[#0A0F1E]">
                  AI Market Positioning
                </span>
                <span className="text-xs font-bold text-[#C67C2A] bg-[#C67C2A]/10 px-2 py-1 rounded">
                  FREE Analysis
                </span>
              </div>
              <div className="mb-2 text-xs text-[#46464c]">
                Competitor Gap Reduced
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                <div
                  className="bg-[#1ED28C] h-2 rounded-full transition-all duration-1000"
                  style={{ width: "88%" }}
                ></div>
              </div>
              <div className="text-right text-sm font-bold text-[#1ED28C]">
                88%
              </div>
              <p className="text-xs text-[#46464c] mt-4">
                Average reduction in AI capability gap vs. enterprise
                competitors after 90 days with RD TechBridge.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-[100px] px-5 md:px-16 bg-[#F5F7FF]">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0A0F1E]">
              Built for Small Business, Powered by Enterprise AI
            </h2>
            <p className="text-[#46464c] mt-2">
              The same tools Fortune 500s use — packaged and priced for
              growing businesses.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <PageIcon className="h-9 w-9 text-[#0A0F1E]" />,
                title: "Web Presence",
                desc: "Professional, fast-loading websites and landing pages that convert visitors into customers. Includes SEO foundations and Google Business integration.",
                items: [
                  "Custom website build",
                  "Local SEO setup",
                  "Google Business Profile",
                  "Mobile-first design",
                ],
              },
              {
                icon: <BoltIcon className="h-9 w-9 text-[#0A0F1E]" />,
                title: "Smart Automation",
                desc: "Stop doing the same tasks over and over. We identify your biggest time drains and build simple automations that save 10+ hours per week.",
                items: [
                  "Email & booking automation",
                  "Invoice & follow-up workflows",
                  "Social media scheduling",
                  "Lead capture & CRM sync",
                ],
              },
              {
                icon: <EyeIcon className="h-9 w-9 text-[#0A0F1E]" />,
                title: "Competitor Intel",
                desc: "Know exactly what competitors are doing — their pricing, reviews, and marketing strategies — and counter with AI-powered responses.",
                items: [
                  "Real-time competitor alerts",
                  "Pricing gap analysis",
                  "Review monitoring & response",
                  "Keyword opportunity tracking",
                ],
              },
            ].map(({ icon, title, desc, items }) => (
              <div
                key={title}
                className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-lg transition-shadow flex flex-col"
              >
                <div className="mb-4">{icon}</div>
                <h3 className="text-xl font-bold text-[#0A0F1E] mb-3">
                  {title}
                </h3>
                <p className="text-[#46464c] text-sm leading-relaxed mb-6">
                  {desc}
                </p>
                <ul className="mt-auto space-y-2">
                  {items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-[#0A0F1E]"
                    >
                      <span className="w-4 h-4 bg-[#C67C2A]/10 rounded-full flex items-center justify-center text-[#C67C2A] text-xs font-bold flex-shrink-0">
                        ✓
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-5 bg-white">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C67C2A] text-white rounded-full text-sm font-bold">
            ✦ Free Business Analysis — Limited Spots
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0A0F1E]">
            Let&apos;s build your competitive edge.
          </h2>
          <p className="text-[#46464c] text-lg">
            We&apos;ll review your current online presence, identify your
            biggest tech gaps, and send you a prioritized action plan — 100%
            free, no strings attached.
          </p>
          <Link
            href="/#contact"
            className="inline-block bg-[#0A0F1E] text-white px-10 py-5 rounded-lg text-sm font-bold hover:brightness-125 active:scale-95 transition-all"
          >
            Claim My Free Analysis
          </Link>
        </div>
      </section>
    </>
  );
}
