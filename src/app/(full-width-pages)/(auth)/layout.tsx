import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import { ThemeProvider } from "@/context/ThemeContext";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-1 bg-white p-6 sm:p-0 dark:bg-gray-900">
      <ThemeProvider>
        <div className="relative flex h-screen w-full flex-col justify-center sm:p-0 lg:flex-row dark:bg-gray-900">
          {children}
          <div className="bg-brand-950 hidden h-full w-full items-center lg:grid lg:w-1/2 dark:bg-white/5">
            <div className="relative z-1 flex items-center justify-center">
              {/* <!-- ===== Common Grid Shape Start Here ===== --> */}
              <GridShape />
              <div className="flex max-w-xs flex-col items-center">
                <Link href="/" className="mb-6 block">
                  {/* RC Tech Bridge Logo */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-4xl font-bold text-[#CD7F32]">
                        R
                      </span>
                      <div className="h-0.5 w-10 rounded-full bg-[#C41E3A]"></div>
                      <span className="text-4xl font-bold text-[#CD7F32]">
                        D
                      </span>
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-lg font-bold tracking-wide text-[#CD7F32]">
                        TECH
                      </span>
                      <span className="-mt-1 text-lg font-bold tracking-wide text-[#C41E3A]">
                        BRIDGE
                      </span>
                    </div>
                  </div>
                </Link>
                <p className="text-center text-sm leading-relaxed text-gray-400 dark:text-white/60">
                  Bridging Business & Technology
                  <br />
                  <span className="text-xs">Secure Admin Access Portal</span>
                </p>
              </div>
            </div>
          </div>
          <div className="fixed right-6 bottom-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
