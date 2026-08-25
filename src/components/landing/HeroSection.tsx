"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

const HeroSection = () => {
  return (
    <section
      id="home"
      className="bg-gradient-to-br from-gray-50 to-white py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Left Column - Content */}
          <div className="text-center lg:text-left">
            <h1 className="mb-6 text-4xl leading-tight font-bold text-gray-900 lg:text-6xl">
              Websites, Ads &{" "}
              <span className="text-[#CD7F32]">AI Agents</span>{" "}
              for Growing Businesses
            </h1>

            <p className="mb-8 text-xl leading-relaxed text-gray-600">
              RD TechBridge builds conversion-focused websites, runs Google &
              Meta ad campaigns, and deploys AI agents that automate your
              customer follow-up — so you can focus on the work, not the tech.
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <Link
                href="/#contact"
                className="transform rounded-lg bg-[#CD7F32] px-8 py-4 text-lg font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#8B4513] hover:shadow-xl"
              >
                Get Started Today
              </Link>
              <Link
                href="/#services"
                className="rounded-lg border-2 border-[#CD7F32] px-8 py-4 text-lg font-semibold text-[#CD7F32] transition-all duration-300 hover:bg-[#CD7F32] hover:text-white"
              >
                Learn More
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 border-t border-gray-200 pt-8">
              <p className="mb-4 text-sm text-gray-500">
                Trusted by growing businesses
              </p>
              <div className="flex items-center justify-center space-x-8 text-gray-400 lg:justify-start">
                <div className="text-2xl font-bold">50+</div>
                <div className="text-sm">
                  <div className="font-semibold text-gray-600">Projects</div>
                  <div>Completed</div>
                </div>
                <div className="text-2xl font-bold">98%</div>
                <div className="text-sm">
                  <div className="font-semibold text-gray-600">Client</div>
                  <div>Satisfaction</div>
                </div>
                <div className="text-2xl font-bold">24/7</div>
                <div className="text-sm">
                  <div className="font-semibold text-gray-600">Technical</div>
                  <div>Support</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            <div className="relative z-10">
              <div className="rotate-3 transform rounded-2xl bg-white p-3 shadow-2xl transition-transform duration-500 hover:rotate-0">
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
                  <Image
                    src="/images/product/hero-team-review.png"
                    alt="RD TechBridge team reviewing a client website build"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                </div>
              </div>
            </div>

            {/* Background Decorations */}
            <div className="absolute -top-4 -right-4 h-72 w-72 rounded-full bg-gradient-to-br from-[#CD7F32]/20 to-[#C41E3A]/20 blur-3xl"></div>
            <div className="absolute -bottom-8 -left-8 h-64 w-64 rounded-full bg-gradient-to-tr from-blue-100 to-purple-100 blur-2xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
