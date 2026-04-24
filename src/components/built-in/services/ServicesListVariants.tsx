import Link from "next/link";
import type { BuiltInThemePack, Service, SiteSettings } from "@/lib/cms-types";
import { getHomeThemePackStyles } from "@/components/built-in/home/themePack";

interface Props {
  variant: string;
  themePack: BuiltInThemePack;
  services: Service[];
  settings: SiteSettings | null;
  emptyStateTitle: string | null;
  emptyStateBody: string | null;
}

const stripHtml = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
};

const toExcerpt = (value: string | null | undefined) => stripHtml(value).slice(0, 170);

const getServiceMonogram = (title: string) => {
  const words = title
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/gi, ""))
    .filter(Boolean);

  if (words.length === 0) {
    return "SV";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const isEmergencyService = (title: string, content: string | null | undefined) => {
  const haystack = `${title} ${stripHtml(content)}`.toLowerCase();
  return ["emergency", "24/7", "urgent", "same day"].some((token) =>
    haystack.includes(token),
  );
};

export default function ServicesListVariants({
  variant,
  themePack,
  services,
  settings,
  emptyStateTitle,
  emptyStateBody,
}: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const accent = settings?.accent_color ?? "#111827";
  const theme = getHomeThemePackStyles(themePack);
  const resolvedEmptyStateTitle = emptyStateTitle ?? "Services coming soon.";

  if (services.length === 0) {
    return (
      <section className="py-20" style={{ backgroundColor: theme.cardBackground }}>
        <div className="mx-auto max-w-3xl px-4 text-center text-gray-400 sm:px-6 lg:px-8">
          <p className="text-lg">{resolvedEmptyStateTitle}</p>
          {emptyStateBody ? <p className="mt-3 text-sm text-gray-500">{emptyStateBody}</p> : null}
        </div>
      </section>
    );
  }

  if (variant === "category_sections") {
    return (
      <section
        id="services"
        className="scroll-mt-20 py-20"
        style={{ backgroundColor: theme.cardBackground }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p
              className="text-xs font-semibold uppercase tracking-[0.28em]"
              style={{ color: primary }}
            >
              Service Collection
            </p>
            <h2 className="mt-4 text-4xl font-bold text-gray-900 sm:text-5xl">
              Browse the offers that fit the project best
            </h2>
          </div>
          <div className="space-y-10">
            {services.map((service, index) => (
              <div
                key={service.id}
                className="grid items-stretch gap-6 lg:grid-cols-2"
              >
                <div
                  className={`${index % 2 === 1 ? "lg:order-2" : ""} overflow-hidden rounded-[2rem]`}
                  style={{ backgroundColor: theme.softBackground }}
                >
                  {service.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={service.image_url}
                      alt={service.title}
                      className="h-full min-h-[260px] w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex min-h-[260px] items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${primary}14 0%, ${accent}12 100%)`,
                      }}
                    >
                      <div
                        className="flex h-24 w-24 items-center justify-center rounded-[1.5rem] text-3xl font-bold"
                        style={{ backgroundColor: theme.cardBackground, color: primary }}
                      >
                        {getServiceMonogram(service.title)}
                      </div>
                    </div>
                  )}
                </div>
                <div
                  className={`${theme.panelRadiusClass} flex flex-col justify-center border p-8 sm:p-10`}
                  style={{ backgroundColor: theme.cardBackground, borderColor: `${primary}20` }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.24em]"
                    style={{ color: primary }}
                  >
                    {index % 2 === 0 ? "Featured Service" : "Popular Service"}
                  </p>
                  <h2 className="mt-4 text-3xl font-semibold text-gray-900 sm:text-4xl">
                    {service.title}
                  </h2>
                  {service.content ? (
                    <p className="mt-5 text-base leading-relaxed text-gray-600">
                      {toExcerpt(service.content)}
                    </p>
                  ) : null}
                  <div className="mt-8">
                    <Link
                      href="/contact"
                      className="inline-flex rounded-full border px-6 py-3 text-sm font-semibold uppercase tracking-wide"
                      style={{ borderColor: `${primary}55`, color: primary }}
                    >
                      Request Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "problem_solution_rows") {
    const highlightedIndex = services.findIndex((service) =>
      isEmergencyService(service.title, service.content),
    );
    const featureIndex = highlightedIndex >= 0 ? highlightedIndex : services.length - 1;

    return (
      <section
        id="services"
        className="scroll-mt-20 py-20"
        style={{ backgroundColor: theme.cardBackground }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-4xl text-center">
            <p
              className="inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]"
              style={{ backgroundColor: `${primary}12`, color: primary }}
            >
              Comprehensive Service Menu
            </p>
            <h2 className="mt-5 text-4xl font-bold text-gray-900 sm:text-5xl">
              Pick the right electrical path without slowing the job down
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-3">
            {services.map((service, index) => {
              const isFeatured = index === featureIndex;

              return (
                <div
                  key={service.id}
                  className={`flex items-center justify-between gap-4 border-b pb-6 ${
                    isFeatured
                      ? `${theme.panelRadiusClass} border-0 px-6 py-7 text-white`
                      : ""
                  }`}
                  style={
                    isFeatured
                      ? {
                          background: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`,
                        }
                      : { borderColor: `${primary}50` }
                  }
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-bold"
                      style={{
                        backgroundColor: isFeatured ? "rgba(255,255,255,0.14)" : `${primary}12`,
                        color: isFeatured ? "#ffffff" : primary,
                      }}
                    >
                      {getServiceMonogram(service.title)}
                    </div>
                    <div className="min-w-0">
                      <h2 className={`text-2xl font-semibold ${isFeatured ? "text-white" : "text-gray-900"}`}>
                        {service.title}
                      </h2>
                      {!isFeatured && service.content ? (
                        <p className="mt-2 text-sm leading-relaxed text-gray-500">
                          {toExcerpt(service.content).slice(0, 76)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    href="/contact"
                    className="shrink-0 rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-wide"
                    style={{
                      borderColor: isFeatured ? "rgba(255,255,255,0.6)" : `${accent}55`,
                      color: isFeatured ? "#ffffff" : accent,
                    }}
                  >
                    Learn More
                  </Link>
                </div>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <p className="text-lg text-gray-600">
              Need a service not listed? We tailor scope and recommendations to the job at hand.
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex rounded-full px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white"
              style={{ background: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)` }}
            >
              Get Your Estimate
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="services"
      className="scroll-mt-20 py-20"
      style={{ backgroundColor: accent }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
            Core Service Grid
          </p>
          <h2 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
            Built to showcase high-trust service categories at a glance
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.id}
              className={`border p-6 shadow-sm ${theme.panelRadiusClass}`}
              style={{ backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-bold"
                style={{ backgroundColor: `${primary}22`, color: "#f8fafc" }}
              >
                {getServiceMonogram(service.title)}
              </div>
              <h2 className="mt-8 text-2xl font-semibold text-white">{service.title}</h2>
              {service.content ? (
                <p className="mt-4 text-base leading-relaxed text-slate-300">
                  {toExcerpt(service.content)}
                </p>
              ) : null}
              <Link
                href="/contact"
                className="mt-6 inline-flex text-sm font-semibold uppercase tracking-wide"
                style={{ color: primary }}
              >
                Learn More
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}