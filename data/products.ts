export type Product = {
  id: string;
  name: string;
  price: number; // en euros
  description: string;
  image: string; // chemin vers /public/products/...
  variantImages?: string[]; // pour l'aspect "modulable"
  accent: "rust" | "sage" | "mustard" | "denim" | "dusty" | "olive";
};

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
  },
  {
    id: "chemise-fleurs-02",
    name: "Chemise Fleurie {{NOM_2}}",
    price: 120,
    description: "Chemise à fleurs appliquées en feutrine, coupe ample.",
    image: "/products/placeholder-02.svg",
    variantImages: ["/products/placeholder-02.svg"],
    accent: "dusty",
  },
  {
    id: "gilet-tisse-03",
    name: "Gilet Tissé {{NOM_3}}",
    price: 140,
    description: "Gilet tricoté/crocheté main, coloris interchangeables.",
    image: "/products/placeholder-03.svg",
    variantImages: ["/products/placeholder-03.svg", "/products/placeholder-03-alt.svg"],
    accent: "sage",
  },
  {
    id: "short-surf-04",
    name: "Short Surf {{NOM_4}}",
    price: 90,
    description: "Short léger, taille élastique, poche planche.",
    image: "/products/placeholder-04.svg",
    variantImages: ["/products/placeholder-04.svg"],
    accent: "denim",
  },
  {
    id: "sac-atelier-05",
    name: "Sac Atelier {{NOM_5}}",
    price: 75,
    description: "Sac en chutes de tissu recyclées, bandoulière réglable.",
    image: "/products/placeholder-05.svg",
    variantImages: ["/products/placeholder-05.svg", "/products/placeholder-05-alt.svg"],
    accent: "mustard",
  },
  {
    id: "bob-brut-06",
    name: "Bob Brut {{NOM_6}}",
    price: 45,
    description: "Bob réversible, deux motifs patchwork en un.",
    image: "/products/placeholder-06.svg",
    variantImages: ["/products/placeholder-06.svg", "/products/placeholder-06-alt.svg"],
    accent: "olive",
  },
];
