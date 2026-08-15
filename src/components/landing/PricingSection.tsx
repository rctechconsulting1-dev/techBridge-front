"use client";

import React from "react";
import Link from "next/link";
import { plans } from "@/lib/plans";

/* ────────────────────────────── Component ───────────────────────── */

const PricingSection = () => {
  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Choose Your <span className="text-[#CD7F32]">Plan</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transparent pricing for every stage of growth. All plans include a
            4-month minimum commitment and one-time setup fee.
          </p>
        </div>

        {/* Pricing Cards — 4-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl shadow-xl border-2 transition-all duration-300 transform hover:-translate-y-2 flex flex-col ${
                plan.popular
                  ? "border-[#CD7F32] scale-[1.03]"
                  : "border-gray-200 hover:border-[#CD7F32]/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-[#CD7F32] to-[#C41E3A] text-white px-5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap">
                    Most popular
                  </span>
                </div>
              )}

              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-gray-900">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  {plan.tagline}
                </p>

                {/* Price */}
                <div className="mb-4">
                  {plan.price !== null ? (
                    <>
                      <span className="text-4xl font-bold text-[#CD7F32]">
                        ${plan.price}
                      </span>
                      <span className="text-gray-500 ml-1">/mo</span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold text-[#CD7F32]">
                      Custom
                    </span>
                  )}
                </div>

                {/* Meta info */}
                <div className="text-xs text-gray-500 space-y-0.5 mb-5">
                  <p>Setup: {plan.setupFee}</p>
                  <p>{plan.commitment}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, fi) => (
                    <li key={fi} className="flex items-start">
                      <svg
                        className="w-4 h-4 text-[#C41E3A] mr-2 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                <Link
                  href="/plans"
                  className={`block w-full py-3 text-center rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                    plan.popular
                      ? "bg-gradient-to-r from-[#CD7F32] to-[#C41E3A] text-white hover:shadow-xl"
                      : "bg-gray-100 text-[#CD7F32] hover:bg-[#CD7F32] hover:text-white"
                  }`}
                >
                  {plan.buttonText}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* CTA / Custom */}
        <div id="pricing-cta" className="mt-16 text-center">
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Need a Custom Solution?
            </h3>
            <p className="text-lg text-gray-600 mb-6">
              Every business is unique. Let&apos;s discuss your specific needs
              and create a tailored solution that fits your goals and budget.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/#contact"
                className="inline-block bg-[#CD7F32] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#8B4513] transition-colors duration-300"
              >
                Schedule Consultation
              </Link>
              <Link
                href="/#services"
                className="inline-block border-2 border-[#CD7F32] text-[#CD7F32] px-8 py-3 rounded-lg font-semibold hover:bg-[#CD7F32] hover:text-white transition-colors duration-300"
              >
                View Services
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
