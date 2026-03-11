import { Outfit } from "next/font/google";
import "./globals.css";
import "@mdxeditor/editor/style.css";
import "react-toastify/dist/ReactToastify.css";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastContainer } from "react-toastify";
import type { Metadata } from "next";

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Used to resolve absolute URLs for OpenGraph/Twitter images in production
  // Update to your production domain as needed
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://rctechbridge.com",
  ),
  title: "RC Tech Bridge - Bridging Business & Technology",
  description:
    "Focus on growing your business while we handle all the technical obstacles. RC Tech Bridge provides seamless technology solutions that work behind the scenes.",
  keywords:
    "technology solutions, web development, business automation, technical support, small business tech",
  icons: {
    icon: [
      {
        url: "/branding/favicons/favicon-16x16.svg",
        sizes: "16x16",
        type: "image/svg+xml",
      },
      {
        url: "/branding/favicons/favicon-32x32.svg",
        sizes: "32x32",
        type: "image/svg+xml",
      },
      {
        url: "/branding/favicons/favicon-64x64.svg",
        sizes: "64x64",
        type: "image/svg+xml",
      },
    ],
    apple: [{ url: "/branding/favicons/apple-touch-icon.svg" }],
  },
  openGraph: {
    title: "RC Tech Bridge - Bridging Business & Technology",
    description:
      "Focus on growing your business while we handle all the technical obstacles.",
    url: "https://rctechbridge.com",
    siteName: "RC Tech Bridge",
    images: [
      {
        url: "/branding/logos/primary-logo.svg",
        width: 300,
        height: 120,
        alt: "RC Tech Bridge Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RC Tech Bridge - Bridging Business & Technology",
    description:
      "Focus on growing your business while we handle all the technical obstacles.",
    images: ["/branding/logos/primary-logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          type="image/svg+xml"
          href="/branding/favicons/favicon-64x64.svg"
        />
        <link
          rel="icon"
          type="image/svg+xml"
          sizes="32x32"
          href="/branding/favicons/favicon-32x32.svg"
        />
        <link
          rel="icon"
          type="image/svg+xml"
          sizes="16x16"
          href="/branding/favicons/favicon-16x16.svg"
        />
        <link
          rel="apple-touch-icon"
          href="/branding/favicons/apple-touch-icon.svg"
        />
      </head>
      <body
        className={`${outfit.className} dark:bg-gray-900`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
        <ToastContainer
          position="top-right"
          autoClose={false}
          hideProgressBar
          closeOnClick={false}
          newestOnTop
          theme="colored"
          style={{ top: "1rem", right: "1rem", width: "360px", zIndex: 999999 }}
        />
      </body>
    </html>
  );
}
