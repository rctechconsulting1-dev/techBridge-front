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
    <footer className="bg-gray-900 text-gray-400">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {/* Brand */}
          <div>
            <h3 className="mb-3 text-xl font-bold text-white">{siteName}</h3>
            {tagline && <p className="mb-4 leading-relaxed">{tagline}</p>}
            {settings?.contact_email && (
              <a
                href={`mailto:${settings.contact_email}`}
                className="block text-sm hover:text-white"
              >
                {settings.contact_email}
              </a>
            )}
            {settings?.contact_phone && (
              <a
                href={`tel:${settings.contact_phone}`}
                className="block text-sm hover:text-white"
              >
                {settings.contact_phone}
              </a>
            )}
            {settings?.address && (
              <p className="mt-2 text-sm">{settings.address}</p>
            )}
          </div>

          {/* Nav links */}
          {navLinks.length > 0 && (
            <nav aria-label="Footer navigation">
              <h4 className="mb-4 font-semibold text-white">Quick Links</h4>
              <ul className="space-y-2">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="rounded-sm text-sm transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
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
              <h4 className="mb-4 font-semibold text-white">Follow Us</h4>
              <div className="flex flex-wrap gap-3">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${s.label} (opens in new tab)`}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ backgroundColor: primary }}
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 border-t border-gray-800 pt-8 text-center text-sm">
          {copyright}
        </div>
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
