"use client";
import { useState } from "react";
import type { FAQItem, SiteSettings } from "@/lib/cms-types";
import type { FAQSectionVariant } from "@/components/sections/sectionVariants";

interface Props {
  faq: FAQItem[];
  settings: SiteSettings | null;
  variant?: FAQSectionVariant;
}

export default function FAQSection({ faq, settings, variant = "accordion" }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const primary = settings?.primary_color ?? "#CD7F32";

  if (faq.length === 0) return null;

  if (variant === "cards") {
    return (
      <section id="faq" className="scroll-mt-20 bg-[#FBF6F0] py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
              FAQ
            </p>
            <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">Answers that remove friction fast</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {faq.map((item) => (
              <div key={item.id} className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">{item.question}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "split_list") {
    const midpoint = Math.ceil(faq.length / 2);
    const columns = [faq.slice(0, midpoint), faq.slice(midpoint)];

    return (
      <section id="faq" className="scroll-mt-20 bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
                Common Questions
              </p>
              <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">What people usually ask before they reach out</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {columns.map((column, columnIndex) => (
                <div key={columnIndex} className="space-y-5">
                  {column.map((item) => (
                    <div key={item.id} className="border-b border-gray-200 pb-5">
                      <h3 className="text-lg font-semibold text-gray-900">{item.question}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.answer}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="faq" className="scroll-mt-20 bg-white py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: primary }}
          >
            Got Questions?
          </p>
          <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            FAQ
          </h2>
        </div>

        <div className="divide-y divide-gray-100 border border-gray-100">
          {faq.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => setOpen(open === item.id ? null : item.id)}
                aria-expanded={open === item.id}
                aria-controls={`faq-answer-${item.id}`}
                id={`faq-question-${item.id}`}
                className="flex w-full items-center justify-between px-6 py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span className="pr-4 font-semibold text-gray-900">
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className="flex-shrink-0 text-2xl font-light transition-transform duration-300"
                  style={{
                    color: primary,
                    transform: open === item.id ? "rotate(45deg)" : "none",
                  }}
                >
                  +
                </span>
              </button>

              {open === item.id && (
                <div
                  id={`faq-answer-${item.id}`}
                  role="region"
                  aria-labelledby={`faq-question-${item.id}`}
                  className="border-t border-gray-100 bg-[#FDF8F3] px-6 py-5"
                >
                  <p className="leading-relaxed text-gray-600">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
