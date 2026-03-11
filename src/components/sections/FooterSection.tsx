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
  const navLinks = settings?.footer_nav_links ?? [];
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
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {/* Brand */}
          <div className="md:col-span-1">
            <h3
              className="mb-4 text-2xl font-bold"
              style={{ color: primary }}
            >
              {siteName}
            </h3>
            {tagline && (
              <p className="mb-6 text-sm leading-relaxed italic text-gray-400">
                {tagline}
              </p>
            )}
            <div className="space-y-2 text-sm">
              {settings?.contact_email && (
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="block transition-colors hover:text-white"
                >
                  {settings.contact_email}
                </a>
              )}
              {settings?.contact_phone && (
                <a
                  href={`tel:${settings.contact_phone}`}
                  className="block transition-colors hover:text-white"
                >
                  {settings.contact_phone}
                </a>
              )}
              {settings?.address && (
                <p className="text-sm">{settings.address}</p>
              )}
            </div>
          </div>

          {/* Nav links */}
          {navLinks.length > 0 && (
            <nav aria-label="Footer navigation">
              <h4 className="mb-5 text-xs font-semibold uppercase tracking-widest text-white">
                Quick Links
              </h4>
              <ul className="space-y-3">
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
            <div>
              <h4 className="mb-5 text-xs font-semibold uppercase tracking-widest text-white">
                Follow Us
              </h4>
              <div className="flex flex-wrap gap-3">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${s.label} (opens in new tab)`}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ backgroundColor: primary }}
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
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
