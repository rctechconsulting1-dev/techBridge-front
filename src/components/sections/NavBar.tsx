"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Page, SiteSettings, Website } from "@/lib/cms-types";
import type { NavBarVariant } from "@/components/sections/sectionVariants";
import { buildNavigationItems } from "@/lib/navigation";

interface Props {
  websiteId: string | number;
  website: Website | null;
  settings: SiteSettings | null;
  pages?: Page[] | null;
  variant?: NavBarVariant;
}

export default function NavBar({ websiteId, website, settings, pages = [], variant = "inline" }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isCentered = variant === "centered";
  const isPill = variant === "pill";

  const primary = settings?.primary_color ?? "#CD7F32";
  const logoUrl = settings?.logo_url;
  const siteName = website?.name ?? "RC Tech";
  const base = `/sites/${websiteId}`;
  const NAV_LINKS = buildNavigationItems({
    websiteId,
    settings,
    pages,
    placement: "header",
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => {
    const hrefPath = href.split("#")[0];
    return pathname === hrefPath;
  };

  const navShellClassName = isPill
    ? "mx-auto mt-3 flex max-w-7xl items-center justify-between rounded-full border border-gray-200 bg-white/95 px-4 py-0 shadow-lg backdrop-blur sm:px-6 lg:px-8"
    : "mx-auto flex max-w-7xl items-center justify-between px-4 py-0 sm:px-6 lg:px-8";

  const desktopNavClassName = isCentered
    ? "hidden flex-1 items-center justify-center gap-10 md:flex"
    : "hidden items-center gap-10 md:flex";

  const desktopCtaClassName = isPill
    ? "hidden rounded-full px-5 py-2.5 text-xs font-semibold tracking-widest text-white uppercase transition-opacity hover:opacity-85 md:inline-block"
    : isCentered
      ? "hidden rounded-full border px-5 py-2.5 text-xs font-semibold tracking-widest uppercase transition-colors hover:text-white md:inline-block"
      : "hidden px-6 py-2.5 text-xs font-semibold tracking-widest text-white uppercase transition-opacity hover:opacity-80 md:inline-block";

  return (
    <nav
      aria-label="Main navigation"
      className={`sticky top-0 z-50 w-full transition-shadow duration-200 ${
        isPill ? "bg-transparent" : "bg-white"
      } ${
        scrolled ? "shadow-sm" : isPill ? "" : "border-b border-gray-100"
      }`}
    >
      <div
        className={navShellClassName}
        style={{ minHeight: isPill ? "4.5rem" : "5rem" }}
      >
        {/* Logo / Brand */}
        <Link
          href={base}
          className={`flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 ${
            isCentered ? "md:flex-[0_0_220px]" : ""
          }`}
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
        <ul className={desktopNavClassName}>
          {NAV_LINKS.map((item) => {
            const active = isActive(item.href);

            if (item.type === "dropdown") {
              return (
                <li key={item.href} className="group relative">
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      isPill ? "text-gray-700" : "text-gray-600"
                    }`}
                    style={{ color: active ? primary : undefined }}
                  >
                    {item.label}
                    <span aria-hidden="true">▾</span>
                  </Link>
                  <div className="invisible absolute left-0 top-full z-20 min-w-56 rounded-2xl border border-gray-200 bg-white p-2 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMenuOpen(false)}
                        className="block rounded-xl px-3 py-2 text-xs font-semibold tracking-wider text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </li>
              );
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`text-xs font-semibold tracking-widest uppercase underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    isPill ? "text-gray-700" : "text-gray-600"
                  }`}
                  style={{ color: active ? primary : undefined }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = active ? primary : "";
                  }}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* CTA button (desktop) */}
        <Link
          href={`${base}/contact`}
          className={desktopCtaClassName}
          style={
            isCentered
              ? { borderColor: primary, color: primary }
              : { backgroundColor: primary }
          }
          onMouseEnter={
            isCentered
              ? (e) => {
                  e.currentTarget.style.backgroundColor = primary;
                  e.currentTarget.style.color = "#ffffff";
                }
              : undefined
          }
          onMouseLeave={
            isCentered
              ? (e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = primary;
                }
              : undefined
          }
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
          className={`md:hidden ${isPill ? "mx-3 mt-3 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg" : "border-t border-gray-100 bg-white"}`}
        >
          <ul className="flex flex-col px-4 py-3">
            {NAV_LINKS.map((item) => {
              const active = isActive(item.href);

              if (item.type === "dropdown") {
                return (
                  <li key={item.href} className="border-b border-gray-100 py-3">
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="block w-full text-left text-xs font-semibold tracking-widest uppercase underline-offset-4 hover:underline focus:outline-none"
                      style={{ color: active ? primary : "#374151" }}
                    >
                      {item.label}
                    </Link>
                    <div className="mt-2 pl-4">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setMenuOpen(false)}
                          className="block py-2 text-[11px] font-semibold tracking-widest uppercase text-gray-500"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block w-full border-b border-gray-100 py-3 text-left text-xs font-semibold tracking-widest uppercase underline-offset-4 hover:underline focus:outline-none"
                    style={{ color: active ? primary : "#374151" }}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li className="pt-3">
              <Link
                href={`${base}/contact`}
                onClick={() => setMenuOpen(false)}
                className={`block w-full py-3 text-center text-xs font-semibold tracking-widest uppercase ${
                  isCentered ? "rounded-full border" : "text-white"
                }`}
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
