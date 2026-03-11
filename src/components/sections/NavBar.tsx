"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SiteSettings, Website } from "@/lib/cms-types";

interface Props {
  websiteId: string | number;
  website: Website | null;
  settings: SiteSettings | null;
}

export default function NavBar({ websiteId, website, settings }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  const primary = settings?.primary_color ?? "#CD7F32";
  const logoUrl = settings?.logo_url;
  const siteName = website?.name ?? "RC Tech";
  const base = `/sites/${websiteId}`;

  const NAV_LINKS = [
    { label: "Home", href: base },
    { label: "Services", href: `${base}/services` },
    { label: "About", href: `${base}/about` },
    { label: "Contact", href: `${base}#contact` },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => {
    const hrefPath = href.split("#")[0];
    return pathname === hrefPath;
  };

  return (
    <nav
      aria-label="Main navigation"
      className={`sticky top-0 z-50 w-full bg-white transition-shadow duration-200 ${
        scrolled ? "shadow-sm" : "border-b border-gray-100"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-0 sm:px-6 lg:px-8" style={{ minHeight: "5rem" }}>
        {/* Logo / Brand */}
        <Link
          href={base}
          className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ outlineColor: primary } as React.CSSProperties}
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={siteName}
              width={140}
              height={44}
              className="h-11 w-auto object-contain"
            />
          ) : (
            <span
              className="text-2xl font-bold tracking-tight"
              style={{ color: primary }}
            >
              {siteName}
            </span>
          )}
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-10 md:flex">
          {NAV_LINKS.map(({ label, href }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="text-xs font-semibold uppercase tracking-widest text-gray-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: active ? primary : undefined }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = active ? primary : "";
                  }}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* CTA button (desktop) */}
        <Link
          href={`${base}#contact`}
          className="hidden px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-80 md:inline-block"
          style={{ backgroundColor: primary }}
        >
          Get in Touch
        </Link>

        {/* Mobile hamburger */}
        <button
          className="flex flex-col items-center justify-center gap-1.5 rounded-md p-2 text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 md:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          <span
            className={`block h-0.5 w-6 rounded bg-current transition-transform duration-200 ${
              menuOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 rounded bg-current transition-opacity duration-200 ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 rounded bg-current transition-transform duration-200 ${
              menuOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="border-t border-gray-100 bg-white md:hidden"
        >
          <ul className="flex flex-col px-4 py-3">
            {NAV_LINKS.map(({ label, href }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="block w-full border-b border-gray-100 py-3 text-left text-xs font-semibold uppercase tracking-widest focus:outline-none"
                    style={{ color: active ? primary : "#374151" }}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
            <li className="pt-3">
              <Link
                href={`${base}#contact`}
                onClick={() => setMenuOpen(false)}
                className="block w-full py-3 text-center text-xs font-semibold uppercase tracking-widest text-white"
                style={{ backgroundColor: primary }}
              >
                Get in Touch
              </Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
