import Link from "next/link";
import EditableImage from "@/components/ui/EditableImage";
import type { BuiltInThemePack, SiteSettings, Website } from "@/lib/cms-types";
import { getHomeThemePackStyles } from "@/components/built-in/home/themePack";

interface Props {
  variant: string;
  themePack: BuiltInThemePack;
  website: Website | null;
  settings: SiteSettings | null;
  hasServicesPreview?: boolean;
}

export default function HomeHeroVariants({
  variant,
  themePack,
  website,
  settings,
  hasServicesPreview = true,
}: Props) {
  const headline = settings?.hero_headline ?? website?.name ?? "Welcome";
  const subheadline = settings?.hero_subheadline ?? website?.tagline ?? "";
  const ctaText = settings?.hero_cta_text ?? "Get Started";
  const ctaUrl = settings?.hero_cta_url ?? "/contact";
  const secondaryUrl =
    variant === "appointment_split"
      ? "/contact"
      : hasServicesPreview
        ? "#services"
        : "/services";
  const secondaryLabel =
    variant === "appointment_split"
      ? "View Booking"
      : hasServicesPreview
        ? "Explore Services"
        : "View Services";
  const primary = settings?.primary_color ?? "#CD7F32";
  const accent = settings?.accent_color ?? "#111827";
  const bgImage = settings?.hero_bg_image_url;
  const theme = getHomeThemePackStyles(themePack);
  const topLabel =
    variant === "service_area_call"
      ? (settings?.address ?? website?.name ?? null)
      : variant === "offer_stack"
        ? "Limited-Time Offer"
        : website?.name ?? null;

  return (
    <section
      id="hero"
      className="relative overflow-hidden py-24 sm:py-28 lg:py-32"
      style={{ backgroundColor: theme.heroBackground }}
    >
      <div
        className="absolute inset-x-0 top-0 h-56 opacity-70"
        aria-hidden="true"
        style={{
          background:
            variant === "offer_stack"
              ? `linear-gradient(135deg, ${primary}22 0%, ${accent}18 100%)`
              : `linear-gradient(180deg, ${primary}18 0%, transparent 100%)`,
        }}
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div>
          {topLabel ? (
            <p
              className="mb-4 text-xs font-semibold uppercase tracking-[0.28em]"
              style={{ color: primary }}
            >
              {topLabel}
            </p>
          ) : null}

          <h1 className="max-w-2xl text-4xl font-bold leading-tight text-gray-900 sm:text-5xl lg:text-6xl">
            {headline}
          </h1>

          {subheadline ? (
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
              {subheadline}
            </p>
          ) : null}

          {variant === "credential_split" && (settings?.contact_phone || settings?.address) ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {settings.contact_phone ? (
                <span className={`${theme.buttonRadiusClass} border border-gray-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700`}>
                  {settings.contact_phone}
                </span>
              ) : null}
              {settings.address ? (
                <span className={`${theme.buttonRadiusClass} border border-gray-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700`}>
                  {settings.address}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href={ctaUrl}
              className={`${theme.buttonRadiusClass} px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white`}
              style={{ backgroundColor: primary }}
            >
              {ctaText}
            </Link>
            <Link
              href={secondaryUrl}
              className={`${theme.buttonRadiusClass} border border-gray-300 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-gray-800`}
              style={{ backgroundColor: theme.badgeSurface }}
            >
              {secondaryLabel}
            </Link>
          </div>
        </div>

        <div>
          {bgImage ? (
            <div className={`relative overflow-hidden ${theme.panelRadiusClass} shadow-[0_30px_80px_rgba(17,24,39,0.14)]`} style={{ backgroundColor: theme.cardBackground }}>
              <div className="relative aspect-[4/3]">
                <EditableImage src={bgImage} alt={headline} fill priority className="object-cover" />
              </div>
              {variant !== "credential_split" && (settings?.contact_phone || settings?.address) ? (
                <div className="grid grid-cols-1 gap-4 border-t border-gray-100 bg-white p-5 sm:grid-cols-2">
                  {settings?.contact_phone ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Call</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{settings.contact_phone}</p>
                    </div>
                  ) : null}
                  {settings?.address ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Location</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{settings.address}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : variant === "credential_split" ? (
            // credential_split: badges already show phone+address in the left column;
            // show brand identity here instead to avoid repeating contact info.
            <div
              className={`${theme.panelRadiusClass} border border-white/60 p-8 shadow-[0_25px_60px_rgba(17,24,39,0.08)]`}
              style={{ background: `linear-gradient(135deg, ${primary}14 0%, ${theme.cardBackground} 48%, ${accent}10 100%)` }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/80 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Company</p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {website?.name ?? "Local Experts"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Serving</p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {settings?.address ?? "Your Area"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`${theme.panelRadiusClass} border border-white/60 p-8 shadow-[0_25px_60px_rgba(17,24,39,0.08)]`}
              style={{ background: `linear-gradient(135deg, ${primary}14 0%, ${theme.cardBackground} 48%, ${accent}10 100%)` }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/80 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {settings?.contact_phone ? "Call Us" : "Get Started"}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {settings?.contact_phone ?? ctaText}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {settings?.address ? "Location" : "We Serve"}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {settings?.address ?? website?.name ?? "Local Experts"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}