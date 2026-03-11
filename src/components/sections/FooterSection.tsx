import Link from "next/link";
import type { SiteSettings, Website } from "@/lib/cms-types";

interface Props {
  website: Website | null;
  settings: SiteSettings | null;
}

export default function FooterSection({ website, settings }: Props) {
  const siteName = website?.name ?? "Your Business";
  const tagline = settings?.footer_tagline ?? website?.tagline ?? "";
  const copyright =
    settings?.footer_copyright ??
    `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`;
  const navLinks = (settings?.footer_nav_links ?? []).filter(
    (link) => settings?.ecommerce_enabled || !link.href.includes("/shop"),
  );
  const primary = settings?.primary_color ?? "#CD7F32";

  const socials = [
    { href: settings?.footer_social_facebook, label: "Facebook" },
    { href: settings?.footer_social_instagram, label: "Instagram" },
    { href: settings?.footer_social_x, label: "X" },
    { href: settings?.footer_social_linkedin, label: "LinkedIn" },
  ].filter((s) => !!s.href);

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
        {navLinks.length > 0 && (
          <nav aria-label="Footer navigation" className="mb-8">
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {navLinks.map((link) => (
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
