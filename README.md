# Mariqe

Site vitrine one-page pour la marque **Mariqe**, pensé exclusivement pour
l'écran iPhone (mobile-first strict — le contenu reste centré dans un cadre
façon iPhone même sur grand écran, via `<PhoneFrame>`).

Expérience en 3 temps au scroll :

1. **Lever de soleil en vue subjective** — animation scroll-jackée
   (GSAP + ScrollTrigger, `position: sticky`) façon lever de soleil sur la
   mer, vécu au niveau de l'eau.
2. **Compte à rebours** avant le prochain drop, avec séquence de reveal
   (flash → dissolution → logo) quand il atteint zéro.
3. **6 vitrines produits** en plein écran avec scroll-snap, étiquettes prix
   façon patch tissé, et micro-interaction tilt/tap-to-swap sur les visuels.

Direction artistique : pacific punk wave / indie rock — DIY, patchwork,
contraste entre le fait-main brut et des animations fluides façon Apple.

## Démarrer

```bash
npm install
npm run dev      # serveur de développement (http://localhost:3000)
npm run build    # build de production
npm run start    # sert le build de production
npm run lint     # vérification du code (ESLint)
```

## Contenu à éditer

- **`data/config.ts`** — `DROP_DATE` (date cible du countdown, ISO 8601
  avec fuseau), nom de marque, textes d'accroche (placeholders
  `{{TEXTE_...}}` à remplacer), liens réseaux sociaux du footer.
- **`data/products.ts`** — les 6 produits (nom, prix, description, image,
  variantes). Les visuels par défaut dans `public/products/` sont des
  placeholders SVG à remplacer par les vraies photos.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (tokens couleur/typo dans `tailwind.config.ts` et
  `styles/globals.css`)
- Framer Motion (transitions de composants, reveal du countdown, tilt des
  cartes produit)
- GSAP + ScrollTrigger (`lib/scrollAnimations.ts`) pour le lever de soleil
  scrub-scrollé

## Structure

```
app/            layout.tsx, page.tsx (assemble les sections dans l'ordre)
components/     PhoneFrame, SunriseHero, Countdown, ProductShowcase,
                ProductWindow, Footer, GrainOverlay
data/           config.ts (DROP_DATE, textes), products.ts (catalogue)
lib/            scrollAnimations.ts (setup GSAP/ScrollTrigger centralisé,
                hook useReducedMotion)
public/         products/ (visuels), textures/ (grain SVG), favicon
styles/         globals.css (tokens couleur §2, safe-areas, scroll-snap)
```

## Accessibilité

Le site respecte `prefers-reduced-motion` : le lever de soleil scrub-scrollé
devient un visuel statique (pas de scroll-jacking), le flip-clock et la
séquence de reveal du countdown sont réduits à de simples fondus.
