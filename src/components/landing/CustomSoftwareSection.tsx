import React from "react";
import Link from "next/link";

const CustomSoftwareSection = () => {
  const capabilities = [
    {
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
      ),
      title: "Internal Dashboards & Reporting",
      description: "One live view of the numbers that matter, pulled from the systems you already use.",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
            clipRule="evenodd"
          />
        </svg>
      ),
      title: "Workflow & Process Apps",
      description: "Replace the spreadsheet-and-email shuffle with a tool built around your actual process.",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" />
          <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15a24.98 24.98 0 01-8-1.308z" />
        </svg>
      ),
      title: "Employee & Client Portals",
      description: "A single login for your team or customers to get what they need, no more chasing files.",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" />
        </svg>
      ),
      title: "Custom Integrations",
      description: "Get the tools you already pay for talking to each other instead of living in silos.",
    },
  ];

  return (
    <section id="custom-software" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Left Column - Copy */}
          <div>
            <h2 className="mb-6 text-4xl font-bold text-gray-900 lg:text-5xl">
              Custom <span className="text-[#CD7F32]">Software Engineering</span>
            </h2>

            <div className="space-y-6 text-lg leading-relaxed text-gray-600">
              <p>
                Most businesses run on a patchwork of spreadsheets,
                disconnected apps, and workarounds nobody remembers the reason
                for. We engineer custom internal software — dashboards,
                portals, and workflow tools — built around how your business
                actually operates, not the other way around.
              </p>
              <p>
                No forcing your process into an off-the-shelf tool that almost
                fits.{" "}
                <span className="font-semibold text-[#CD7F32]">
                  Software built for the way you already work.
                </span>
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/services/custom-software-engineering"
                className="inline-block transform rounded-lg bg-[#CD7F32] px-8 py-4 text-center font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#8B4513] hover:shadow-lg"
              >
                See What We Build
              </Link>
              <Link
                href="/#contact"
                className="inline-block rounded-lg border border-gray-200 px-8 py-4 text-center font-semibold text-gray-700 transition-colors duration-300 hover:border-[#CD7F32] hover:text-[#CD7F32]"
              >
                Talk to an Engineer
              </Link>
            </div>
          </div>

          {/* Right Column - What We Build */}
          <div className="relative">
            <div className="rounded-2xl bg-white p-8 shadow-xl">
              <h3 className="mb-6 text-2xl font-bold text-gray-900">
                What We Build
              </h3>

              <div className="space-y-6">
                {capabilities.map((capability, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#CD7F32] to-[#8B4513] text-white">
                      {capability.icon}
                    </div>
                    <div>
                      <h4 className="mb-1 font-bold text-gray-900">
                        {capability.title}
                      </h4>
                      <p className="text-sm leading-relaxed text-gray-600">
                        {capability.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Background decoration */}
            <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-[#CD7F32]/20 blur-2xl"></div>
            <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-[#C41E3A]/20 blur-xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CustomSoftwareSection;
