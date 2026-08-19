import { useSiteConfig } from '../context/SiteConfigContext';
import Hero from '../components/Hero';
import WaveDivider from '../components/WaveDivider';
import SectionTitle from '../components/SectionTitle';
import ProductGrid from '../components/ProductGrid';
import Steps from '../components/Steps';
import Newsletter from '../components/Newsletter';

/**
 * La page d'accueil est composée dynamiquement à partir de
 * `config.home.sections` : réordonner/ajouter/retirer une section ne
 * demande aucune modification de code, seulement d'éditer le tableau
 * dans site.config.js.
 */
function renderSection(section, index, products) {
  switch (section.type) {
    case 'wave':
      return <WaveDivider key={index} color={section.color} />;
    case 'featured':
      return (
        <section key={index}>
          <SectionTitle number={section.number} title={section.title} />
          <ProductGrid products={products.slice(0, section.count)} columns={3} />
        </section>
      );
    case 'steps':
      return <Steps key={index} number={section.number} title={section.title} items={section.items} />;
    case 'newsletter':
      return <Newsletter key={index} {...section} />;
    default:
      return null;
  }
}

export default function Home() {
  const { home, products } = useSiteConfig();

  return (
    <>
      <Hero hero={home.hero} />
      {home.sections.map((section, i) => renderSection(section, i, products))}
    </>
  );
}
