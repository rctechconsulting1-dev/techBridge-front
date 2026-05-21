"use client";

import { useState } from "react";

const ROOT_WEBSITE_ID =
  process.env.NEXT_PUBLIC_ROOT_LANDING_WEBSITE_ID || "1";

export default function FooterNewsletter() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/bookings/public/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId: ROOT_WEBSITE_ID,
          contactName: name || "Newsletter subscriber",
          contactEmail: email,
          notes: "Source: Footer newsletter signup",
          metadata: { source: "footer_newsletter" },
        }),
      });

      if (res.ok) {
        setStatus("success");
        setName("");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-4 md:items-start text-center md:text-left">
        <p className="text-[#1ED28C] font-bold text-lg">You&apos;re in! ✓</p>
        <p className="text-[#DEB887] text-sm mt-1">
          We&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full md:w-auto">
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border-0 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-[#C41E3A] focus:outline-none md:w-80"
      />
      <div className="flex">
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 rounded-l-lg border-0 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-[#C41E3A] focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-r-lg bg-[#C41E3A] px-6 py-3 whitespace-nowrap text-white font-semibold transition-colors duration-300 hover:bg-[#8B0000] disabled:opacity-60"
        >
          {status === "loading" ? "..." : "Get Updates"}
        </button>
      </div>
      {status === "error" && (
        <p className="text-red-400 text-xs">
          Something went wrong. Try emailing us directly.
        </p>
      )}
    </form>
  );
}
