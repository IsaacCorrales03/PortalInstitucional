import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SobreNosotros from "@/components/SobreNosotros";
import Especialidades from "@/components/Especialidades";
import Contacto from "@/components/Contacto";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <SobreNosotros />
        <Especialidades />
        <Contacto />
      </main>
      <Footer />
    </>
  );
}