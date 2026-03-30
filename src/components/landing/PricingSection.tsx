"use client";

import React, { useCallback, useState } from "react";

/* ────────────────────────────── Types ───────────────────────────── */

type PlanDef = {
  name: string;
  plan_key: string;
  price: number | null; // null = custom
  setupFee: string;
  commitment: string;
  seats: string;
  tagline: string;
  features: string[];
  popular: boolean;
  buttonText: string;
};

/* ────────────────────────────── Plan data ────────────────────────── */

const plans: PlanDef[] = [
  {
    name: "Starter",
    plan_key: "starter",
    price: 49,
    setupFee: "$199",
    commitment: "4-mo minimum",
    seats: "2 seats",
    tagline: "Core web presence",
    features: [
      "Website core + hosting",
      "SEO content basics",
      "Lead capture forms",
      "Basic metrics dashboard",
      "Custom domain",
    ],
    popular: false,
    buttonText: "Get Started",
  },
  {
    name: "Professional",
    plan_key: "professional",
    price: 97,
    setupFee: "$349",
    commitment: "4-mo minimum",
    seats: "5 seats",
    tagline: "Growth + local visibility",
    features: [
      "All Starter modules",
      "Calendar / appointments",
      "Google My Business mgmt",
      "Lead gen emails + SMS",
      "Advanced metrics",
      "LLM + Google ranking tools",
      "Custom pages",
    ],
    popular: true,
    buttonText: "Most Popular",
  },
  {
    name: "Business",
    plan_key: "business",
    price: 247,
    setupFee: "$599",
    commitment: "4-mo minimum",
    seats: "15 seats",
    tagline: "Full stack + ads + AI",
    features: [
      "All Professional modules",
      "Ecommerce + Stripe checkout",
      "Google Ads setup + mgmt",
      "Ad budget: client-controlled",
      "Custom AI agent",
      "Lead gen calls",
      "Priority support",
    ],
    popular: false,
    buttonText: "Go Business",
  },
  {
    name: "Enterprise",
    plan_key: "enterprise",
    price: null,
    setupFee: "Custom",
    commitment: "Terms negotiated",
    seats: "Unlimited seats",
    tagline: "Multi-location / high-volume",
    features: [
      "All Business modules",
      "Multi AI agents",
      "Google Ads — multi-campaign",
      "White-label option",
      "Dedicated account manager",
    ],
    popular: false,
    buttonText: "Contact Us",
  },
];

/* ────────────────────────────── API ─────────────────────────────── */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/* ────────────────────────────── Component ───────────────────────── */

const PricingSection = () => {
  // Modal state
  const [modalPlan, setModalPlan] = useState<PlanDef | null>(null);
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formBusiness, setFormBusiness] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const openModal = useCallback((plan: PlanDef) => {
    setModalPlan(plan);
    setFormEmail("");
    setFormName("");
    setFormBusiness("");
    setFormError("");
  }, []);

  const closeModal = useCallback(() => {
    if (!submitting) setModalPlan(null);
  }, [submitting]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!modalPlan?.plan_key) return;

      const email = formEmail.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFormError("Please enter a valid email address.");
        return;
      }

      setSubmitting(true);
      setFormError("");

      try {
        const res = await fetch(
          `${API_BASE}/billing/public/checkout/self-service`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              plan_key: modalPlan.plan_key,
              email,
              business_name: formBusiness.trim() || formName.trim() || undefined,
            }),
          },
        );

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.error || "Something went wrong. Please try again.",
          );
        }

        const { url } = await res.json();
        if (url) {
          window.location.href = url;
        } else {
          throw new Error("No checkout URL returned.");
        }
      } catch (err: unknown) {
        setFormError(
          err instanceof Error ? err.message : "Something went wrong.",
        );
        setSubmitting(false);
      }
    },
    [modalPlan, formEmail, formName, formBusiness],
  );

  const handlePlanClick = useCallback(
    (plan: PlanDef) => {
      if (plan.price !== null && plan.plan_key !== "enterprise") {
        openModal(plan);
      } else {
        // Enterprise — scroll to consultation CTA
        document
          .getElementById("pricing-cta")
          ?.scrollIntoView({ behavior: "smooth" });
      }
    },
    [openModal],
  );

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
                  <p>{plan.seats}</p>
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
                <button
                  onClick={() => handlePlanClick(plan)}
                  className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                    plan.popular
                      ? "bg-gradient-to-r from-[#CD7F32] to-[#C41E3A] text-white hover:shadow-xl"
                      : "bg-gray-100 text-[#CD7F32] hover:bg-[#CD7F32] hover:text-white"
                  }`}
                >
                  {plan.buttonText}
                </button>
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
              <button className="bg-[#CD7F32] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#8B4513] transition-colors duration-300">
                Schedule Consultation
              </button>
              <button className="border-2 border-[#CD7F32] text-[#CD7F32] px-8 py-3 rounded-lg font-semibold hover:bg-[#CD7F32] hover:text-white transition-colors duration-300">
                View Portfolio
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Self-Service Checkout Modal ─── */}
      {modalPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none"
              aria-label="Close"
            >
              &times;
            </button>

            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              Get Started with {modalPlan.name}
            </h3>
            <p className="text-gray-500 mb-6">
              ${modalPlan.price}/mo &mdash; enter your details to proceed to
              secure checkout.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="ss-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Your Name
                </label>
                <input
                  id="ss-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-[#CD7F32] focus:ring-1 focus:ring-[#CD7F32] outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="ss-email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="ss-email"
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-[#CD7F32] focus:ring-1 focus:ring-[#CD7F32] outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="ss-business"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Business Name
                </label>
                <input
                  id="ss-business"
                  type="text"
                  value={formBusiness}
                  onChange={(e) => setFormBusiness(e.target.value)}
                  placeholder="Acme Plumbing LLC"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-[#CD7F32] focus:ring-1 focus:ring-[#CD7F32] outline-none"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-600">{formError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-[#CD7F32] to-[#C41E3A] hover:shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting
                  ? "Redirecting to checkout…"
                  : "Continue to Checkout"}
              </button>

              <p className="text-xs text-center text-gray-400">
                You&apos;ll be redirected to Stripe for secure payment.
              </p>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default PricingSection;
