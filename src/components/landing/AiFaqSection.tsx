import React from "react";

const faqs = [
  {
    question: "What does RC Tech Bridge do for small businesses?",
    answer:
      "RC Tech Bridge builds conversion-focused websites, manages Google and Meta ad campaigns, and deploys AI agents that automate customer follow-up and lead handling — giving small businesses a complete digital growth stack without needing an in-house tech team.",
  },
  {
    question: "How do your AI agents help a local business?",
    answer:
      "Our AI agents handle repetitive customer touchpoints 24/7: answering common questions via chat, sending automated follow-up messages after inquiries, qualifying leads before they reach your inbox, and booking appointments — so no opportunity slips through the cracks while you're focused on the job.",
  },
  {
    question: "Do you run Google and Meta ads for local service businesses?",
    answer:
      "Yes. We set up, manage, and continuously optimize Google Search and Meta (Facebook/Instagram) ad campaigns targeted to your service area. Every campaign is paired with a landing page built to convert clicks into calls or form submissions, not just traffic.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

const AiFaqSection = () => {
  return (
    <section id="faq" className="bg-gray-50 py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema)
            .replace(/</g, "\\u003c")
            .replace(/>/g, "\\u003e")
            .replace(/&/g, "\\u0026"),
        }}
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-center text-3xl font-bold text-gray-900">
          Common Questions
        </h2>
        <p className="mb-12 text-center text-gray-500">
          Straight answers about what we do and how we can help your business
          grow.
        </p>
        <div className="space-y-8">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {faq.question}
              </h3>
              <p className="leading-relaxed text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AiFaqSection;
