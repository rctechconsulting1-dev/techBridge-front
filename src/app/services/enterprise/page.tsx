import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Enterprise AI Integration | RD TechBridge",
  description:
    "Modernize legacy systems, integrate AI at scale, and harden enterprise security — without halting operations. SOC2 compliant, cloud-native architecture.",
  keywords:
    "enterprise AI, cloud modernization, legacy systems, SOC2, AI integration, enterprise security, RD TechBridge",
};

export default function EnterprisePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[#F5F7FF] py-16 md:py-24 px-5 md:px-16 overflow-hidden">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A0F1E]/10 text-[#0A0F1E] rounded-full border border-[#0A0F1E]/10">
              <span className="text-xs font-bold uppercase tracking-widest">
                Enterprise Grade
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-[#0A0F1E]">
              Legacy Systems,{" "}
              <span className="text-[#C67C2A]">Modern Efficiency.</span>
            </h1>
            <p className="text-lg text-[#46464c] max-w-xl">
              We don&apos;t rip and replace. We surgically integrate AI and
              cloud-native tooling into your existing enterprise stack — with
              zero downtime and full compliance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/#contact"
                className="bg-[#0A0F1E] text-white px-8 py-4 rounded-lg text-sm font-bold hover:brightness-125 active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                Schedule Enterprise Consult
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
            </div>
          </div>

          {/* Glass cards */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-[#0A0F1E]">
                  AI Accuracy Score
                </span>
                <span className="text-sm font-bold text-[#1ED28C]">99.4%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-[#1ED28C] h-2 rounded-full"
                  style={{ width: "99.4%" }}
                ></div>
              </div>
              <p className="text-xs text-[#46464c] mt-2">
                Measured across 1.2M enterprise transactions last quarter.
              </p>
            </div>
            <div className="bg-[#0A0F1E] border border-white/10 rounded-2xl p-6 shadow-sm text-white flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1ED28C]/20 rounded-xl flex items-center justify-center text-[#1ED28C] text-2xl">
                🛡️
              </div>
              <div>
                <div className="font-bold">SOC2 Type II Compliant</div>
                <div className="text-sm text-[#e0e2ea]">
                  All integrations audited and certified
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-[#C67C2A]/10 rounded-xl flex items-center justify-center text-2xl">
                ⚡
              </div>
              <div>
                <div className="font-bold text-[#0A0F1E]">
                  Zero-Downtime Migration
                </div>
                <div className="text-sm text-[#46464c]">
                  Live switchover with full rollback capability
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
            Enterprise Service Suite
          </h2>
          <p className="text-[#46464c] mt-2">
            End-to-end modernization across your entire tech estate.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: "☁️",
              title: "Cloud Modernization",
              desc: "Migrate monolithic applications to microservices and cloud-native architectures. Reduce infra cost by up to 40% while improving reliability.",
              items: [
                "AWS / Azure / GCP migration",
                "Kubernetes orchestration",
                "Serverless function design",
                "Database sharding & replication",
              ],
            },
            {
              icon: "🤖",
              title: "AI Integration",
              desc: "Embed machine learning models directly into your existing business intelligence and operational workflows — no rebuild required.",
              items: [
                "Predictive analytics pipelines",
                "NLP document processing",
                "Computer vision QA systems",
                "Recommendation engines",
              ],
            },
            {
              icon: "🔒",
              title: "Systems Security",
              desc: "Enterprise-grade hardening with continuous vulnerability scanning, threat modeling, and compliance automation for regulated industries.",
              items: [
                "SOC2 / ISO 27001 readiness",
                "Zero-trust architecture",
                "SIEM integration",
                "Penetration testing",
              ],
            },
          ].map(({ icon, title, desc, items }) => (
            <div
              key={title}
              className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-xl transition-shadow flex flex-col"
            >
              <div className="text-4xl mb-4">{icon}</div>
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

      {/* Dark CTA */}
      <section className="bg-[#0A0F1E] py-24 px-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#C67C2A] blur-[150px] rounded-full"></div>
        </div>
        <div className="max-w-3xl mx-auto text-center text-white space-y-8 relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold">
            Ready to Bridge the Gap?
          </h2>
          <p className="text-[#e0e2ea] text-lg">
            Our enterprise architects will assess your current stack and deliver
            a free modernization roadmap within 5 business days.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link
              href="/#contact"
              className="bg-[#C67C2A] text-white px-10 py-5 rounded-lg text-sm font-bold hover:brightness-90 active:scale-95 transition-all shadow-xl shadow-[#C67C2A]/20"
            >
              Request Free Assessment
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
