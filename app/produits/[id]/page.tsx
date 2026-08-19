import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { products } from "@/data/products";
import ProductDetail from "@/components/ProductDetail";

export function generateStaticParams() {
  return products.map((product) => ({ id: product.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const product = products.find((p) => p.id === params.id);
  if (!product) return {};
  return {
    title: `${product.name} — Mariqe`,
    description: product.description,
  };
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const index = products.findIndex((p) => p.id === params.id);
  if (index === -1) notFound();
  return <ProductDetail product={products[index]} index={index} />;
}
