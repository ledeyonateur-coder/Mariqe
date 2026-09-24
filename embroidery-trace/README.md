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

## Pages

- `index.html` — page de présentation (étapes, fonctions, types de points, formats, FAQ).
- `app.html` — l'éditeur.

## Fonctions de l'éditeur

| Étape | Fonctions |
| --- | --- |
| Import | PNG, JPG, SVG, WEBP, GIF, BMP — glisser-déposer, clic ou Ctrl+V ; **recadrage** à l'import (format libre, carré, format du cadre, rotation) et bouton « Recadrer » ; exemple intégré (`app.html?exemple`) |
| Type de broderie | Remplie, **contours seulement** (un contour par couleur) ou contours d'un seul fil (couleur au choix, trait épais en option) |
| Couleurs | 2 à 16 fils (k-means), fond retiré automatiquement (les blancs *intérieurs* restent brodés), nettoyage des îlots, lissage des bords, arrondi et simplification des contours |
| Points | **sélecteur visuel du type de point** pour tout le motif (Auto, Remplissage, Satin, Point droit), puis par calque : **Auto** (satin pour les formes étroites, remplissage pour les surfaces), Remplissage tatami, Satin, Point droit, Ignorer ; angle (ou auto), densité, longueur de point, compensation d'étirement, sous-couche, contour, point triple ; points d'arrêt et coupes de fil automatiques |
| Édition manuelle | pinceau, gomme, pot de peinture, pipette, taille du pinceau, nouveau calque, fusion de calques, suppression, ordre de broderie, couleur libre ou nuancier Brother, masquer ; annuler / rétablir (Ctrl+Z / Ctrl+Maj+Z) |
| Aperçu | vues Image / Couleurs / Vecteurs / Points, zoom et déplacement, rendu réaliste du fil sur la couleur du tissu, sauts affichables, **simulation animée** de la broderie |
| Espacement | **espacement entre les fils** et longueur des points pour tout le motif (puis réglables calque par calque) ; longueur des points du contour en mode contours |
| Fichier | type de fichier au choix (EXP, PES, JEF, DST, VP3), format recommandé selon la machine |
| Taille | largeur / hauteur en mm, cadres 4×4 à 9,5×14, alerte si le motif dépasse, bouton « Ajuster au cadre » |
| Export | **DST, PES, JEF, EXP, VP3**, SVG en calques (Inkscape / Ink/Stitch), PNG d'aperçu, fiche couleurs imprimable (fils Brother + Janome, points, métrage), ZIP de tout |
| Projet | enregistrer / rouvrir un fichier `.filtrace.json` pour reprendre le travail |

Raccourcis : `1`–`4` vues, `H` main, `B` pinceau, `E` gomme, `G` pot, `I` pipette,
`+` / `-` / `0` zoom, espace + glisser pour se déplacer.

## Lancer en local

Les modules ES demandent un petit serveur HTTP (pas de `file://`) :

```bash
cd embroidery-trace
python3 -m http.server 8080   # puis http://localhost:8080
```

## Mise en ligne

C'est un site statique : n'importe quel hébergeur convient. Sur Vercel, créer un
projet sur ce dépôt avec **Root Directory = `embroidery-trace`** et aucun
framework (pas de commande de build).

## Tests

`test/run.mjs` fait tourner toute la chaîne sur une image synthétique et écrit
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
js/core/stitch.js        remplissage tatami, satin, point droit, assemblage machine
js/core/pipeline.js      enchaînement image -> calques -> points
js/core/threads.js       nuanciers Brother (PEC) et Janome (JEF)
js/core/zip.js           archive ZIP
js/formats/writers.js    écriture DST / PES / JEF / EXP / VP3
assets/                  favicon, image d'exemple
test/                    test de bout en bout
```

Le script Python `../tools/embroidery_trace.py` fait la même chose en ligne de
commande.
