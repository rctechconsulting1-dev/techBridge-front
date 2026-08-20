"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { plans, type PlanDef } from "@/lib/plans";

/* ────────────────────────────── Add-on services ─────────────────── */

const addOnServices = [
  {
    name: "Logo Creation",
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.829-2.828z" />
      </svg>
    ),
  },
  {
    name: "Social Media Marketing",
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47A3 3 0 1013 12.5c0-.243-.03-.478-.084-.703l-4.94-2.47a3.027 3.027 0 000-.653l4.94-2.47c.53.512 1.25.796 2.084.796z" />
      </svg>
    ),
  },
  {
    name: "Content Creation",
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 6a1 1 0 000 2h6a1 1 0 100-2H7zm0 3a1 1 0 100 2h6a1 1 0 100-2H7z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    name: "Business Cards",
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm2 1v1h12V7H4zm0 3v4h4v-4H4zm6 0v1h6v-1h-6zm0 2v1h6v-1h-6z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

/* ────────────────────────────── Component ───────────────────────── */

const PlansSection = () => {
  const [modalPlan, setModalPlan] = useState<PlanDef | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formBusiness, setFormBusiness] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const openModal = useCallback((plan: PlanDef) => {
    setModalPlan(plan);
    setFormName("");
    setFormEmail("");
    setFormBusiness("");
    setHoneypot("");
    setFormError("");
    setSubmitted(false);
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
      if (!formName.trim()) {
        setFormError("Please enter your name.");
        return;
      }
      if (!formBusiness.trim()) {
        setFormError("Please enter your business name.");
        return;
      }

      setSubmitting(true);
      setFormError("");

      try {
        const res = await fetch("/api/public/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan_key: modalPlan.plan_key,
            name: formName.trim(),
            email,
            business_name: formBusiness.trim(),
            website_url: honeypot,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Something went wrong. Please try again.");
        }

        setSubmitted(true);
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setSubmitting(false);
      }
    },
    [modalPlan, formName, formEmail, formBusiness, honeypot],
  );

  const handlePlanClick = useCallback(
    (plan: PlanDef) => {
      if (plan.plan_key !== "enterprise") {
        openModal(plan);
      } else {
        document.getElementById("plans-cta")?.scrollIntoView({ behavior: "smooth" });
      }
    },
    [openModal],
  );

  return (
    <section id="plans" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Choose Your <span className="text-[#CD7F32]">Plan</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Tell us about your business and we&apos;ll send you a short questionnaire,
            then get a kickoff call on the calendar — pricing is confirmed on that call.
          </p>
        </div>

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
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">{plan.tagline}</p>

                <div className="mb-4">
                  {plan.price !== null ? (
                    <>
                      <span className="block text-sm text-gray-500">Starting at</span>
                      <span className="text-4xl font-bold text-[#CD7F32]">${plan.price}</span>
                      <span className="text-gray-500 ml-1">/mo</span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold text-[#CD7F32]">Custom</span>
                  )}
                </div>

                <div className="text-xs text-gray-500 space-y-0.5 mb-5">
                  <p>Setup: {plan.setupFee}</p>
                  <p>{plan.commitment}</p>
                </div>

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

        {/* Additional Services — no pricing, informational only */}
        <div className="mt-16">
          <div className="text-center mb-10">
            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Additional Services
            </h3>
            <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
              À la carte add-ons available alongside any plan.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {addOnServices.map((service) => (
              <div
                key={service.name}
                className="flex flex-col items-center text-center rounded-2xl border-2 border-gray-200 p-6 transition-all duration-300 hover:border-[#CD7F32]/50 hover:-translate-y-1"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-[#CD7F32] to-[#8B4513] text-white">
                  {service.icon}
                </div>
                <p className="font-semibold text-gray-900">{service.name}</p>
              </div>
            ))}
          </div>
        </div>

        <div id="plans-cta" className="mt-16 text-center">
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Need a Custom Solution?</h3>
            <p className="text-lg text-gray-600 mb-6">
              Every business is unique. Let&apos;s discuss your specific needs and create a
              tailored solution that fits your goals and budget.
            </p>
            <Link
              href="/#contact"
              className="inline-block bg-[#CD7F32] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#8B4513] transition-colors duration-300"
            >
              Schedule Consultation
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            By signing up for a Plan, you agree to our{" "}
            <Link href="/subscription-terms" className="text-[#CD7F32] hover:underline">
              Subscription Terms &amp; Conditions
            </Link>
            .
          </p>
        </div>
      </div>

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

            {submitted ? (
              <>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Check your email</h3>
                <p className="text-gray-500">
                  We&apos;ve sent a short questionnaire to <strong>{formEmail}</strong>. Complete
                  it and you&apos;ll be able to book a kickoff call — we&apos;ll go over pricing
                  then.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  Get Started with {modalPlan.name}
                </h3>
                <p className="text-gray-500 mb-6">
                  Starting at ${modalPlan.price ?? "—"}/mo &mdash; Setup: {modalPlan.setupFee}
                  &mdash; {modalPlan.commitment}. Tell us a bit about your business.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="ps-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="ps-name"
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-[#CD7F32] focus:ring-1 focus:ring-[#CD7F32] outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="ps-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="ps-email"
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-[#CD7F32] focus:ring-1 focus:ring-[#CD7F32] outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="ps-business" className="block text-sm font-medium text-gray-700 mb-1">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="ps-business"
                      type="text"
                      required
                      value={formBusiness}
                      onChange={(e) => setFormBusiness(e.target.value)}
                      placeholder="Acme Plumbing LLC"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-[#CD7F32] focus:ring-1 focus:ring-[#CD7F32] outline-none"
                    />
                  </div>

                  {/* Honeypot: hidden from real visitors, most bots fill every field. */}
                  <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
                    <label htmlFor="ps-website">Website</label>
                    <input
                      id="ps-website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  {formError && <p className="text-sm text-red-600">{formError}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-[#CD7F32] to-[#C41E3A] hover:shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Sending…" : "Send Me the Questionnaire"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default PlansSection;
