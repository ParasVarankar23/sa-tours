import HeroSection from "@/components/home/HeroSection";
import AboutSection from "@/components/home/AboutSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import DestinationSearch from "@/components/home/DestinationSearch";
import DestinationGrid from "@/components/home/DestinationGrid";
import TestimonialSection from "@/components/home/TestimonalsSection";
import CTASection from "@/components/home/CTASection";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <FeaturesSection />
      <DestinationSearch />
      <DestinationGrid />
      <TestimonialSection />
      <CTASection />
    </>
  );
}