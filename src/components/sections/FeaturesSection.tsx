import Link from "next/link";
import EditableImage from "@/components/ui/EditableImage";
import RichText from "@/components/ui/RichText";
import type { Service, SiteSettings } from "@/lib/cms-types";

interface Props {
  services: Service[];
  settings: SiteSettings | null;
}

// Warm tinted backgrounds that alternate per panel
const PANEL_BG = ["#FAF0E6", "#FDF8F3", "#FFF8F0", "#FAF5F0"];

export default function FeaturesSection({ services, settings }: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";

  if (services.length === 0) {
    return null;
  }

  return (
    <section id="services" className="scroll-mt-20 bg-white">
      {/* Section header */}
      <div className="border-b border-gray-100 py-20 text-center">
        <p
          className="mb-3 text-xs font-semibold tracking-widest uppercase"
          style={{ color: primary }}
        >
          What We Offer
        </p>
        <h2 className="mb-4 text-4xl font-bold text-gray-900 sm:text-5xl">
          Our Services
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-gray-500">
          Everything you need to grow your business online.
        </p>
      </div>

      {/* Alternating panels */}
      {services.map((service, index) => {
        const flip = index % 2 === 1;
        const panelBg = PANEL_BG[index % PANEL_BG.length];

        return (
          <div
            key={service.id}
            className={`grid min-h-[420px] grid-cols-1 lg:grid-cols-2 ${
              index < services.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            {/* Visual panel */}
            <div
              className={`flex min-h-[260px] items-center justify-center overflow-hidden p-12 lg:p-16 ${
                flip ? "lg:order-last" : ""
              }`}
              style={{
                backgroundColor: service.image_url ? undefined : panelBg,
              }}
            >
              {service.image_url ? (
                <div className="relative h-full min-h-[260px] w-full">
                  <EditableImage
                    src={service.image_url}
                    alt={service.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                /* Decorative icon block */
                <div className="text-center">
                  <div
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center"
                    style={{ backgroundColor: primary }}
                    aria-hidden="true"
                  >
                    <svg
                      className="h-10 w-10 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <p
                    className="text-xs font-semibold tracking-widest uppercase"
                    style={{ color: primary }}
                  >
                    {service.title}
                  </p>
                </div>
              )}
            </div>

            {/* Text panel */}
            <div
              className={`flex items-center p-10 lg:p-16 ${
                flip ? "lg:order-first" : ""
              }`}
            >
              <div>
                {/* Accent bar */}
                <div
                  className="mb-6 h-1 w-10"
                  style={{ backgroundColor: primary }}
                />
                <h3 className="mb-5 text-3xl font-bold text-gray-900 lg:text-4xl">
                  {service.title}
                </h3>
                {service.content && (
                  <RichText
                    html={service.content}
                    className="mb-8 text-lg leading-relaxed text-gray-600 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
                  />
                )}
                <Link
                  href="#contact"
                  className="group inline-flex items-center gap-2 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-70"
                  style={{ color: primary }}
                >
                  Learn More
                  <svg
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
