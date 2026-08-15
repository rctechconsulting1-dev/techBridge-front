export type PlanDef = {
  name: string;
  plan_key: string;
  price: number | null; // null = custom
  setupFee: string;
  commitment: string;
  tagline: string;
  features: string[];
  popular: boolean;
  buttonText: string;
};

export const plans: PlanDef[] = [
  {
    name: "Starter",
    plan_key: "starter",
    price: 149,
    setupFee: "$299",
    commitment: "4-mo minimum",
    tagline: "Core web presence",
    features: [
      "Website core + hosting",
      "SEO content basics",
      "Lead capture forms",
      "Basic Metrics Report",
      "Custom domain",
    ],
    popular: false,
    buttonText: "Get Started",
  },
  {
    name: "Professional",
    plan_key: "professional",
    price: 349,
    setupFee: "$499",
    commitment: "4-mo minimum",
    tagline: "Growth + local visibility",
    features: [
      "All Starter modules",
      "Calendar / appointments",
      "Google My Business creation/update",
      "Lead Gen Emails",
      "Advanced metrics",
      "LLM + Google ranking tools",
      "5 Custom Pages",
    ],
    popular: true,
    buttonText: "Most Popular",
  },
  {
    name: "Business",
    plan_key: "business",
    price: 799,
    setupFee: "$999",
    commitment: "4-mo minimum",
    tagline: "Full stack + ads + AI",
    features: [
      "All Professional modules",
      "Ecommerce + Stripe checkout",
      "Google Ads initial set-up",
      "Marketing budget billed as additional",
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
