import HeroSection from "@/components/home/HeroSection";
import AboutPreview from "@/components/home/AboutPreview";
import SchedulePreview from "@/components/home/SchedulePreview";
import ServicesPreview from "@/components/home/ServicePreview";
import RoutesPreview from "@/components/home/RoutesPreview";
import OfficesPreview from "@/components/home/OfficePreview";
import CTASection from "@/components/home/CTASection";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutPreview />
      <SchedulePreview />
      <ServicesPreview />
      <RoutesPreview />
      <OfficesPreview />
      <CTASection />
    </>
  );
}