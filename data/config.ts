// /!\ A METTRE A JOUR AVANT CHAQUE DROP.
// Quand cette date est depassee, le compte a rebours disparait et laisse
// place a la revelation du logo (voir components/Countdown.tsx). C'est voulu,
// mais ca veut dire qu'une date passee "efface" le compteur du site.
export const DROP_DATE = "2026-10-01T00:00:00+02:00";

export const BRAND_NAME = "SOLEIL";

export const config = {
  hero: {
    scrollHint: "",
  },
  countdown: {
    eyebrow: "Le concept est simple :", // ex. "PROCHAIN DROP"
    headline: ` 1 Drop = 1 Pièce unique. Ce que vous portez, personne d’autre ne l’a. Jamais.

De l’upcycling, du savoir-faire français, et de l’authenticité à chaque couture. `, // ex. "LA COLLECTION ARRIVE"
    previewCta: `Nous, c’est de l’artisanat 100% français. Pas de production en série, pas de gaspillage : on récupère des tissus chinés chez les brocanteurs, des matières qui ont déjà vécu, et on leur donne une seconde vie.
AVANT LE PROCHAIN DROP    COLLECTION CI-DESSOUS `,
    revealTagline: "Upcycling Aveyronais ", // ex. "Fait main. Modulable. Corse."
  },
  footer: {
    tagline: "Atelier de couture Privé à Villefranche-de-Rouergue.",
    // Facebook retire tant qu'il n'y a pas de compte : le lien pointait sur
    // le gabarit {{HANDLE}}, donc sur une page inexistante. Pour le remettre,
    // rajouter une ligne ici avec le vrai pseudo.
    social: [
      { label: "Instagram", href: "https://instagram.com/soleil.upcycling" },
    ],
  },
};
