import RichText from "@/components/ui/RichText";
import type { Service, SiteSettings } from "@/lib/cms-types";

interface Props {
  services: Service[];
  settings: SiteSettings | null;
}

export default function FeaturesSection({ services, settings }: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";

  if (services.length === 0) {
    return null; // nothing to show yet
  }

  return (
    <section id="services" className="scroll-mt-16 bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            Our Services
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Everything you need to grow your business online.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="group rounded-2xl border border-gray-100 bg-gray-50 p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              {/* Accent bar - decorative */}
              <div
                aria-hidden="true"
                className="mb-6 h-1 w-12 rounded-full transition-all duration-300 group-hover:w-20"
                style={{ backgroundColor: primary }}
              />
              <h3 className="mb-4 text-xl font-bold text-gray-900">
                {service.title}
              </h3>
              {service.content && (
                <RichText
                  html={service.content}
                  className="text-sm text-gray-600 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
