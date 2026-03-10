"use client";
import { useState } from "react";
import type { FAQItem, SiteSettings } from "@/lib/cms-types";

interface Props {
  faq: FAQItem[];
  settings: SiteSettings | null;
}

export default function FAQSection({ faq, settings }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const primary = settings?.primary_color ?? "#CD7F32";

  if (faq.length === 0) return null;

  return (
    <section id="faq" className="scroll-mt-16 bg-gray-50 py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faq.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <button
                onClick={() => setOpen(open === item.id ? null : item.id)}
                aria-expanded={open === item.id}
                aria-controls={`faq-answer-${item.id}`}
                id={`faq-question-${item.id}`}
                className="flex w-full items-center justify-between rounded-xl px-6 py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
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
                  className="border-t border-gray-100 px-6 py-5"
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
