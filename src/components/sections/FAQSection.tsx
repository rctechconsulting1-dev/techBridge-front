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
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >
                <span className="pr-4 font-semibold text-gray-900">
                  {item.question}
                </span>
                <span
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
                <div className="border-t border-gray-100 px-6 py-5">
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
