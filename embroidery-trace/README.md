# FilTrace — image → fichier de broderie

Site autonome (séparé du site « soleil » à la racine du dépôt) qui reprend le
concept d'[embroiderytrace.com](https://embroiderytrace.com) : on importe une
image, elle est vectorisée couleur par couleur, chaque couleur reçoit un type de
point, et on exporte un fichier pour brodeuse numérique.

Tout tourne **dans le navigateur** (HTML/CSS/JS sans dépendance ni build) :
l'image n'est jamais envoyée sur un serveur.

## bernette Chicago 7

La machine par défaut est la **bernette Chicago 7** (réglable dans « Ma machine ») :
format **.EXP** (le seul qu'elle lit), cadres 110×170, 100×100 et 40×40 mm, pas
de commande de coupe dans le fichier (la machine n'a pas de coupe-fil
automatique) et nom de fichier court en majuscules (`MOTIF.EXP`). Le bouton
« ⬇ Fichier .EXP » en haut à droite télécharge directement le fichier à copier
sur la clé USB. D'autres profils existent : Bernina, Brother, Janome,
Pfaff/Husqvarna, machines pro.

## Application installable

Le site est une PWA (`manifest.webmanifest`, `sw.js`) : une fois en ligne en
HTTPS, « Installer l'application » (ordinateur) ou « Ajouter à l'écran
d'accueil » (téléphone) l'installe comme une app, utilisable hors connexion.

## Fonctions en ligne (facultatives)

La **synchronisation entre appareils** et la **galerie communautaire** passent
par deux fonctions Vercel (`api/sync.js`, `api/gallery.js`) et une base
**Upstash Redis** (offre gratuite suffisante). Sans base configurée, le reste du
site fonctionne et ces deux fonctions affichent « non configuré ».

Pour les activer :
1. Vercel → projet → **Storage** (ou Marketplace) → **Upstash / Redis** → créer
   une base et la **connecter au projet** : Vercel ajoute les variables
   `KV_REST_API_URL` et `KV_REST_API_TOKEN` (ou `UPSTASH_REDIS_REST_URL` /
   `UPSTASH_REDIS_REST_TOKEN` si vous les copiez depuis upstash.com).
2. Facultatif : `GALLERY_ADMIN_KEY` = un mot de passe long, pour supprimer
   n'importe quel motif de la galerie (modération) avec l'API DELETE.
3. Redéployer.

Les projets synchronisés sont compressés et **chiffrés dans le navigateur**
(AES-GCM, clé dérivée du code personnel) : le serveur ne voit ni le code ni le
contenu. La galerie masque un motif après 3 signalements.

Statistiques : activer **Web Analytics** dans l'onglet Analytics du projet
Vercel (le script `/_vercel/insights/script.js` est déjà dans les pages).

Adresse du site : les balises de partage, `sitemap.xml` et `robots.txt`
utilisent `https://filtracebroderie.vercel.app`. Si l'adresse finale est
différente, remplacez-la dans ces fichiers.

## Pages

- `index.html` — page de présentation (étapes, fonctions, galerie de rendus, formats, FAQ) ; `en/index.html` en anglais.
- `communaute.html` — galerie de motifs partagés par la communauté.
- `aide/` — guides (Chicago 7, image, formats, tissus, points) ; `mentions-legales.html` (à compléter : éditeur et contact), `confidentialite.html`.
- `app.html` — l'éditeur.

## Fonctions de l'éditeur

| Étape | Fonctions |
| --- | --- |
| Texte | prénoms et mots (plusieurs polices), hauteur en mm, ajoutés sous / sur / au centre du motif ou en motif texte seul |
| Fichiers de broderie | ouvrir un DST, EXP, JEF, PES ou VP3 existant pour le voir, le redimensionner, changer ses couleurs ou le convertir |
| Import | PNG, JPG, SVG, WEBP, GIF, BMP — glisser-déposer, clic ou Ctrl+V ; **recadrage** à l'import (format libre, carré, format du cadre, rotation) et bouton « Recadrer » ; exemple intégré (`app.html?exemple`) |
| Type de broderie | Remplie, **contours seulement** (un contour par couleur) ou contours d'un seul fil (couleur au choix, trait épais en option) |
| Couleurs | 2 à 16 fils (k-means), fond retiré automatiquement (les blancs *intérieurs* restent brodés), nettoyage des îlots, lissage des bords, arrondi et simplification des contours |
| Points | **sélecteur visuel du type de point** pour tout le motif (Auto, Remplissage, Satin, Point droit, **Appliqué** en 3 passages), **satin qui suit les courbes** (ligne médiane de la forme), **déplacements cousus à l'intérieur des formes** au lieu de sauts + coupes, puis par calque : **Auto** (satin pour les formes étroites, remplissage pour les surfaces), Remplissage tatami, Satin, Point droit, Ignorer ; angle (ou auto), densité, longueur de point, compensation d'étirement, sous-couche, contour, point triple ; points d'arrêt et coupes de fil automatiques |
| Édition manuelle | pinceau, gomme, pot de peinture, pipette, taille du pinceau, nouveau calque, fusion de calques, suppression, ordre de broderie, couleur libre ou nuancier Brother, masquer ; annuler / rétablir (Ctrl+Z / Ctrl+Maj+Z) |
| Aperçu | vues Image / Couleurs / Vecteurs / Points, zoom et déplacement, rendu réaliste du fil sur la couleur du tissu, sauts affichables, **simulation animée** de la broderie |
| Tissu | préréglages coton, jean, t-shirt, éponge, casquette, tissu fin (densité, compensation, sous-couche) + conseil de stabilisateur |
| Photo | luminosité, contraste, saturation ; baguette pour retirer une zone (fond) d'un clic |
| Espacement | **espacement entre les fils** et longueur des points pour tout le motif (puis réglables calque par calque) ; longueur des points du contour en mode contours |
| Fichier | type de fichier au choix (EXP, PES, JEF, DST, VP3), format recommandé selon la machine |
| Taille | **barre de taille sous l'aperçu** (5 / 7 / 10 / 15 cm, max du cadre, curseur) ; largeur / hauteur en mm, cadres 4×4 à 9,5×14, alerte si le motif dépasse, bouton « Ajuster au cadre » |
| Export | **DST, PES, JEF, EXP, VP3**, SVG en calques (Inkscape / Ink/Stitch), PNG d'aperçu, fiche couleurs imprimable (fils Brother + Janome, points, métrage), ZIP de tout |
| Projet | **Mes projets** : sauvegarde dans le navigateur (IndexedDB) avec vignette ; téléchargement / import `.filtrace.json` |
| Guide | ordre des fils étape par étape, fils à couper par couleur, consignes d'appliqué |
| Nuanciers | Brother, Janome, Husqvarna Viking (Madeira / Gunold non inclus : pas de table de couleurs fiable) |
| Expérience | **mode simple** (3 étapes) / avancé, **visite guidée**, **9 modèles**, **mode sombre**, **avant / après**, curseurs appliqués en direct, calculs dans un **Worker** avec barre de progression, annuler / rétablir sur tous les réglages |
| Contrôle | **alertes** (points trop longs, zones trop denses, texte trop petit, hors cadre), **Mes bobines** (n'utiliser que ses fils), style **dessin au trait** pour les photos, outil **Déplacer**, textes modifiables |
| Langues | français et **anglais** (bouton EN/FR, `?lang=en`) |
| Téléphone | onglets Aperçu / Réglages / Calques / Fichier, **zoom à deux doigts** |

Raccourcis : `1`–`4` vues, `H` main, `B` pinceau, `E` gomme, `G` pot, `I` pipette,
`+` / `-` / `0` zoom, espace + glisser pour se déplacer.

## Lancer en local

Les modules ES demandent un petit serveur HTTP (pas de `file://`) :

```bash
cd embroidery-trace
node test/dev-server.mjs 8080   # puis http://localhost:8080 (avec /api et une base en mémoire)
```

## Mise en ligne

C'est un site statique : n'importe quel hébergeur convient. Sur Vercel, créer un
projet sur ce dépôt avec **Root Directory = `embroidery-trace`** et aucun
framework (pas de commande de build).

## Tests

`test/readers.mjs` relit ces fichiers avec nos propres lecteurs. `test/run.mjs` fait tourner toute la chaîne sur une image synthétique et écrit
les 5 formats ; `test/check.py` les relit avec
[pyembroidery](https://github.com/EmbroidePy/pyembroidery) et vérifie le nombre
de points, les couleurs et la position de chaque point.

```bash
pip install pyembroidery
npm test
```

## Structure

```
index.html, app.html     pages
css/                     style.css (commun + landing), app.css (éditeur)
js/app.js                interface de l'éditeur
js/machines.js           profils machines (Chicago 7, Bernina, Brother…)
manifest.webmanifest, sw.js   application installable / hors ligne
js/core/quantize.js      réduction des couleurs, fond, nettoyage
js/core/trace.js         contours vectoriels (suivi des bords, Chaikin, RDP)
js/core/stitch.js        remplissage tatami, satin, point droit, appliqué, déplacements, assemblage
js/core/satin.js         satin en colonne (squelette) et bordure satin
js/formats/readers.js    lecture DST / EXP / JEF / PES / VP3
js/fabrics.js, photo.js, text.js, projects.js   tissus, retouche, texte, Mes projets
js/core/pipeline.js      enchaînement image -> calques -> points
js/core/threads.js       nuanciers Brother (PEC) et Janome (JEF)
js/core/zip.js           archive ZIP
js/formats/writers.js    écriture DST / PES / JEF / EXP / VP3
assets/                  favicon, image d'exemple
test/                    test de bout en bout
```

Le script Python `../tools/embroidery_trace.py` fait la même chose en ligne de
commande.
