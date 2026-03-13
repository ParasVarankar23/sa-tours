import AboutPreview from "@/components/home/AboutPreview";
import CTASection from "@/components/home/CTASection";
import HomeHeroSection from "@/components/home/HomeHeroSection";
import OfficesPreview from "@/components/home/OfficePreview";
import RoutesPreview from "@/components/home/RoutesPreview";
import SchedulePreview from "@/components/home/SchedulePreview";
import ServicesPreview from "@/components/home/ServicePreview";

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
    </>
  );
}