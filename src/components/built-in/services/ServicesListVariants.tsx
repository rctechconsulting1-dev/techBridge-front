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

const toExcerpt = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 170);
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
    const groups = [
      { label: "Core Services", items: services.slice(0, Math.ceil(services.length / 2)) },
      { label: "Additional Support", items: services.slice(Math.ceil(services.length / 2)) },
    ].filter((group) => group.items.length > 0);

    return (
      <section id="services" className="scroll-mt-20 py-20" style={{ backgroundColor: theme.softBackground }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {groups.map((group) => (
              <div key={group.label} className={`border p-6 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground, borderColor: `${primary}22` }}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
                  {group.label}
                </p>
                <div className="mt-5 space-y-5">
                  {group.items.map((service) => (
                    <div key={service.id} className="border-b border-gray-100 pb-5 last:border-b-0 last:pb-0">
                      <h2 className="text-2xl font-semibold text-gray-900">{service.title}</h2>
                      {service.content ? <p className="mt-3 text-sm leading-relaxed text-gray-600">{toExcerpt(service.content)}</p> : null}
                      <Link href="/contact" className="mt-4 inline-flex text-sm font-semibold uppercase tracking-wide" style={{ color: primary }}>
                        Request Details
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "problem_solution_rows") {
    return (
      <section id="services" className="scroll-mt-20 py-20" style={{ backgroundColor: theme.cardBackground }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-5">
            {services.map((service, index) => (
              <div key={service.id} className={`grid gap-6 border p-6 ${theme.panelRadiusClass} lg:grid-cols-[120px_1fr_auto] lg:items-start`} style={{ borderColor: `${primary}20`, backgroundColor: index % 2 === 0 ? theme.cardBackground : theme.softBackground }}>
                <span className="text-sm font-semibold text-gray-400">0{index + 1}</span>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">{service.title}</h2>
                  {service.content ? <p className="mt-3 text-sm leading-relaxed text-gray-600">{toExcerpt(service.content)}</p> : null}
                </div>
                <Link href="/contact" className="text-sm font-semibold uppercase tracking-wide" style={{ color: primary }}>
                  Solve This
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="services" className="scroll-mt-20 py-20" style={{ backgroundColor: theme.cardBackground }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <div key={service.id} className={`border p-6 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.softBackground, borderColor: `${primary}22` }}>
              <h2 className="text-2xl font-semibold text-gray-900">{service.title}</h2>
              {service.content ? <p className="mt-3 text-sm leading-relaxed text-gray-600">{toExcerpt(service.content)}</p> : null}
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