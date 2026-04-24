import Link from "next/link";
import type { Page, SiteSettings, Website } from "@/lib/cms-types";
import type { FooterSectionVariant } from "@/components/sections/sectionVariants";
import { buildNavigationItems } from "@/lib/navigation";

interface Props {
  websiteId?: string | number;
  website: Website | null;
  settings: SiteSettings | null;
  pages?: Page[] | null;
  variant?: FooterSectionVariant;
}

export default function FooterSection({ websiteId, website, settings, pages = [], variant = "classic_dark" }: Props) {
  const siteName = website?.name ?? "Your Business";
  const tagline = settings?.footer_tagline ?? website?.tagline ?? "";
  const copyright =
    settings?.footer_copyright ??
    `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`;
  const primary = settings?.primary_color ?? "#CD7F32";
  const footerNavItems = buildNavigationItems({
    websiteId: websiteId ?? website?.id ?? "",
    settings,
    pages,
    placement: "footer",
  }).filter((item) => item.type === "link");

  const socials = [
    { href: settings?.footer_social_facebook, label: "Facebook" },
    { href: settings?.footer_social_instagram, label: "Instagram" },
    { href: settings?.footer_social_x, label: "X" },
    { href: settings?.footer_social_linkedin, label: "LinkedIn" },
  ].filter((s) => !!s.href);

  if (variant === "grid_contact") {
    return (
      <footer className="bg-[#111827] text-gray-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <h3 className="text-3xl font-bold" style={{ color: primary }}>{siteName}</h3>
            {tagline ? <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-400">{tagline}</p> : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Navigation</p>
            {footerNavItems.length > 0 ? (
              <ul className="mt-4 space-y-3 text-sm">
                {footerNavItems.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-white">{link.label}</Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Contact</p>
            <div className="mt-4 space-y-3 text-sm">
              {settings?.contact_email ? <a href={`mailto:${settings.contact_email}`} className="block transition-colors hover:text-white">{settings.contact_email}</a> : null}
              {settings?.contact_phone ? <a href={`tel:${settings.contact_phone}`} className="block transition-colors hover:text-white">{settings.contact_phone}</a> : null}
              {settings?.address ? <p>{settings.address}</p> : null}
            </div>
            {socials.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {socials.map((s) => (
                  <a key={s.label} href={s.href!} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:border-white/40">
                    {s.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="border-t border-white/10 py-6 text-center text-xs text-gray-500">{copyright}</div>
        {settings?.google_maps_url && (
          <div className="h-64 w-full border-t border-white/10">
            <iframe src={settings.google_maps_url} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Location map" />
          </div>
        )}
      </footer>
    );
  }

  if (variant === "brand_strip") {
    return (
      <footer className="bg-[#F8F2EA] text-gray-700">
        <div className="border-b border-gray-200">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{siteName}</h3>
              {tagline ? <p className="mt-2 text-sm text-gray-600">{tagline}</p> : null}
            </div>
            {footerNavItems.length > 0 ? (
              <nav aria-label="Footer navigation">
                <ul className="flex flex-wrap gap-4 text-sm font-medium text-gray-600">
                  {footerNavItems.map((link) => (
                    <li key={link.href}><Link href={link.href} className="transition-colors hover:text-gray-900">{link.label}</Link></li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex flex-wrap gap-4">
            {settings?.contact_email ? <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a> : null}
            {settings?.contact_phone ? <a href={`tel:${settings.contact_phone}`}>{settings.contact_phone}</a> : null}
            {settings?.address ? <span>{settings.address}</span> : null}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {socials.map((s) => (
              <a key={s.label} href={s.href!} target="_blank" rel="noopener noreferrer" className="font-semibold uppercase tracking-wide" style={{ color: primary }}>
                {s.label}
              </a>
            ))}
            <span className="text-xs text-gray-500">{copyright}</span>
          </div>
        </div>
        {settings?.google_maps_url && (
          <div className="h-64 w-full border-t border-gray-200">
            <iframe src={settings.google_maps_url} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Location map" />
          </div>
        )}
      </footer>
    );
  }

  return (
    <footer style={{ backgroundColor: "#111" }} className="text-gray-400">
      {/* Main footer columns */}
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
        {/* Brand */}
        <h3 className="mb-4 text-2xl font-bold" style={{ color: primary }}>
          {siteName}
        </h3>
        {tagline && (
          <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-gray-400 italic">
            {tagline}
          </p>
        )}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          {settings?.contact_email && (
            <a
              href={`mailto:${settings.contact_email}`}
              className="transition-colors hover:text-white"
            >
              {settings.contact_email}
            </a>
          )}
          {settings?.contact_phone && (
            <a
              href={`tel:${settings.contact_phone}`}
              className="transition-colors hover:text-white"
            >
              {settings.contact_phone}
            </a>
          )}
          {settings?.address && <span>{settings.address}</span>}
        </div>

        {/* Nav links */}
        {footerNavItems.length > 0 && (
          <nav aria-label="Footer navigation" className="mb-8">
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {footerNavItems.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Social */}
        {socials.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href!}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${s.label} (opens in new tab)`}
                className="px-4 py-2 text-xs font-semibold tracking-widest text-white uppercase transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: primary }}
              >
                {s.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800 py-6 text-center text-xs text-gray-600">
        {copyright}
      </div>

      {/* Google Maps embed */}
      {settings?.google_maps_url && (
        <div className="h-64 w-full border-t border-gray-800">
          <iframe
            src={settings.google_maps_url}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Location map"
          />
        </div>
      )}
    </footer>
  );
}
