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
      className={`sticky top-0 z-50 w-full bg-white transition-shadow duration-200 ${
        scrolled ? "shadow-md" : "border-b border-gray-100"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo / Brand */}
        <Link
          href={base}
          className="flex items-center gap-2 focus:outline-none"
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={siteName}
              width={120}
              height={40}
              className="h-10 w-auto object-contain"
            />
          ) : (
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: primary }}
            >
              {siteName}
            </span>
          )}
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map(({ label, href }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="group flex flex-col items-center gap-0.5 text-sm font-medium text-gray-600 transition-colors focus:outline-none"
                  style={{ color: active ? primary : undefined }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = active ? primary : "";
                  }}
                >
                  {label}
                  <span
                    className={`h-[2px] rounded-full transition-all duration-200 ${
                      active ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                    style={{ backgroundColor: primary }}
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        {/* CTA button (desktop) */}
        <Link
          href={`${base}#contact`}
          className="hidden rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 md:inline-block"
          style={{ backgroundColor: primary }}
        >
          Get in Touch
        </Link>

        {/* Mobile hamburger */}
        <button
          className="flex flex-col items-center justify-center gap-1.5 rounded-md p-2 text-gray-600 md:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
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
        <div className="border-t border-gray-100 bg-white md:hidden">
          <ul className="flex flex-col px-4 py-3">
            {NAV_LINKS.map(({ label, href }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="block w-full py-3 text-left text-sm font-medium focus:outline-none"
                    style={{
                      color: active ? primary : undefined,
                      borderBottom: "1px solid #f3f4f6",
                    }}
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
                className="block w-full rounded-full py-2.5 text-center text-sm font-semibold text-white"
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
