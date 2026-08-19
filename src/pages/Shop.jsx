import { useState } from 'react';
import { useSiteConfig } from '../context/SiteConfigContext';
import PageHead from '../components/PageHead';
import WaveDivider from '../components/WaveDivider';
import Filters from '../components/Filters';
import ProductGrid from '../components/ProductGrid';

export default function Shop() {
  const { shop, products } = useSiteConfig();
  const [activeFilter, setActiveFilter] = useState('all');

  const visible = activeFilter === 'all'
    ? products
    : products.filter((p) => p.filter === activeFilter);

  return (
    <>
      <PageHead eyebrow={shop.eyebrow} title={shop.title} lede={shop.lede} />
      <WaveDivider color={shop.waveColor} />
      <Filters filters={shop.filters} active={activeFilter} onChange={setActiveFilter} />
      <ProductGrid products={visible} columns={4} />
    </>
  );
}
