import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "eCommerce AI Solutions | RC Tech Bridge",
  description:
    "Scale your online store with AI-powered inventory management, dynamic pricing, and intelligent customer support. +34% average revenue lift.",
  keywords:
    "ecommerce AI, online store automation, dynamic pricing, AI customer support, inventory management, RC Tech Bridge",
};

export default function EcommercePage() {
  return (
    <>
      {/* Hero */}
      <section className="py-16 md:py-24 px-5 md:px-16 max-w-[1280px] mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C67C2A]/10 text-[#C67C2A] rounded-full border border-[#C67C2A]/20">
              <span className="text-xs font-bold uppercase tracking-widest">
                eCommerce Intelligence
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-[#0A0F1E]">
              Scale Your Store with{" "}
              <span className="text-[#C67C2A]">AI-Powered</span>{" "}
              Intelligence.
            </h1>
            <p className="text-lg text-[#46464c]">
              From demand forecasting to hyper-personalized shopping experiences,
              we embed AI at every touchpoint of your commerce stack.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/#contact"
                className="bg-[#C67C2A] text-white px-8 py-4 rounded-lg text-sm font-bold hover:brightness-90 active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                Boost My Revenue
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

          {/* Hero visual: stat cards */}
          <div className="lg:col-span-6 relative flex justify-center">
            <div className="relative">
              {/* Main card */}
              <div className="bg-white border border-gray-100 shadow-xl rounded-2xl p-8 w-full max-w-sm space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1ED28C]/10 text-[#009762] rounded-full text-xs font-bold">
                  <span className="w-2 h-2 bg-[#1ED28C] rounded-full animate-pulse"></span>
                  Workflow Optimization Active
                </div>
                <div className="text-3xl font-black text-[#0A0F1E]">
                  +34%
                </div>
                <div className="text-sm text-[#46464c]">Average Revenue Lift</div>
                <div className="h-px bg-gray-100"></div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-[#0A0F1E]">2.4×</div>
                    <div className="text-xs text-[#46464c]">Conversion Rate</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-[#0A0F1E]">91%</div>
                    <div className="text-xs text-[#46464c]">Stock Accuracy</div>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-[#C67C2A] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg">
                AI Prime ✦
              </div>
            </div>
            <div className="absolute -inset-10 bg-[#C67C2A]/5 rounded-full blur-3xl -z-10"></div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-[100px] px-5 md:px-16 max-w-[1280px] mx-auto">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-[#0A0F1E]">
            Three Pillars of eCommerce Intelligence
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: "📦",
              tag: "Inventory",
              title: "Smart Inventory",
              desc: "Predictive reorder triggers, dead stock detection, and supplier sync — all on autopilot. Never run out or overstock again.",
              stat: "91%",
              statLabel: "Stock Accuracy",
            },
            {
              icon: "🤖",
              tag: "Support · AI Prime",
              title: "Agentic Support",
              desc: "AI agents handle returns, shipping questions, and product queries 24/7. Escalates intelligently to humans when nuance is needed.",
              stat: "70%",
              statLabel: "Tickets Resolved Autonomously",
            },
            {
              icon: "💹",
              tag: "Pricing",
              title: "Dynamic Pricing",
              desc: "Real-time competitive price monitoring with auto-adjustment. Maximize margin while staying conversion-optimized.",
              stat: "+18%",
              statLabel: "Margin Improvement",
            },
          ].map(({ icon, tag, title, desc, stat, statLabel }) => (
            <div
              key={title}
              className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col gap-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl">{icon}</span>
                <span className="text-xs font-bold text-[#46464c] bg-[#F5F7FF] px-3 py-1 rounded-full">
                  {tag}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#0A0F1E] mb-2">
                  {title}
                </h3>
                <p className="text-[#46464c] text-sm leading-relaxed">{desc}</p>
              </div>
              <div className="mt-auto pt-4 border-t border-gray-100">
                <div className="text-2xl font-black text-[#C67C2A]">{stat}</div>
                <div className="text-xs text-[#46464c]">{statLabel}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dark rounded CTA */}
      <section className="py-16 px-5 md:px-16 max-w-[1280px] mx-auto pb-24">
        <div className="bg-[#0A0F1E] rounded-3xl py-20 px-8 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C67C2A] blur-[150px] rounded-full"></div>
          </div>
          <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to outpace the competition?
            </h2>
            <p className="text-[#e0e2ea]">
              We&apos;ll audit your current eCommerce stack and show you
              precisely which AI integrations will generate the fastest ROI.
            </p>
            <Link
              href="/#contact"
              className="inline-block bg-[#C67C2A] text-white px-10 py-5 rounded-xl text-sm font-bold hover:brightness-90 active:scale-95 transition-all"
            >
              Get Free eCommerce Audit
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
