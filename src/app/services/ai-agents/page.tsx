import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpIcon, CheckCircleIcon, TimeIcon } from "@/icons";

export const metadata: Metadata = {
  title: "AI Email & Task Agents | RD TechBridge",
  description:
    "Stop losing 10+ hours a week to email triage. Our intelligent AI agents draft replies, sort inboxes, and surface urgent messages automatically.",
  keywords:
    "AI agents, email automation, AI productivity, email triage, RD TechBridge, intelligent agents",
};

export default function AiAgentsPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-16 md:py-24 px-5 md:px-16 max-w-[1280px] mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1ED28C]/10 text-[#009762] rounded-full border border-[#1ED28C]/20">
              <span className="text-xs font-bold uppercase tracking-widest">
                AI-Powered Productivity
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-[#0A0F1E]">
              Stop Losing{" "}
              <span className="relative inline-block">
                <span className="relative z-10">10+ Hours</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-[#1ED28C]/30 rounded -z-0"></span>
              </span>{" "}
              a Week to Email.
            </h1>
            <p className="text-lg text-[#46464c] max-w-xl">
              Your inbox is costing you money. Our AI agents read, sort,
              prioritize, and draft replies — so you focus on work that actually
              moves the needle.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/#contact"
                className="bg-[#0A0F1E] text-white px-8 py-4 rounded-lg text-sm font-bold hover:brightness-125 active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                Get AI Email Agent
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
                See All Services →
              </Link>
            </div>
          </div>

          {/* Product screenshots */}
          <div className="flex gap-4 items-end justify-center lg:justify-end">
            <div className="relative w-[160px] h-[260px] rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 flex-shrink-0">
              <Image
                src="/images/product/emailAgentIG.jpg"
                alt="AI Email Agent live preview"
                fill
                className="object-cover"
                sizes="160px"
              />
            </div>
            <div className="flex flex-col gap-4">
              <div className="relative w-[200px] h-[170px] rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5">
                <Image
                  src="/images/product/inboxAi.jpg"
                  alt="AI inbox sorting your emails"
                  fill
                  className="object-cover"
                  sizes="200px"
                />
              </div>
              <div className="relative w-[200px] h-[80px] rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5">
                <Image
                  src="/images/product/messyInbox.jpg"
                  alt="Stop losing leads to a messy inbox"
                  fill
                  className="object-cover object-top"
                  sizes="200px"
                />
              </div>
            </div>
            <div className="relative w-[160px] h-[260px] rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 flex-shrink-0 hidden lg:block">
              <Image
                src="/images/product/ai-agent-voice-call.png"
                alt="AI voice agent handling a live call"
                fill
                className="object-cover"
                sizes="160px"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid */}
      <section className="py-[100px] px-5 md:px-16 max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Draft Replies */}
          <div className="md:col-span-7 bg-[#0A0F1E] text-white p-10 rounded-2xl relative overflow-hidden group">
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#1ED28C]/10 rounded-full blur-3xl"></div>
            <div className="flex gap-2 mb-6">
              <span className="px-3 py-1 bg-[#1ED28C] text-[#0A0F1E] rounded text-xs font-bold uppercase tracking-wider">
                AI Agent #1
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-[#1ED28C]">
              Draft Replies
            </h2>
            <p className="text-[#e0e2ea] mb-8 leading-relaxed">
              The AI reads incoming messages, understands intent, tone, and
              priority — then drafts a professional reply for one-click send.
              Handles 80% of routine communications autonomously.
            </p>

            {/* Simulated email UI */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
              {[
                { from: "Client: Sarah K.", subject: "Re: Project Timeline", tag: "Auto-drafted", color: "bg-[#1ED28C]/20 text-[#1ED28C]" },
                { from: "Vendor: SupplyCo", subject: "Invoice #4521", tag: "Flagged", color: "bg-[#C67C2A]/20 text-[#C67C2A]" },
                { from: "Team: Alex", subject: "Weekly Standup Notes", tag: "Summarized", color: "bg-blue-500/20 text-blue-300" },
              ].map(({ from, subject, tag, color }) => (
                <div
                  key={subject}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <div className="font-semibold">{from}</div>
                    <div className="text-[#46464c] text-xs">{subject}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${color}`}>
                    {tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Sorting */}
          <div className="md:col-span-5 bg-[#F5F7FF] p-10 rounded-2xl border border-gray-100 flex flex-col justify-between">
            <div>
              <span className="px-3 py-1 bg-[#0A0F1E]/10 text-[#0A0F1E] rounded text-xs font-bold uppercase tracking-wider inline-block mb-6">
                AI Agent #2
              </span>
              <h2 className="text-2xl font-bold text-[#0A0F1E] mb-4">
                Smart Sorting
              </h2>
              <p className="text-[#46464c]">
                Learns from your behavior and auto-sorts every email into the
                right folder — urgent, follow-up, newsletter, or trash.
              </p>
            </div>
            <div className="mt-8 space-y-3">
              {[
                { label: "Urgent", count: 3, color: "bg-red-500" },
                { label: "Follow Up", count: 12, color: "bg-[#C67C2A]" },
                { label: "Newsletters", count: 47, color: "bg-gray-400" },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${color}`}></span>
                    <span className="text-sm font-semibold text-[#0A0F1E]">
                      {label}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#46464c]">
                    {count} emails
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Instant ROI */}
          <div className="md:col-span-4 bg-[#1ED28C] p-10 rounded-2xl text-[#0A0F1E] relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <Image
                src="/images/product/modern_abstract_representation_of_an_ai_email_assistant._digital_scanning.png"
                alt=""
                fill
                className="object-cover"
                sizes="400px"
              />
            </div>
            <div className="relative z-10">
              <div className="text-5xl font-black mb-2">10×</div>
              <h3 className="text-xl font-bold mb-2">Instant ROI</h3>
              <p className="text-sm opacity-80">
                Teams reclaim an average of 10 hours per week — reinvested into
                high-value strategic work.
              </p>
            </div>
          </div>

          <div className="md:col-span-8 bg-white p-10 rounded-2xl border border-gray-100 flex flex-col justify-center">
            <h3 className="text-xl font-bold text-[#0A0F1E] mb-4">
              Seamlessly integrates with your stack
            </h3>
            <div className="flex flex-wrap gap-3">
              {["Gmail", "Outlook", "Slack", "Notion", "HubSpot", "Salesforce", "Zendesk"].map((tool) => (
                <span
                  key={tool}
                  className="px-4 py-2 bg-[#F5F7FF] text-[#46464c] rounded-full text-sm font-semibold border border-[#e0e2ea]"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3-Feature Row */}
      <section className="py-[100px] px-5 md:px-16 bg-[#F5F7FF]">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0A0F1E]">
              Why RD TechBridge AI Agents
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <ArrowUpIcon className="h-8 w-8 text-[#0A0F1E]" />,
                title: "Increased Performance",
                desc: "AI agents operate at machine speed. No context-switching, no cognitive overload — just fast, consistent execution.",
              },
              {
                icon: <CheckCircleIcon className="h-8 w-8 text-[#0A0F1E]" />,
                title: "Zero Manual Errors",
                desc: "Eliminate typos, misfiled documents, and missed follow-ups. Every action is logged, verified, and reversible.",
              },
              {
                icon: <TimeIcon className="h-8 w-8 text-[#0A0F1E]" />,
                title: "24/7 AI Operation",
                desc: "Your agents never sleep. Handle inquiries, sort data, and trigger workflows overnight — without additional cost.",
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="bg-white p-8 rounded-xl border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="mb-4">{icon}</div>
                <h3 className="text-lg font-bold text-[#0A0F1E] mb-2">
                  {title}
                </h3>
                <p className="text-[#46464c] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark CTA */}
      <section className="bg-[#0A0F1E] py-24 px-5">
        <div className="max-w-3xl mx-auto text-center text-white space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold">
            Ready to reclaim your time?
          </h2>
          <p className="text-[#e0e2ea] text-lg">
            Book a free 30-minute audit and we&apos;ll show you exactly how many
            hours per week AI agents can save your team.
          </p>
          <Link
            href="/#contact"
            className="inline-block bg-[#1ED28C] text-[#0A0F1E] px-10 py-5 rounded-lg text-sm font-bold hover:brightness-90 active:scale-95 transition-all"
          >
            Book Free Audit
          </Link>
        </div>
      </section>
    </>
  );
}
