import React from "react";

const AboutSection = () => {
  const stats = [
    { value: "50+", label: "Projects Completed" },
    { value: "98%", label: "Client Satisfaction" },
    { value: "24/7", label: "Support Available" },
    { value: "5+", label: "Years Experience" },
  ];

  const values = [
    {
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
      title: "Reliability",
      description:
        "We deliver consistent, dependable solutions that you can count on.",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Quality",
      description:
        "Every solution is crafted with attention to detail and best practices.",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
            clipRule="evenodd"
          />
        </svg>
      ),
      title: "Partnership",
      description:
        "We become your trusted technology partner, not just a vendor.",
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
      title: "Innovation",
      description:
        "We stay ahead of technology trends to keep your business competitive.",
    },
  ];

  return (
    <section id="about" className="bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Content */}
        <div className="mb-20 grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Left Column - Content */}
          <div>
            <h2 className="mb-8 text-4xl font-bold text-gray-900 lg:text-5xl">
              About <span className="text-[#CD7F32]">RD Tech Bridge</span>
            </h2>

            <div className="space-y-6 text-lg leading-relaxed text-gray-600">
              <p>
                We believe small businesses should spend their time on business
                strategy, not troubleshooting servers. That&apos;s why RC Tech
                Bridge exists – to be your reliable technology partner, removing
                obstacles and creating solutions that work seamlessly behind the
                scenes.
              </p>

              <p>
                Our mission is simple:{" "}
                <span className="font-semibold text-[#CD7F32]">
                  bridge the gap between your business goals and technology
                  solutions
                </span>
                . We handle the complexity so you can focus on what you do best
                – growing your business and serving your customers.
              </p>

              <p>
                With years of experience in web development, system integration,
                and business automation, we understand both the technical
                challenges and business needs that drive success.
              </p>
            </div>

            <div className="mt-8">
              <button className="transform rounded-lg bg-[#CD7F32] px-8 py-4 font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#8B4513] hover:shadow-lg">
                Learn Our Story
              </button>
            </div>
          </div>

          {/* Right Column - Visual/Stats */}
          <div className="relative">
            <div className="rounded-2xl bg-white p-8 shadow-xl">
              <h3 className="mb-8 text-center text-2xl font-bold text-gray-900">
                Our Impact
              </h3>

              <div className="grid grid-cols-2 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="mb-2 text-3xl font-bold text-[#CD7F32]">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Team Photo Placeholder */}
              <div className="mt-8 border-t border-gray-100 pt-8">
                <div className="rounded-lg bg-gradient-to-r from-[#CD7F32]/10 to-[#C41E3A]/10 p-6 text-center">
                  <div className="mb-4 flex items-center justify-center space-x-2">
                    <span className="text-2xl font-bold text-[#CD7F32]">R</span>
                    <div className="h-1 w-8 rounded-full bg-[#C41E3A]"></div>
                    <span className="text-2xl font-bold text-[#CD7F32]">C</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Building bridges between businesses and technology since
                    2020
                  </p>
                </div>
              </div>
            </div>

            {/* Background decoration */}
            <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-[#CD7F32]/20 blur-2xl"></div>
            <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-[#C41E3A]/20 blur-xl"></div>
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-12 text-center">
          <h3 className="mb-4 text-3xl font-bold text-gray-900">
            Our <span className="text-[#C41E3A]">Values</span>
          </h3>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            These principles guide everything we do and ensure we deliver
            exceptional results for every client.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {values.map((value, index) => (
            <div
              key={index}
              className="group transform rounded-xl bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#CD7F32] to-[#C41E3A] text-white transition-transform duration-300 group-hover:scale-110">
                {value.icon}
              </div>

              <h4 className="mb-3 text-xl font-bold text-gray-900">
                {value.title}
              </h4>

              <p className="leading-relaxed text-gray-600">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
