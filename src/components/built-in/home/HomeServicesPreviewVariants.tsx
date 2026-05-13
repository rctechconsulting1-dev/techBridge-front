import Link from "next/link";
import type { BuiltInThemePack, Service, SiteSettings } from "@/lib/cms-types";
import { getHomeThemePackStyles } from "@/components/built-in/home/themePack";

interface Props {
  variant: string;
  themePack: BuiltInThemePack;
  services: Service[];
  settings: SiteSettings | null;
  /** href for the full services listing page; defaults to "/services" */
  servicesHref?: string;
}

const stripHtml = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
};

const toExcerpt = (value: string | null | undefined) => {
  return stripHtml(value).slice(0, 140);
};

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

const isPriorityService = (title: string, content: string | null | undefined) => {
  const haystack = `${title} ${stripHtml(content)}`.toLowerCase();
  return ["emergency", "24/7", "panel", "ev", "commercial"].some((token) =>
    haystack.includes(token),
  );
};

const prioritizeFeaturedServices = (services: Service[]) => {
  const featured = services.filter((service) => service.featured_on_home);
  const remaining = services.filter((service) => !service.featured_on_home);
  return featured.length > 0 ? [...featured, ...remaining] : services;
};

export default function HomeServicesPreviewVariants({
  variant,
  themePack,
  services,
  settings,
  servicesHref = "/services",
}: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const accent = settings?.accent_color ?? "#111827";
  const theme = getHomeThemePackStyles(themePack);
  const orderedServices = prioritizeFeaturedServices(services);

  if (services.length === 0) {
    return null;
  }

  if (variant === "three_card_grid") {
    return (
      <section id="services" className="scroll-mt-20 py-24" style={{ backgroundColor: accent }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
              Services Preview
            </p>
            <h2 className="mt-3 text-4xl font-bold text-white">Explore the core offers first</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {orderedServices.slice(0, 3).map((service) => (
              <div
                key={service.id}
                className="rounded-[2rem] border p-6 shadow-sm"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-base font-bold"
                  style={{ backgroundColor: `${primary}22`, color: "#f8fafc" }}
                >
                  {getServiceMonogram(service.title)}
                </div>
                <h3 className="mt-6 text-xl font-semibold text-white">
                  <Link href={service.slug ? `${servicesHref}#${service.slug}` : servicesHref} className="hover:underline">
                    {service.title}
                  </Link>
                </h3>
                {service.content ? (
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    {toExcerpt(service.content)}
                  </p>
                ) : null}
                <Link href={service.slug ? `${servicesHref}#${service.slug}` : servicesHref} className="mt-5 inline-flex text-sm font-semibold uppercase tracking-wide" style={{ color: primary }}>
                  Learn More
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href={servicesHref} className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold text-white/80 transition-colors hover:text-white" style={{ borderColor: "rgba(255,255,255,0.2)" }}>
              View All Services →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "authority_list") {
    return (
      <section id="services" className="scroll-mt-20 py-24" style={{ backgroundColor: theme.cardBackground }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
              What We Handle
            </p>
            <h2 className="mt-3 text-4xl font-bold text-gray-900">Service coverage built for trust</h2>
          </div>
          <div className="space-y-5">
            {orderedServices.slice(0, 5).map((service, index) => (
              <div
                key={service.id}
                className="grid gap-4 rounded-[2rem] border p-6 lg:grid-cols-[88px_1fr_auto] lg:items-center"
                style={{ borderColor: `${primary}18`, backgroundColor: index % 2 === 0 ? theme.cardBackground : theme.softBackground }}
              >
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl text-base font-bold"
                  style={{ backgroundColor: `${primary}12`, color: primary }}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    <Link href={service.slug ? `${servicesHref}#${service.slug}` : servicesHref} className="hover:underline">
                      {service.title}
                    </Link>
                  </h3>
                  {service.content ? (
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                      {toExcerpt(service.content)}
                    </p>
                  ) : null}
                </div>
                <Link href={service.slug ? `${servicesHref}#${service.slug}` : servicesHref} className="text-sm font-semibold uppercase tracking-wide" style={{ color: primary }}>
                  Ask About This
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link href={servicesHref} className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: primary }}>
              View All Services →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "service_tiles") {
    const highlightedIndex = orderedServices.findIndex((service) =>
      isPriorityService(service.title, service.content),
    );
    const featureIndex = highlightedIndex >= 0 ? highlightedIndex : Math.min(orderedServices.length - 1, 2);

    return (
      <section id="services" className="scroll-mt-20 py-24" style={{ backgroundColor: theme.softBackground }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
              Service Tiles
            </p>
            <h2 className="mt-3 text-4xl font-bold text-gray-900">Pick the service path that fits the job</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {orderedServices.slice(0, 6).map((service, index) => (
              <div
                key={service.id}
                className={`rounded-[2rem] border p-6 shadow-sm ${index === featureIndex ? "text-white" : ""}`}
                style={
                  index === featureIndex
                    ? { background: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`, borderColor: "transparent" }
                    : { backgroundColor: theme.cardBackground, borderColor: `${primary}22` }
                }
              >
                <span
                  className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]"
                  style={{ backgroundColor: index === featureIndex ? "rgba(255,255,255,0.14)" : `${primary}12`, color: index === featureIndex ? "#ffffff" : primary }}
                >
                  {index === featureIndex ? "Priority" : String(index + 1).padStart(2, "0")}
                </span>
                <h3 className={`mt-5 text-xl font-semibold ${index === featureIndex ? "text-white" : "text-gray-900"}`}>
                  <Link href={service.slug ? `${servicesHref}#${service.slug}` : servicesHref} className="hover:underline">
                    {service.title}
                  </Link>
                </h3>
                {service.content ? (
                  <p className={`mt-3 text-sm leading-relaxed ${index === featureIndex ? "text-white/84" : "text-gray-600"}`}>
                    {toExcerpt(service.content)}
                  </p>
                ) : null}
                <Link
                  href={service.slug ? `${servicesHref}#${service.slug}` : servicesHref}
                  className="mt-5 inline-flex rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-wide"
                  style={{ borderColor: index === featureIndex ? "rgba(255,255,255,0.5)" : `${accent}55`, color: index === featureIndex ? "#ffffff" : accent }}
                >
                  Learn More
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href={servicesHref} className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:text-gray-900" style={{ borderColor: `${primary}44` }}>
              View All Services →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const compact = variant === "compact_cards";

  return (
    <section id="services" className="scroll-mt-20 py-24" style={{ backgroundColor: theme.cardBackground }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
            Services Preview
          </p>
          <h2 className="mt-3 text-4xl font-bold text-gray-900">Choose the right path fast</h2>
        </div>
        <div className={`grid grid-cols-1 gap-5 ${compact ? "lg:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-3"}`}>
          {orderedServices.slice(0, compact ? 4 : 6).map((service) => (
            <div
              key={service.id}
              className="rounded-[2rem] border p-6 shadow-sm"
              style={{ backgroundColor: theme.softBackground, borderColor: `${primary}18` }}
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-base font-bold"
                style={{ backgroundColor: `${primary}12`, color: primary }}
              >
                {getServiceMonogram(service.title)}
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                <Link href={service.slug ? `${servicesHref}#${service.slug}` : servicesHref} className="hover:underline">
                  {service.title}
                </Link>
              </h3>
              {service.content ? (
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {toExcerpt(service.content)}
                </p>
              ) : null}
              <Link href={service.slug ? `${servicesHref}#${service.slug}` : servicesHref} className="mt-5 inline-flex text-sm font-semibold uppercase tracking-wide" style={{ color: primary }}>
                Learn More
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href={servicesHref} className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: primary }}>
            View All Services →
          </Link>
        </div>
      </div>
    </section>
  );
}