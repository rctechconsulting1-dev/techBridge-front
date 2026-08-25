"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "@/icons";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/#services" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
  { label: "Plans", href: "/plans" },
];

const SERVICES_DROPDOWN = [
  { label: "Web Development", href: "/services/web-development" },
  { label: "Workflow Automation", href: "/services/workflow-automation" },
  { label: "AI Agents", href: "/services/ai-agents" },
  { label: "Enterprise AI Integration", href: "/services/enterprise" },
  { label: "eCommerce AI", href: "/services/ecommerce" },
  { label: "Small Business Tech", href: "/services/small-business" },
  { label: "Custom Software Engineering", href: "/services/custom-software-engineering" },
];

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span className="text-2xl font-bold text-[#CD7F32]">R</span>
              <div className="h-0.5 w-6 rounded-full bg-[#C41E3A]"></div>
              <span className="text-2xl font-bold text-[#CD7F32]">D</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-wide text-[#CD7F32]">
                TECH
              </span>
              <span className="-mt-1 text-sm font-bold tracking-wide text-[#C41E3A]">
                BRIDGE
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center space-x-8 md:flex">
            <Link
              href="/"
              className="font-medium text-gray-700 no-underline transition-colors hover:text-[#CD7F32]"
            >
              Home
            </Link>

            <div className="group relative">
              <Link
                href="/#services"
                className="flex items-center gap-1 font-medium text-gray-700 no-underline transition-colors hover:text-[#CD7F32]"
              >
                Services
                <ChevronDownIcon className="h-4 w-4 transition-transform duration-200 group-hover:rotate-180" />
              </Link>
              <div className="invisible absolute top-full left-0 z-50 w-64 rounded-lg border border-gray-100 bg-white py-2 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-focus-within:visible group-hover:opacity-100 group-focus-within:opacity-100">
                {SERVICES_DROPDOWN.map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="block px-4 py-2 text-sm font-medium text-gray-700 no-underline transition-colors hover:bg-[#F5F7FF] hover:text-[#CD7F32]"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {NAV_LINKS.filter(({ label }) => label !== "Home" && label !== "Services").map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="font-medium text-gray-700 no-underline transition-colors hover:text-[#CD7F32]"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden items-center space-x-3 md:flex">
            <Link
              href="/signin?next=/admin"
              className="rounded-lg border border-[#CD7F32] px-4 py-2 font-semibold text-[#CD7F32] transition-all duration-300 hover:bg-[#CD7F32] hover:text-white"
            >
              Admin Login
            </Link>
            <Link
              href="/#contact"
              className="transform rounded-lg bg-[#CD7F32] px-6 py-2 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8B4513] hover:shadow-lg"
            >
              Book a free demo
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-[#CD7F32] focus:text-[#CD7F32] focus:outline-none"
            >
              <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M18.278 16.864a1 1 0 0 1-1.414 1.414l-4.829-4.828-4.828 4.828a1 1 0 0 1-1.414-1.414l4.828-4.829-4.828-4.828a1 1 0 0 1 1.414-1.414l4.829 4.828 4.828-4.828a1 1 0 1 1 1.414 1.414l-4.828 4.829 4.828 4.828z"
                  />
                ) : (
                  <path
                    fillRule="evenodd"
                    d="M4 5h16a1 1 0 0 1 0 2H4a1 1 0 1 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2z"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="border-t border-gray-100 md:hidden">
            <div className="space-y-1 px-2 pt-2 pb-3 sm:px-3">
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="block px-3 py-2 font-medium text-gray-700 no-underline hover:text-[#CD7F32]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <div className="space-y-2 px-3 py-2">
                <Link
                  href="/signin?next=/admin"
                  className="block w-full rounded-lg border border-[#CD7F32] px-4 py-2 text-center font-semibold text-[#CD7F32] transition-colors hover:bg-[#CD7F32] hover:text-white"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admin Login
                </Link>
                <Link
                  href="/#contact"
                  className="block w-full rounded-lg bg-[#CD7F32] px-4 py-2 text-center font-semibold text-white transition-colors hover:bg-[#8B4513]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Book a free demo
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
