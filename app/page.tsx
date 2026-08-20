import SunriseHero from "@/components/SunriseHero";
import Countdown from "@/components/Countdown";
import ProductShowcase from "@/components/ProductShowcase";
import Footer from "@/components/Footer";
import AmbientBackground from "@/components/AmbientBackground";

export default function Home() {
  return (
    <>
      <AmbientBackground />
      <SunriseHero />
      <Countdown />
      <ProductShowcase />
      <Footer />
    </>
  );
}
