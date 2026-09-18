// Les 8 categories de l'espace friperie (seconde main chinee), en plus des
// pieces uniques du drop (voir data/products.ts).
//
// /!\ `pieces` est le nombre d'articles en rayon dans la categorie. Il est
// a 0 partout tant que le stock friperie n'est pas rentre : une categorie a
// 0 s'affiche "BIENTOT" au lieu d'annoncer un rayon vide.
// `href` est optionnel : tant qu'il n'y a pas de page dediee, la tuile n'est
// pas cliquable. Des qu'une page existe (ex. "/friperie/vestes"), rajouter
// le href ici et la tuile devient un lien, sans toucher au composant.

export type FriperieCategory = {
  id: string;
  name: string;
  description: string;
  accent: "rust" | "denim" | "sage" | "mustard" | "dusty" | "olive" | "clay" | "red";
  pieces: number;
  href?: string;
};

export const friperieCategories: FriperieCategory[] = [
  {
    id: "vestes-manteaux",
    name: "Vestes & Manteaux",
    description: "Denim, velours, cuir : les pièces qui tiennent chaud et qui durent.",
    accent: "rust",
    pieces: 0,
  },
  {
    id: "chemises-blouses",
    name: "Chemises & Blouses",
    description: "Fleuries, rayées, brodées. Chinées une par une chez les brocanteurs.",
    accent: "denim",
    pieces: 0,
  },
  {
    id: "jeans-pantalons",
    name: "Jeans & Pantalons",
    description: "Des toiles déjà portées, déjà assouplies, prêtes à repartir.",
    accent: "sage",
    pieces: 0,
  },
  {
    id: "pulls-mailles",
    name: "Pulls & Mailles",
    description: "Laine, tricot, crochet. Le vestiaire d'hiver en seconde main.",
    accent: "mustard",
    pieces: 0,
  },
  {
    id: "robes-jupes",
    name: "Robes & Jupes",
    description: "Imprimés d'époque et coupes qu'on ne trouve plus en magasin.",
    accent: "dusty",
    pieces: 0,
  },
  {
    id: "tshirts-sweats",
    name: "T-shirts & Sweats",
    description: "Le basique du quotidien, sauvé du tri plutôt que racheté neuf.",
    accent: "olive",
    pieces: 0,
  },
  {
    id: "sacs-accessoires",
    name: "Sacs & Accessoires",
    description: "Ceintures, foulards, bobs, sacs : les détails qui changent tout.",
    accent: "clay",
    pieces: 0,
  },
  {
    id: "pieces-rares",
    name: "Pièces Rares",
    description: "Le vintage qu'on ne sort qu'une fois. Un exemplaire, jamais deux.",
    accent: "red",
    pieces: 0,
  },
];
