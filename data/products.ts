export type Product = {
  id: string;
  name: string;
  price: number; // en euros
  description: string;
  image: string; // chemin vers /public/products/...
  variantImages?: string[]; // pour l'aspect "modulable"
  accent: "rust" | "sage" | "mustard" | "denim" | "dusty" | "olive";
  // Nombre d'exemplaires disponibles. Chaque pièce étant unique (1 Drop = 1
  // Pièce), c'est presque toujours 0 ou 1. Décrémenté automatiquement dès
  // qu'un paiement Stripe est confirmé (voir lib/stockStore.ts) — modifier
  // cette valeur à la main ne sert qu'à retirer une pièce manuellement.
  stock: number;
};

export function isSoldOut(product: Pick<Product, "stock">): boolean {
  return product.stock <= 0;
}

// 6 entrées placeholders — à remplacer par les vrais visuels/prix du drop.
export const products: Product[] = [
  {
    id: "veste-patchwork-01",
    name: "Veste Patchwork {{NOM_1}}",
    price: 180,
    description: "Veste en denim upcyclé, poches amovibles, patchs cousus main.",
    image: "/products/placeholder-01.svg",
    variantImages: ["/products/placeholder-01.svg", "/products/placeholder-01-alt.svg"],
    accent: "rust",
    stock: 1,
  },
  {
    id: "chemise-fleurs-02",
    name: "Chemise Fleurie {{NOM_2}}",
    price: 120,
    description: "Chemise à fleurs appliquées en feutrine, coupe ample.",
    image: "/products/placeholder-02.svg",
    variantImages: ["/products/placeholder-02.svg"],
    accent: "dusty",
    stock: 1,
  },
  {
    id: "gilet-tisse-03",
    name: "Gilet Tissé {{NOM_3}}",
    price: 140,
    description: "Gilet tricoté/crocheté main, coloris interchangeables.",
    image: "/products/placeholder-03.svg",
    variantImages: ["/products/placeholder-03.svg", "/products/placeholder-03-alt.svg"],
    accent: "sage",
    stock: 1,
  },
  {
    id: "short-surf-04",
    name: "Short Surf {{NOM_4}}",
    price: 90,
    description: "Short léger, taille élastique, poche planche.",
    image: "/products/placeholder-04.svg",
    variantImages: ["/products/placeholder-04.svg"],
    accent: "denim",
    stock: 1,
  },
  {
    id: "sac-atelier-05",
    name: "Sac Atelier {{NOM_5}}",
    price: 75,
    description: "Sac en chutes de tissu recyclées, bandoulière réglable.",
    image: "/products/placeholder-05.svg",
    variantImages: ["/products/placeholder-05.svg", "/products/placeholder-05-alt.svg"],
    accent: "mustard",
    stock: 1,
  },
  {
    id: "bob-brut-06",
    name: "Bob Brut {{NOM_6}}",
    price: 45,
    description: "Bob réversible, deux motifs patchwork en un.",
    image: "/products/placeholder-06.svg",
    variantImages: ["/products/placeholder-06.svg", "/products/placeholder-06-alt.svg"],
    accent: "olive",
    stock: 1,
  },
];
