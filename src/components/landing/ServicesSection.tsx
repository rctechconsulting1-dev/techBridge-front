import React from "react";

const ServicesSection = () => {
  const services = [
    {
      icon: (
        <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
      ),
      title: "Web Development",
      description:
        "Custom websites and web applications that grow with your business. Modern, responsive, and optimized for performance.",
      features: [
        "Responsive Design",
        "SEO Optimization",
        "Performance Focused",
        "Mobile-First",
      ],
    },
    {
      icon: (
        <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
            clipRule="evenodd"
          />
        </svg>
      ),
      title: "System Integration",
      description:
        "Seamlessly connect your existing tools and processes. We make your technology stack work together harmoniously.",
      features: [
        "API Integration",
        "Data Synchronization",
        "Workflow Automation",
        "Third-party Connections",
      ],
    },
    {
      icon: (
        <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      ),
      title: "Technical Support",
      description:
        "Ongoing support to keep your technology running smoothly. Proactive monitoring and quick issue resolution.",
      features: [
        "24/7 Monitoring",
        "Quick Response",
        "Preventive Maintenance",
        "Emergency Support",
      ],
    },
    {
      icon: (
        <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
          <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15a24.98 24.98 0 01-8-1.308z" />
        </svg>
      ),
      title: "Business Automation",
      description:
        "Automate repetitive tasks and streamline your processes. Focus on growth while we handle the routine work.",
      features: [
        "Process Automation",
        "Custom Workflows",
        "Data Processing",
        "Report Generation",
        "AI-Powered Automation",
      ],
    },
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
      title: "Digital Transformation",
      description:
        "Modernize your business operations with cutting-edge technology. Stay competitive in the digital age.",
      features: [
        "Cloud Migration",
        "Digital Strategy",
        "Technology Consulting",
        "Scalable Solutions",
      ],
    },
    {
      icon: (
        <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Quality Assurance",
      description:
        "Rigorous testing and quality control ensure your technology solutions work flawlessly from day one.",
      features: [
        "Comprehensive Testing",
        "Performance Optimization",
        "Security Audits",
        "User Experience Testing",
      ],
    },
  ];

  return (
    <section id="services" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="mb-6 text-4xl font-bold text-gray-900 lg:text-5xl">
            Our <span className="text-[#CD7F32]">Services</span>
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600">
            We provide comprehensive technology solutions that remove obstacles
            and enable your business to thrive. Our expertise becomes your
            competitive advantage.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <div
              key={index}
              className="group transform rounded-xl border border-gray-100 bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:border-[#CD7F32]/20 hover:shadow-2xl"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-[#CD7F32] to-[#8B4513] text-white transition-transform duration-300 group-hover:scale-110">
                {service.icon}
              </div>

              <h3 className="mb-4 text-2xl font-bold text-gray-900">
                {service.title}
              </h3>

              <p className="mb-6 leading-relaxed text-gray-600">
                {service.description}
              </p>

              <ul className="space-y-2">
                {service.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    className="flex items-center text-sm text-gray-600"
                  >
                    <div className="mr-3 h-2 w-2 rounded-full bg-[#C41E3A]"></div>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-6 border-t border-gray-100 pt-6">
                <button className="group flex items-center font-semibold text-[#CD7F32] transition-colors duration-200 hover:text-[#8B4513]">
                  Learn More
                  <svg
                    className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="rounded-2xl bg-gradient-to-r from-[#CD7F32] to-[#C41E3A] p-8 text-white">
            <h3 className="mb-4 text-3xl font-bold">
              Ready to Transform Your Business?
            </h3>
            <p className="mb-6 text-xl opacity-90">
              Let&apos;s discuss how our technology solutions can accelerate
              your growth.
            </p>
            <button className="transform rounded-lg bg-white px-8 py-3 font-semibold text-[#CD7F32] transition-colors duration-300 hover:scale-105 hover:bg-gray-100">
              Schedule a Consultation
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
