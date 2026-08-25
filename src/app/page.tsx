import type { Metadata } from "next";
import Navbar from "../components/landing/Navbar";
import HeroSection from "../components/landing/HeroSection";
import VideoSection from "../components/landing/VideoSection";
import ServicesSection from "../components/landing/ServicesSection";
import CustomSoftwareSection from "../components/landing/CustomSoftwareSection";
import AiFaqSection from "../components/landing/AiFaqSection";
import AboutSection from "../components/landing/AboutSection";
import ContactSection from "../components/landing/ContactSection";
import Footer from "../components/landing/Footer";

const ROOT_LANDING_WEBSITE_ID =
  process.env.NEXT_PUBLIC_ROOT_LANDING_WEBSITE_ID || "1";

export const metadata: Metadata = {
  title: "RD TechBridge — Websites, Ads & AI Agents for Small Businesses",
  description:
    "RD TechBridge builds professional websites, manages Google & Meta ad campaigns, and deploys AI agents that automate customer follow-up for growing small businesses.",
  keywords:
    "small business websites, Google ads management, Meta ads, AI agents, business automation, web development, RD TechBridge",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <HeroSection />
        <VideoSection />
        <ServicesSection />
        <CustomSoftwareSection />
        <AiFaqSection />
        <AboutSection />
        {/* TODO: PricingSection hidden — pricing to be updated in the future */}
        {/* <PricingSection /> */}
        <ContactSection websiteId={ROOT_LANDING_WEBSITE_ID} />
      </main>
      <Footer />
    </div>
  );
}
