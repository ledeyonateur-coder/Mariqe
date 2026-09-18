import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { friperieCategories, getCategory } from "@/data/friperie";
import FriperieCategoryView from "@/components/FriperieCategoryView";

export function generateStaticParams() {
  return friperieCategories.map((category) => ({ id: category.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const category = getCategory(params.id);
  if (!category) return {};
  return {
    title: `${category.name} — Friperie Soleil`,
    description: category.description,
  };
}

export default function FriperieCategoryPage({ params }: { params: { id: string } }) {
  const category = getCategory(params.id);
  if (!category) notFound();
  return <FriperieCategoryView category={category} />;
}
