# Soleil — site vitrine modulable

Boutique en ligne (démo) pour la marque **Soleil**, vêtements upcyclés faits
main. Le site est construit pour être **totalement reskinnable** : couleurs,
polices, textes, navigation, produits et structure de page se pilotent
depuis un seul fichier de configuration — aucun changement de code n'est
nécessaire pour adapter le site à une autre marque.

## Démarrer

```bash
npm install
npm run dev      # serveur de développement
npm run build    # build de production dans dist/
npm run lint     # vérification du code
```

## Comment ça marche

### Un seul fichier pilote tout : `src/config/site.config.js`

Ce fichier contient :

- **`brand`** — nom, accroche
- **`theme.colors`** / **`theme.fonts`** — palette et typographies (posées
  en variables CSS par `ThemeProvider`, aucune couleur n'est codée en dur
  dans les composants)
- **`nav`** — liens du menu
- **`home.sections`** — la page d'accueil est composée d'une **liste de
  sections ordonnable** (`wave`, `featured`, `steps`, `newsletter`...).
  Ajouter, retirer ou réordonner une section = éditer ce tableau.
- **`products`** — le catalogue (nom, prix, texture visuelle, icône,
  caractéristiques `specs`, etc.)
- **`shop`**, **`story`**, **`contact`**, **`footer`** — contenu des
  autres pages

### Créer une variante de marque

Copie `site.config.js` (ex. `autre-marque.config.js`), ajuste les valeurs,
puis passe la nouvelle config à l'application :

```jsx
<App configOverride={autreMarqueConfig} />
```

Les composants (`Header`, `Hero`, `ProductCard`, `Steps`, `Newsletter`,
`ContactForm`...) sont génériques : ils lisent uniquement les props/config,
jamais de texte ou de couleur en dur.

## Structure

```
src/
├── config/site.config.js     # contenu + thème de la marque
├── theme/ThemeProvider.jsx   # applique couleurs/polices en variables CSS
├── context/                  # config, panier (React Context)
├── components/               # composants génériques réutilisables
├── pages/                    # Accueil, Boutique, Fiche produit, Histoire, Contact
├── router/                   # utilitaires de routage
└── styles/global.css         # design system basé sur des tokens CSS
```

## Stack

React 19 + Vite + react-router-dom (HashRouter, compatible hébergement
statique sans configuration serveur).
