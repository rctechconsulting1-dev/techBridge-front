import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BoxCubeIcon,
  PlugInIcon,
  LockIcon,
  PieChartIcon,
  BoltIcon,
  GroupIcon,
  DollarLineIcon,
  PencilIcon,
} from "@/icons";

export const metadata: Metadata = {
  title: "Custom Software Engineering | RD TechBridge",
  description:
    "We engineer custom internal software — dashboards, portals, and workflow tools — built around how your business actually operates, not the other way around.",
  keywords:
    "custom software development, internal tools, SaaS application development, workflow automation, business software, RD TechBridge",
};

export default function CustomSoftwareEngineeringPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[#F5F7FF] py-16 md:py-24 px-5 md:px-16 overflow-hidden">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A0F1E]/10 text-[#0A0F1E] rounded-full border border-[#0A0F1E]/10">
              <span className="text-xs font-bold uppercase tracking-widest">
                Engineered, Not Off-the-Shelf
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-[#0A0F1E]">
              Software Built{" "}
              <span className="text-[#C67C2A]">Around Your Business.</span>
            </h1>
            <p className="text-lg text-[#46464c] max-w-xl">
              Spreadsheets, disconnected apps, and manual handoffs don&apos;t
              scale. We engineer the internal dashboards, portals, and
              workflow tools that replace them — fit to how your team already
              works.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/#contact"
                className="bg-[#0A0F1E] text-white px-8 py-4 rounded-lg text-sm font-bold hover:brightness-125 active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                Scope Your Project
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
                className="text-[#0A0F1E] px-8 py-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/60 transition-colors"
              >
                See All Services →
              </Link>
            </div>
          </div>

          {/* Glass cards */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="relative w-full h-[200px] rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="/images/product/custom-software-network-tablet.png"
                alt="Reviewing a custom software integration on a tablet"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
            <div className="bg-[#0A0F1E] border border-white/10 rounded-2xl p-6 shadow-sm text-white flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1ED28C]/20 rounded-xl flex items-center justify-center text-[#1ED28C]">
                <BoxCubeIcon className="h-6 w-6" />
              </div>
              <div>
                <div className="font-bold">Built Around Your Process</div>
                <div className="text-sm text-[#e0e2ea]">
                  Not the other way around
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-[#C67C2A]/10 rounded-xl flex items-center justify-center text-[#C67C2A]">
                <PlugInIcon className="h-6 w-6" />
              </div>
              <div>
                <div className="font-bold text-[#0A0F1E]">
                  Connects to Your Existing Stack
                </div>
                <div className="text-sm text-[#46464c]">
                  No rip-and-replace, no re-training your team from scratch
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1ED28C]/10 rounded-xl flex items-center justify-center text-[#009762]">
                <LockIcon className="h-6 w-6" />
              </div>
              <div>
                <div className="font-bold text-[#0A0F1E]">You Own What We Build</div>
                <div className="text-sm text-[#46464c]">
                  No per-seat licensing on software built for your business
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-[120px] px-5 md:px-16 max-w-[1280px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-[#0A0F1E]">
            What We Build
          </h2>
          <p className="text-[#46464c] mt-2">
            Internal software that fits how your team actually operates.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <PieChartIcon className="h-9 w-9 text-[#0A0F1E]" />,
              title: "Internal Dashboards & Reporting",
              desc: "One live view of the numbers scattered across your spreadsheets, tools, and inboxes today.",
              items: [
                "Real-time operational dashboards",
                "Custom reporting & exports",
                "Role-based access controls",
                "Data pulled from your existing systems",
              ],
            },
            {
              icon: <BoltIcon className="h-9 w-9 text-[#0A0F1E]" />,
              title: "Workflow & Process Automation",
              desc: "Turn a manual, multi-step process into a tool your team opens once and trusts.",
              items: [
                "Approval & task routing",
                "Automated status tracking",
                "Notifications & reminders",
                "Audit trail on every action",
              ],
            },
            {
              icon: <GroupIcon className="h-9 w-9 text-[#0A0F1E]" />,
              title: "Portals & Integrations",
              desc: "A single login for your team or clients, wired directly into the tools you already pay for.",
              items: [
                "Employee & client portals",
                "API & third-party integrations",
                "Custom admin panels",
                "Legacy system modernization",
              ],
            },
          ].map(({ icon, title, desc, items }) => (
            <div
              key={title}
              className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-xl transition-shadow flex flex-col"
            >
              <div className="mb-4">{icon}</div>
              <h3 className="text-xl font-bold text-[#0A0F1E] mb-3">{title}</h3>
              <p className="text-[#46464c] text-sm leading-relaxed mb-6">
                {desc}
              </p>
              <ul className="mt-auto space-y-2">
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
          ))}
        </div>
      </section>

      {/* Why RD TechBridge */}
      <section className="py-[100px] px-5 md:px-16 bg-[#F5F7FF]">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0A0F1E]">
              Why Engineer It Custom
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <BoxCubeIcon className="h-8 w-8 text-[#0A0F1E]" />,
                title: "Fits Your Process",
                desc: "Off-the-shelf software makes you adapt to it. Custom software adapts to you — no workarounds for the 20% it doesn't cover.",
              },
              {
                icon: <DollarLineIcon className="h-8 w-8 text-[#0A0F1E]" />,
                title: "No Per-Seat Fees",
                desc: "Add every employee or client without another monthly subscription line. You own the software outright.",
              },
              {
                icon: <PencilIcon className="h-8 w-8 text-[#0A0F1E]" />,
                title: "Built to Extend",
                desc: "As your process changes, the software changes with it — no waiting on a vendor's roadmap to ship the feature you need.",
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
      <section className="bg-[#0A0F1E] py-24 px-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#C67C2A] blur-[150px] rounded-full"></div>
        </div>
        <div className="max-w-3xl mx-auto text-center text-white space-y-8 relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold">
            Ready to Build the Tool You Actually Need?
          </h2>
          <p className="text-[#e0e2ea] text-lg">
            Tell us about the process you&apos;re managing by hand. We&apos;ll
            scope what it would take to engineer a tool for it.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link
              href="/#contact"
              className="bg-[#C67C2A] text-white px-10 py-5 rounded-lg text-sm font-bold hover:brightness-90 active:scale-95 transition-all shadow-xl shadow-[#C67C2A]/20"
            >
              Scope Your Project
            </Link>
            <Link
              href="/#services"
              className="text-white px-10 py-5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
            >
              Explore All Services →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
