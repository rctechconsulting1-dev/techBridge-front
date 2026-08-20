import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Web Development | RD TechBridge",
  description:
    "Custom web development built on the edge of possibility. Adaptive AI feedback loops, low-latency data pipelines, and enterprise-grade security for modern businesses.",
  keywords:
    "web development, custom web design, React, Next.js, web architecture, AI-powered web, RD TechBridge",
};

export default function WebDevelopmentPage() {
  return (
    <>
      {/* Hero — Dark blueprint style */}
      <section
        className="relative min-h-[540px] bg-[#0A0F1E] flex items-center overflow-hidden py-24"
        style={{
          backgroundImage: `
            linear-gradient(rgba(30,210,140,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30,210,140,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#C67C2A] blur-[150px] rounded-full"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#1ED28C] blur-[100px] rounded-full"></div>
        </div>
        <div className="max-w-[1280px] mx-auto px-5 md:px-16 relative z-10">
          <div className="max-w-2xl text-white space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1ED28C]/10 text-[#1ED28C] rounded-full border border-[#1ED28C]/20">
              <span className="w-2 h-2 bg-[#1ED28C] rounded-full animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-widest">
                Modern Web Architecture
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
              Your Optimized{" "}
              <span className="text-[#1ED28C]">Tech Architecture</span>
            </h1>
            <p className="text-lg text-[#e0e2ea]">
              We design and build web applications engineered for performance,
              scalability, and long-term growth — not just good looks.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/#contact"
                className="bg-[#C67C2A] text-white px-8 py-4 rounded-lg text-sm font-bold hover:brightness-90 active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                Start My Project
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
                className="text-white px-8 py-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/5 transition-colors border border-white/20"
              >
                View All Services →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Phase Bento */}
      <section className="py-[120px] px-5 md:px-16 max-w-[1280px] mx-auto">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-[#0A0F1E]">
            How We Build Your Solution
          </h2>
          <p className="text-[#46464c] mt-2">
            Three phases. Zero guesswork. Full transparency.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              phase: "01",
              title: "Analyze",
              icon: "🔍",
              desc: "We audit your existing tech, understand your goals, and map out a precise architecture plan tailored to your business model.",
              items: [
                "Technical audit",
                "User journey mapping",
                "Competitor benchmarking",
                "Stack selection",
              ],
            },
            {
              phase: "02",
              title: "Integrate",
              icon: "🔗",
              desc: "We build with best-in-class tools — React, Next.js, TypeScript — and integrate cleanly with your CRM, payments, and analytics stack.",
              items: [
                "Next.js / React frontend",
                "Headless CMS integration",
                "Payment & auth setup",
                "API design & documentation",
              ],
            },
            {
              phase: "03",
              title: "Automate",
              icon: "⚡",
              desc: "Post-launch, we layer in AI-powered features: smart search, personalization, A/B testing, and automated performance monitoring.",
              items: [
                "Adaptive AI feedback loops",
                "Low-latency data pipelines",
                "Automated performance alerts",
                "Continuous deployment",
              ],
            },
          ].map(({ phase, title, icon, desc, items }) => (
            <div
              key={phase}
              className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-xl transition-shadow relative overflow-hidden"
            >
              <div className="absolute top-6 right-6 text-6xl font-black text-gray-50 select-none leading-none">
                {phase}
              </div>
              <div className="relative z-10">
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="text-xl font-bold text-[#0A0F1E] mb-3">
                  {title}
                </h3>
                <p className="text-[#46464c] text-sm leading-relaxed mb-6">
                  {desc}
                </p>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-[#0A0F1E]"
                    >
                      <span className="w-4 h-4 bg-[#1ED28C]/20 rounded-full flex items-center justify-center text-[#009762] text-xs font-bold flex-shrink-0">
                        ✓
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* "Built on the Edge of Possibility" */}
      <section className="bg-[#F5F7FF] py-[120px] px-5 md:px-16">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A0F1E] mb-6">
              Built on the Edge of Possibility
            </h2>
            <p className="text-[#46464c] leading-relaxed mb-8">
              Every project we ship is built to a standard that anticipates
              tomorrow&apos;s scale. We don&apos;t cut corners on architecture
              — your system should grow with you, not against you.
            </p>
            <ul className="space-y-4">
              {[
                {
                  title: "Adaptive AI feedback loops",
                  desc: "Your site learns from user behavior and continuously optimizes conversion paths.",
                },
                {
                  title: "Low-latency data pipelines",
                  desc: "Sub-100ms response times across global CDN edge nodes.",
                },
                {
                  title: "Enterprise-grade security",
                  desc: "OWASP Top 10 hardening, rate limiting, and security headers on every project.",
                },
                {
                  title: "Accessibility by default",
                  desc: "WCAG 2.1 AA compliance built in — not bolted on afterward.",
                },
              ].map(({ title, desc }) => (
                <li key={title} className="flex gap-4">
                  <span className="w-6 h-6 bg-[#0A0F1E] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    ✓
                  </span>
                  <div>
                    <div className="font-bold text-[#0A0F1E]">{title}</div>
                    <div className="text-sm text-[#46464c]">{desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Next.js", detail: "App Router + RSC" },
              { label: "TypeScript", detail: "Strict mode" },
              { label: "Tailwind CSS", detail: "Design system" },
              { label: "Supabase", detail: "Postgres + Auth" },
              { label: "Vercel Edge", detail: "Global CDN" },
              { label: "Stripe", detail: "Payments" },
            ].map(({ label, detail }) => (
              <div
                key={label}
                className="bg-white border border-gray-100 rounded-xl p-5 hover:border-[#1ED28C]/30 hover:shadow-sm transition-all"
              >
                <div className="font-bold text-[#0A0F1E]">{label}</div>
                <div className="text-xs text-[#46464c] mt-1">{detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-5 bg-white">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0A0F1E]">
            Have a project in mind?
          </h2>
          <p className="text-[#46464c] text-lg">
            Tell us what you&apos;re building and we&apos;ll provide a free
            technical scope within 48 hours.
          </p>
          <Link
            href="/#contact"
            className="inline-block bg-[#0A0F1E] text-white px-10 py-5 rounded-lg text-sm font-bold hover:brightness-125 active:scale-95 transition-all"
          >
            Get Free Technical Scope
          </Link>
        </div>
      </section>
    </>
  );
}
