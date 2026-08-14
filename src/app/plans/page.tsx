import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import PlansSection from "@/components/landing/PlansSection";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Plans — RC Tech Bridge",
  description:
    "See RC Tech Bridge's plans, tell us about your business, and get your onboarding questionnaire by email.",
};

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <PlansSection />
      </main>
      <Footer />
    </div>
  );
}
