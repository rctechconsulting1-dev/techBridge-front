import type { Metadata } from "next";
import Navbar from "../components/landing/Navbar";
import HeroSection from "../components/landing/HeroSection";
import ServicesSection from "../components/landing/ServicesSection";
import AboutSection from "../components/landing/AboutSection";
import ContactSection from "../components/landing/ContactSection";
import Footer from "../components/landing/Footer";

const ROOT_LANDING_WEBSITE_ID =
  process.env.NEXT_PUBLIC_ROOT_LANDING_WEBSITE_ID || "1";

export const metadata: Metadata = {
  title: "RC Tech Bridge - Bridging Business & Technology",
  description:
    "Focus on growing your business while we handle all the technical obstacles. RC Tech Bridge provides seamless technology solutions that work behind the scenes.",
  keywords:
    "technology solutions, web development, business automation, technical support, small business tech",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <HeroSection />
        <ServicesSection />
        <AboutSection />
        {/* TODO: PricingSection hidden — pricing to be updated in the future */}
        {/* <PricingSection /> */}
        <ContactSection websiteId={ROOT_LANDING_WEBSITE_ID} />
      </main>
      <Footer />
    </div>
  );
}
