import AboutPreview from "@/components/home/AboutPreview";
import CTASection from "@/components/home/CTASection";
import HomeHeroSection from "@/components/home/HomeHeroSection";
import OfficesPreview from "@/components/home/OfficePreview";
import RoutesPreview from "@/components/home/RoutesPreview";
import SchedulePreview from "@/components/home/SchedulePreview";
import ServicesPreview from "@/components/home/ServicePreview";
import { Bot, MessageCircle, PhoneCall } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <HomeHeroSection />
      <AboutPreview />
      <SchedulePreview />
      <ServicesPreview />
      <RoutesPreview />
      <OfficesPreview />
      <CTASection />

      <div className="fixed right-5 bottom-5 z-50 flex flex-col gap-3">
        <Link
          href="/contact"
          aria-label="Open chatbot support"
          title="Chat Support"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-300 transition hover:scale-105 hover:bg-orange-600"
        >
          <Bot size={20} />
        </Link>

      </div>
    </>
  );
}