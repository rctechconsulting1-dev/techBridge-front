import FAQSection from "@/components/sections/FAQSection";
import type { BuiltInThemePack, FAQItem, SiteSettings } from "@/lib/cms-types";
import { getHomeThemePackStyles } from "@/components/built-in/home/themePack";

interface Props {
  variant: string;
  themePack: BuiltInThemePack;
  faq: FAQItem[];
  settings: SiteSettings | null;
}

export default function ServicesFaqVariants({ variant, themePack, faq, settings }: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const theme = getHomeThemePackStyles(themePack);

  if (variant !== "compact_list") {
    return <FAQSection faq={faq} settings={settings} />;
  }

  if (faq.length === 0) {
    return null;
  }

  return (
    <section id="faq" className="scroll-mt-20 py-20" style={{ backgroundColor: theme.softBackground }}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
            Service Questions
          </p>
          <h2 className="mt-3 text-4xl font-bold text-gray-900">Common answers before you contact us</h2>
        </div>
        <div className="space-y-4">
          {faq.map((item) => (
            <div key={item.id} className={`border p-5 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground, borderColor: `${primary}18` }}>
              <h3 className="text-lg font-semibold text-gray-900">{item.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}