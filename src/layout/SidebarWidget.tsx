import React from "react";

export default function SidebarWidget() {
  return (
    <div
      className={`mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03]`}
    >
      <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
        RD Tech Bridge
      </h3>
      <p className="text-theme-sm mb-4 text-gray-500 dark:text-gray-400">
        Manage your clients&apos; digital presence from one place.
      </p>
      <a
        href="/profile"
        className="bg-brand-500 text-theme-sm hover:bg-brand-600 flex items-center justify-center rounded-lg p-3 font-medium text-white"
      >
        My Profile
      </a>
    </div>
  );
}
