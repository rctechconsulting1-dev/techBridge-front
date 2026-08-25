import type { Metadata } from "next";
import Link from "next/link";
import VideoPlayer from "@/components/landing/VideoPlayer";
import {
  FileIcon,
  TimeIcon,
  AlertIcon,
  BoltIcon,
  CheckCircleIcon,
  ShootingStarIcon,
  BoxIcon,
  ChatIcon,
  LockIcon,
  PieChartIcon,
} from "@/icons";

export const metadata: Metadata = {
  title: "Workflow Automation | RD TechBridge",
  description:
    "Replace manual bottlenecks with smart AI agents. We analyze your current workflow and build precision-engineered automation that scales with your business.",
  keywords:
    "workflow automation, AI agents, business automation, process automation, system integration, RD TechBridge",
};

export default function WorkflowAutomationPage() {
  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden py-16 md:py-24 px-5 md:px-16 max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1ED28C]/10 text-[#009762] rounded-full border border-[#1ED28C]/20">
              <span className="text-xs font-bold uppercase tracking-widest">
                Next-Gen Automation
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-[#0A0F1E]">
              From{" "}
              <span className="text-gray-400 italic">Manual Chaos</span>
              <br />
              to Automated Growth.
            </h1>
            <p className="text-lg text-[#46464c] max-w-xl">
              We analyze your current workflow and replace bottlenecks with
              smart AI agents. Stop running in circles and start scaling with
              precision-engineered technical infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/#contact"
                className="bg-[#C67C2A] text-white px-8 py-4 rounded-lg text-sm font-bold hover:brightness-90 active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                Analyze My Workflow
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
              href="/case-studies"
                className="border-2 border-[#0A0F1E] text-[#0A0F1E] px-8 py-4 rounded-lg text-sm font-bold hover:bg-[#0A0F1E] hover:text-white active:scale-95 transition-all text-center"
              >
                View Case Studies
              </Link>
            </div>
          </div>

          {/* Visual: Before State */}
          <div className="lg:col-span-6 relative">
            <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm relative z-10">
              <div className="flex items-center justify-between mb-8">
                <span className="text-xs font-bold text-gray-500 px-3 py-1 bg-gray-100 rounded-full uppercase tracking-wider">
                  Phase 01: Legacy Bottleneck
                </span>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <FileIcon className="h-8 w-8" />, label: "Paper Waste" },
                  { icon: <TimeIcon className="h-8 w-8" />, label: "Time Drain" },
                  {
                    icon: (
                      <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ),
                    label: "Inconsistency",
                  },
                  { icon: <AlertIcon className="h-8 w-8" />, label: "Human Error" },
                ].map(({ icon, label }) => (
                  <div
                    key={label}
                    className="p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center space-y-2 grayscale opacity-60"
                  >
                    <span>{icon}</span>
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-8 border-t border-gray-100 flex justify-center">
                <div className="flex flex-col items-center text-[#C67C2A]">
                  <span className="text-xs font-bold mb-2 uppercase tracking-wider">
                    Transition to AI
                  </span>
                  <svg
                    className="w-5 h-5 animate-bounce"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 w-64 h-64 bg-[#C67C2A]/5 rounded-full blur-3xl -z-10"></div>
          </div>
        </div>
      </section>

      {/* UGC Ad Video */}
      <section className="py-[80px] px-5 md:px-16 max-w-[1280px] mx-auto">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0A0F1E] mb-4">
            Hear It From a Business That Made the Switch
          </h2>
          <p className="text-[#46464c]">
            Real businesses are replacing manual chaos with AI-driven
            workflows. Here&apos;s what that looks like in practice.
          </p>
        </div>
        <div className="max-w-2xl mx-auto">
          <VideoPlayer
            src="https://techconsulting-rc.s3.us-west-1.amazonaws.com/assets/RD+Tech+Bridge+-+Business+Automation+UGC+Ad_1080p_caption.mp4"
            caption="Business Automation, Told by the People Who Use It"
          />
        </div>
      </section>

      {/* Automated Ecosystem Section */}
      <section className="bg-[#0A0F1E] py-[120px] text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#1ED28C] blur-[120px] rounded-full"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#C67C2A] blur-[120px] rounded-full"></div>
        </div>
        <div className="max-w-[1280px] mx-auto px-5 md:px-16 relative z-10">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold text-[#1ED28C]">
              The Automated Ecosystem
            </h2>
            <p className="text-lg text-[#e0e2ea] max-w-2xl mx-auto">
              No more manual handoffs. No more lost data. Just pure, scalable
              efficiency powered by AI agents working around the clock.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            {[
              {
                icon: <BoltIcon className="h-8 w-8 text-[#1ED28C]" />,
                stat: "85%",
                title: "Speed Increase",
                desc: "Slash operational turnaround times by automating repetitive manual verification tasks.",
              },
              {
                icon: <CheckCircleIcon className="h-8 w-8 text-[#1ED28C]" />,
                stat: "99.9%",
                title: "Accuracy",
                desc: "Eliminate human fatigue errors in data ingestion and document processing pipelines.",
              },
              {
                icon: <ShootingStarIcon className="h-8 w-8 text-[#1ED28C]" />,
                stat: "10×",
                title: "Seamless Scale",
                desc: "Handle ten times the volume without adding headcount by leveraging elastic AI cloud agents.",
              },
            ].map(({ icon, stat, title, desc }) => (
              <div
                key={title}
                className="p-8 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="mb-4">{icon}</div>
                <div className="text-3xl font-bold text-[#1ED28C] mb-1">
                  {stat}
                </div>
                <h3 className="text-xl font-bold mb-2">{title}</h3>
                <p className="text-[#e0e2ea] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Bento Grid */}
      <section className="py-[120px] px-5 md:px-16 max-w-[1280px] mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-[#0A0F1E]">
            Modular Optimization Pillars
          </h2>
          <p className="text-[#46464c] mt-2">
            Tailored solutions for technical complexity.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-10 rounded-2xl border border-gray-100 flex flex-col justify-end group cursor-pointer relative overflow-hidden hover:border-[#C67C2A] transition-colors">
            <div className="absolute top-10 right-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <BoxIcon className="h-[120px] w-[120px]" />
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-[#0A0F1E] mb-4">
                Intelligent Supply Chains
              </h3>
              <p className="text-[#46464c] mb-6">
                Predictive logistics that anticipate demand spikes before they
                happen, adjusting inventory in real-time across your operation.
              </p>
              <Link
                href="/#contact"
                className="text-[#C67C2A] font-bold text-sm flex items-center gap-2 hover:gap-4 transition-all"
              >
                Explore Logistics AI →
              </Link>
            </div>
          </div>

          <div className="bg-[#F5F7FF] p-10 rounded-2xl border border-gray-100 flex flex-col justify-between hover:border-[#1ED28C]/30 transition-all group">
            <div className="flex justify-between items-start">
              <div><ChatIcon className="h-8 w-8 text-[#0A0F1E]" /></div>
              <span className="bg-[#1ED28C] text-[#0A0F1E] px-3 py-1 rounded text-xs font-bold uppercase">
                New
              </span>
            </div>
            <div className="mt-6">
              <h3 className="text-2xl font-bold text-[#0A0F1E] mb-2">
                Active Chatbot Clusters
              </h3>
              <p className="text-[#46464c]">
                Autonomous support tiers that resolve 70% of tickets without
                human intervention — 24/7, at any scale.
              </p>
            </div>
          </div>

          <div className="bg-white p-10 rounded-2xl border border-gray-100 flex flex-col justify-center text-center hover:shadow-lg transition-shadow">
            <div className="mb-4 flex justify-center"><LockIcon className="h-8 w-8 text-[#0A0F1E]" /></div>
            <h4 className="font-bold text-[#0A0F1E]">Secure Cloud Data</h4>
            <p className="text-[#46464c] text-sm mt-2">
              Enterprise-grade security at every architectural layer.
            </p>
          </div>

          <div className="bg-[#0A0F1E] p-10 rounded-2xl border border-white/10 flex flex-col justify-center text-center text-white hover:bg-[#1ED28C] hover:text-[#0A0F1E] transition-all duration-300">
            <div className="mb-4 flex justify-center"><PieChartIcon className="h-8 w-8" /></div>
            <h4 className="font-bold">Live ROI Dashboards</h4>
            <p className="text-sm mt-2 opacity-70">
              Real-time visibility into every automated workflow.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-5 bg-white">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="w-20 h-20 bg-[#C67C2A]/10 rounded-full flex items-center justify-center mx-auto text-[#C67C2A]">
            <ShootingStarIcon className="h-9 w-9" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-[#0A0F1E]">
            Ready to Bridge the Gap?
          </h2>
          <p className="text-lg text-[#46464c]">
            Join 200+ forward-thinking businesses who have successfully bridged
            their manual processes into the AI era with RD TechBridge.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link
              href="/#contact"
              className="bg-[#C67C2A] text-white px-10 py-5 rounded-lg text-sm font-bold hover:brightness-90 active:scale-95 transition-all shadow-xl shadow-[#C67C2A]/20"
            >
              Book Your Free Demo
            </Link>
            <Link
              href="/#services"
              className="text-[#0A0F1E] px-10 py-5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#F5F7FF] transition-colors"
            >
              View All Services →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
