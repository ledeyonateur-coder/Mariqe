// L'espace friperie : 8 categories de seconde main chinee, en plus des pieces
// uniques du drop (voir data/products.ts).
//
// /!\ LES PIECES CI-DESSOUS SONT DES PLACEHOLDERS (2 par categorie, avec un
// visuel "a venir" dans public/friperie/). Elles servent uniquement a voir la
// mise en page. A remplacer par le vrai stock : nom, taille, prix, et surtout
// la photo — deposer le fichier dans public/friperie/ et pointer `image`
// dessus. Une categorie sans piece affiche "BIENTOT" et n'est pas cliquable.

export type FriperieCategory = {
  id: string;
  name: string;
  description: string;
  accent: "rust" | "denim" | "sage" | "mustard" | "dusty" | "olive" | "clay" | "red";
};

export type FriperiePiece = {
  id: string;
  categoryId: FriperieCategory["id"];
  name: string;
  size: string; // ex. "M", "40", "Taille unique"
  price: number; // en euros
  image: string; // chemin vers /public/friperie/...
  sold?: boolean; // piece partie : elle reste visible, barree
};

export const friperieCategories: FriperieCategory[] = [
  {
    id: "vestes-manteaux",
    name: "Vestes & Manteaux",
    description: "Denim, velours, cuir : les pièces qui tiennent chaud et qui durent.",
    accent: "rust",
  },
  {
    id: "chemises-blouses",
    name: "Chemises & Blouses",
    description: "Fleuries, rayées, brodées. Chinées une par une chez les brocanteurs.",
    accent: "denim",
  },
  {
    id: "jeans-pantalons",
    name: "Jeans & Pantalons",
    description: "Des toiles déjà portées, déjà assouplies, prêtes à repartir.",
    accent: "sage",
  },
  {
    id: "pulls-mailles",
    name: "Pulls & Mailles",
    description: "Laine, tricot, crochet. Le vestiaire d'hiver en seconde main.",
    accent: "mustard",
  },
  {
    id: "robes-jupes",
    name: "Robes & Jupes",
    description: "Imprimés d'époque et coupes qu'on ne trouve plus en magasin.",
    accent: "dusty",
  },
  {
    id: "tshirts-sweats",
    name: "T-shirts & Sweats",
    description: "Le basique du quotidien, sauvé du tri plutôt que racheté neuf.",
    accent: "olive",
  },
  {
    id: "sacs-accessoires",
    name: "Sacs & Accessoires",
    description: "Ceintures, foulards, bobs, sacs : les détails qui changent tout.",
    accent: "clay",
  },
  {
    id: "pieces-rares",
    name: "Pièces Rares",
    description: "Le vintage qu'on ne sort qu'une fois. Un exemplaire, jamais deux.",
    accent: "red",
  },
];

// PLACEHOLDERS — a remplacer par le vrai stock.
export const friperiePieces: FriperiePiece[] = [
  { id: "veste-jean-01", categoryId: "vestes-manteaux", name: "{{PIECE}} Veste en jean délavée", size: "M", price: 28, image: "/friperie/vestes-manteaux-01.svg" },
  { id: "manteau-laine-02", categoryId: "vestes-manteaux", name: "{{PIECE}} Manteau en laine", size: "L", price: 45, image: "/friperie/vestes-manteaux-02.svg" },

  { id: "chemise-fleurie-01", categoryId: "chemises-blouses", name: "{{PIECE}} Chemise à fleurs", size: "S", price: 15, image: "/friperie/chemises-blouses-01.svg" },
  { id: "blouse-brodee-02", categoryId: "chemises-blouses", name: "{{PIECE}} Blouse brodée", size: "M", price: 18, image: "/friperie/chemises-blouses-02.svg" },

  { id: "jean-droit-01", categoryId: "jeans-pantalons", name: "{{PIECE}} Jean coupe droite", size: "38", price: 22, image: "/friperie/jeans-pantalons-01.svg" },
  { id: "pantalon-velours-02", categoryId: "jeans-pantalons", name: "{{PIECE}} Pantalon en velours", size: "40", price: 20, image: "/friperie/jeans-pantalons-02.svg" },

  { id: "pull-laine-01", categoryId: "pulls-mailles", name: "{{PIECE}} Pull en laine", size: "L", price: 20, image: "/friperie/pulls-mailles-01.svg" },
  { id: "gilet-crochet-02", categoryId: "pulls-mailles", name: "{{PIECE}} Gilet au crochet", size: "M", price: 25, image: "/friperie/pulls-mailles-02.svg" },

  { id: "robe-imprimee-01", categoryId: "robes-jupes", name: "{{PIECE}} Robe imprimée", size: "S", price: 24, image: "/friperie/robes-jupes-01.svg" },
  { id: "jupe-plissee-02", categoryId: "robes-jupes", name: "{{PIECE}} Jupe plissée", size: "36", price: 16, image: "/friperie/robes-jupes-02.svg" },

  { id: "tshirt-coton-01", categoryId: "tshirts-sweats", name: "{{PIECE}} T-shirt en coton", size: "M", price: 8, image: "/friperie/tshirts-sweats-01.svg" },
  { id: "sweat-molleton-02", categoryId: "tshirts-sweats", name: "{{PIECE}} Sweat molletonné", size: "L", price: 18, image: "/friperie/tshirts-sweats-02.svg" },

  { id: "sac-cuir-01", categoryId: "sacs-accessoires", name: "{{PIECE}} Sac en cuir", size: "Taille unique", price: 30, image: "/friperie/sacs-accessoires-01.svg" },
  { id: "foulard-soie-02", categoryId: "sacs-accessoires", name: "{{PIECE}} Foulard en soie", size: "Taille unique", price: 12, image: "/friperie/sacs-accessoires-02.svg" },

  { id: "piece-rare-01", categoryId: "pieces-rares", name: "{{PIECE}} Blouson vintage", size: "M", price: 60, image: "/friperie/pieces-rares-01.svg" },
  { id: "piece-rare-02", categoryId: "pieces-rares", name: "{{PIECE}} Veste militaire", size: "L", price: 55, image: "/friperie/pieces-rares-02.svg" },
];

export function getCategory(id: string): FriperieCategory | undefined {
  return friperieCategories.find((category) => category.id === id);
}

export function piecesOf(categoryId: string): FriperiePiece[] {
  return friperiePieces.filter((piece) => piece.categoryId === categoryId);
}

// Compteur affiche sur la tuile : uniquement les pieces encore dispo.
export function availableCount(categoryId: string): number {
  return piecesOf(categoryId).filter((piece) => !piece.sold).length;
}

// Apercu photo de la tuile : les 4 premieres photos de la categorie, pour
// former la mosaique (moins de 4 -> la mosaique se remplit avec ce qu'il y a).
export function previewImages(categoryId: string, max = 4): string[] {
  return piecesOf(categoryId).slice(0, max).map((piece) => piece.image);
}
