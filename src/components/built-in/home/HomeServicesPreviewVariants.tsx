import Link from "next/link";
import type { BuiltInThemePack, Service, SiteSettings } from "@/lib/cms-types";
import { getHomeThemePackStyles } from "@/components/built-in/home/themePack";

interface Props {
  variant: string;
  themePack: BuiltInThemePack;
  services: Service[];
  settings: SiteSettings | null;
}

const toExcerpt = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
};

export default function HomeServicesPreviewVariants({
  variant,
  themePack,
  services,
  settings,
}: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const theme = getHomeThemePackStyles(themePack);

  if (services.length === 0) {
    return null;
  }

  if (variant === "three_card_grid") {
    return (
      <section id="services" className="scroll-mt-20 py-24" style={{ backgroundColor: theme.softBackground }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
              Services Preview
            </p>
            <h2 className="mt-3 text-4xl font-bold text-gray-900">Explore the core offers first</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {services.slice(0, 3).map((service) => (
              <div key={service.id} className="rounded-3xl p-6 shadow-sm" style={{ backgroundColor: theme.cardBackground }}>
                <h3 className="text-xl font-semibold text-gray-900">{service.title}</h3>
                {service.content ? (
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    {toExcerpt(service.content)}
                  </p>
                ) : null}
                <Link href="/contact" className="mt-5 inline-flex text-sm font-semibold uppercase tracking-wide" style={{ color: primary }}>
                  Learn More
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "authority_list") {
    return (
      <section id="services" className="scroll-mt-20 py-24" style={{ backgroundColor: theme.cardBackground }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
              What We Handle
            </p>
            <h2 className="mt-3 text-4xl font-bold text-gray-900">Service coverage built for trust</h2>
          </div>
          <div className="space-y-5">
            {services.slice(0, 5).map((service, index) => (
              <div key={service.id} className="grid gap-4 rounded-3xl border border-gray-200 p-6 lg:grid-cols-[80px_1fr_auto] lg:items-center">
                <span className="text-sm font-semibold text-gray-400">0{index + 1}</span>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{service.title}</h3>
                  {service.content ? (
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                      {toExcerpt(service.content)}
                    </p>
                  ) : null}
                </div>
                <Link href="/contact" className="text-sm font-semibold uppercase tracking-wide" style={{ color: primary }}>
                  Ask About This
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const compact = variant === "compact_cards";

  return (
    <section id="services" className="scroll-mt-20 py-24" style={{ backgroundColor: theme.softBackground }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
            Services Preview
          </p>
          <h2 className="mt-3 text-4xl font-bold text-gray-900">Choose the right path fast</h2>
        </div>
        <div className={`grid grid-cols-1 gap-5 ${compact ? "lg:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-3"}`}>
          {services.slice(0, compact ? 4 : 6).map((service) => (
            <div key={service.id} className="rounded-3xl p-6 shadow-sm" style={{ backgroundColor: theme.cardBackground }}>
              <h3 className="text-xl font-semibold text-gray-900">{service.title}</h3>
              {service.content ? (
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {toExcerpt(service.content)}
                </p>
              ) : null}
              <Link href="/contact" className="mt-5 inline-flex text-sm font-semibold uppercase tracking-wide" style={{ color: primary }}>
                Learn More
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}