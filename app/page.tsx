import PhoneFrame from "@/components/PhoneFrame";
import SunriseHero from "@/components/SunriseHero";
import Countdown from "@/components/Countdown";
import ProductShowcase from "@/components/ProductShowcase";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <PhoneFrame>
      <SunriseHero />
      <Countdown />
      <ProductShowcase />
      <Footer />
    </PhoneFrame>
  );
}
