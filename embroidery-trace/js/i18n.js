// Version anglaise de l'éditeur : traduit le texte affiché (y compris ce que
// le code ajoute ensuite) à partir d'un dictionnaire français -> anglais.
// Langue : ?lang=en, bouton EN/FR, ou langue du navigateur.

const DICT = {
  "Éditeur — FilTrace": "Editor — FilTrace",
  "Accueil FilTrace": "FilTrace home",
  "Aucune image": "No image",
  "Afficher plus ou moins de réglages": "Show more or fewer settings",
  "Mode avancé": "Advanced mode",
  "Mode simple": "Simple mode",
  "Afficher tous les réglages": "Show all settings",
  "N'afficher que l'essentiel": "Show only the essentials",
  "Visite guidée": "Guided tour",
  "Mode sombre / clair": "Dark / light mode",
  "Passer en mode clair": "Switch to light mode",
  "Passer en mode sombre": "Switch to dark mode",
  "Annuler (Ctrl+Z)": "Undo (Ctrl+Z)",
  "Rétablir (Ctrl+Maj+Z)": "Redo (Ctrl+Shift+Z)",
  "Mes projets enregistrés": "My saved projects",
  "Mes projets": "My projects",
  "Enregistrer dans Mes projets": "Save to My projects",
  Enregistrer: "Save",
  "Exporter…": "Export…",
  "⬇ Fichier machine": "⬇ Machine file",
  "En 3 étapes": "In 3 steps",
  "Choisis une image": "Pick an image",
  "ou un modèle ci-dessous": "or a template below",
  "Choisis la taille": "Choose the size",
  "sous l'aperçu": "under the preview",
  Télécharge: "Download",
  "le fichier pour ta machine": "the file for your machine",
  Image: "Image",
  "Glissez une image ici": "Drop an image here",
  "ou cliquez — PNG, JPG, SVG, WEBP": "or click — PNG, JPG, SVG, WEBP",
  "(vous pouvez aussi coller avec Ctrl+V)": "(you can also paste with Ctrl+V)",
  "✂ Recadrer": "✂ Crop",
  Modèles: "Templates",
  "Ajouter un prénom, un mot…": "Add a name, a word…",
  "Aa Texte": "Aa Text",
  "Ouvrir un fichier DST, EXP, JEF, PES ou VP3 pour le voir, le redimensionner ou le convertir": "Open a DST, EXP, JEF, PES or VP3 file to view, resize or convert it",
  "Fichier broderie": "Embroidery file",
  "Retouche photo": "Photo adjustments",
  Luminosité: "Brightness",
  Contraste: "Contrast",
  Saturation: "Saturation",
  "Annuler les retouches": "Reset adjustments",
  Couleurs: "Colours",
  "Type de broderie": "Embroidery style",
  "Remplie (couleurs pleines)": "Filled (solid colours)",
  "Contours (chaque couleur)": "Outlines (each colour)",
  "Contours (un seul fil)": "Outlines (one thread)",
  "Dessin au trait (pour les photos)": "Line drawing (for photos)",
  Tissu: "Fabric",
  "Type de point (tout le motif)": "Stitch type (whole design)",
  "Type de point": "Stitch type",
  "Satin pour les formes fines, remplissage pour les surfaces": "Satin for thin shapes, fill for large areas",
  Auto: "Auto",
  "Satin + remplissage": "Satin + fill",
  "Rangs parallèles, pour les grandes surfaces": "Parallel rows, for large areas",
  Remplissage: "Fill",
  "Tatami, surfaces": "Tatami, areas",
  "Zigzag brillant d'un bord à l'autre, pour lettres et bordures": "Shiny zigzag from edge to edge, for letters and borders",
  Satin: "Satin",
  "Lettres, bordures": "Letters, borders",
  "Une ligne de points le long des contours": "A line of stitches along the outlines",
  "Point droit": "Running stitch",
  "Lignes, détails": "Lines, details",
  "Un morceau de tissu cousu, puis bordé de satin": "A piece of fabric stitched down, then bordered with satin",
  Appliqué: "Appliqué",
  "Tissu + bordure": "Fabric + border",
  Ignorer: "Skip",
  "Réglable ensuite couleur par couleur dans « Calques de fil ».": "Can then be set colour by colour in “Thread layers”.",
  "Types différents selon les couleurs (voir « Calques de fil »). Choisissez-en un pour tout le motif.": "Different types per colour (see “Thread layers”). Pick one for the whole design.",
  "Espacement entre les fils (mm)": "Thread spacing (mm)",
  "Serré : couvrant, plus de points. Espacé : plus léger et plus rapide.": "Tight: better coverage, more stitches. Wide: lighter and faster.",
  "Longueur des points (mm)": "Stitch length (mm)",
  "Couleur du fil": "Thread colour",
  "Trait épais (point triple)": "Thick line (triple stitch)",
  "Nombre de couleurs": "Number of colours",
  "Retirer le fond": "Remove background",
  "Nettoyage des petits détails": "Clean up small details",
  "Lissage des bords": "Edge smoothing",
  "Vectorisation avancée": "Advanced vectorization",
  "Arrondi des courbes": "Curve smoothing",
  Simplification: "Simplification",
  "Taille & cadre": "Size & hoop",
  "Largeur (mm)": "Width (mm)",
  "Hauteur (mm)": "Height (mm)",
  "Ma machine": "My machine",
  Cadre: "Hoop",
  Aucun: "None",
  "Nuancier de fils": "Thread chart",
  "Type de fichier": "File type",
  "Ajuster au cadre": "Fit to hoop",
  Vecteurs: "Vectors",
  Points: "Stitches",
  "Déplacer (H)": "Pan (H)",
  "Pinceau : peindre avec le calque sélectionné (B)": "Brush: paint with the selected layer (B)",
  "Gomme : retirer de la broderie (E)": "Eraser: remove from the embroidery (E)",
  "Pot : recolorer une zone entière (G)": "Bucket: recolour a whole area (G)",
  "Pipette : sélectionner le calque sous le curseur (I)": "Picker: select the layer under the cursor (I)",
  "Déplacer un calque (texte, forme) au doigt ou à la souris (M)": "Move a layer (text, shape) with your finger or mouse (M)",
  "Baguette : retirer toute une zone de la broderie, ex. un fond (W)": "Wand: remove a whole area, e.g. a background (W)",
  "Taille du pinceau": "Brush size",
  "Comparer l'image et la broderie": "Compare the image and the embroidery",
  "◧ Avant / après": "◧ Before / after",
  Dézoomer: "Zoom out",
  Ajuster: "Fit",
  Zoomer: "Zoom in",
  "Importez une image pour commencer": "Import an image to get started",
  "Logos, dessins, textes : les images aux couleurs franches et aux contours nets donnent les meilleurs résultats.": "Logos, drawings, text: images with flat colours and sharp edges give the best results.",
  "Calcul…": "Working…",
  Taille: "Size",
  "Taille rapide (côté le plus long)": "Quick size (longest side)",
  "Max cadre": "Max hoop",
  "Taille du côté le plus long (mm)": "Longest side (mm)",
  "Simuler la broderie": "Simulate the embroidery",
  "▶ Simuler": "▶ Simulate",
  "❚❚ Pause": "❚❚ Pause",
  "Avancement de la simulation": "Simulation progress",
  Vitesse: "Speed",
  Lent: "Slow",
  Normal: "Normal",
  Rapide: "Fast",
  Sauts: "Jumps",
  "Couleur du tissu": "Fabric colour",
  "Ordre des fils, étape par étape": "Thread order, step by step",
  "🧵 Guide": "🧵 Guide",
  "Calques de fil": "Thread layers",
  "Ajouter un calque à peindre": "Add a layer to paint",
  "+ Calque": "+ Layer",
  "Ordre de broderie de haut en bas. Choisissez le type de point de chaque couleur.": "Stitch order from top to bottom. Choose the stitch type of each colour.",
  "Exporter le motif": "Export the design",
  Fermer: "Close",
  "Nom du motif": "Design name",
  "Tous les formats machine": "All machine formats",
  "Autres fichiers": "Other files",
  "Calques vectoriels (Inkscape / Ink/Stitch)": "Vector layers (Inkscape / Ink/Stitch)",
  "Aperçu réaliste des points": "Realistic stitch preview",
  Fiche: "Sheet",
  "Ordre des fils à imprimer": "Printable thread order",
  "Tous les formats d'un coup": "All formats at once",
  "Partager avec la communauté": "Share with the community",
  "Publiez gratuitement ce motif dans la": "Publish this design for free in the",
  galerie: "gallery",
  "pour que d'autres puissent le broder.": "so others can stitch it.",
  "Votre prénom ou pseudo (facultatif)": "Your name or nickname (optional)",
  "J'ai créé ce motif ou j'ai le droit de le partager.": "I made this design or I have the right to share it.",
  "Partager dans la galerie": "Share in the gallery",
  "Voir la galerie": "See the gallery",
  "Recadrer l'image": "Crop the image",
  Annuler: "Cancel",
  "Faites glisser le cadre ou ses poignées. Gardez seulement la partie à broder.": "Drag the frame or its handles. Keep only the part to embroider.",
  "Format du recadrage": "Crop ratio",
  "Format libre": "Free",
  "Format du cadre": "Hoop ratio",
  Carré: "Square",
  "↻ Pivoter": "↻ Rotate",
  "Tout sélectionner": "Select all",
  "Garder toute l'image": "Keep the whole image",
  "Valider le recadrage": "Apply crop",
  "Ajouter du texte": "Add text",
  "Texte (plusieurs lignes possibles)": "Text (several lines allowed)",
  Prénom: "Name",
  Police: "Font",
  "Hauteur des lettres (mm)": "Letter height (mm)",
  Position: "Position",
  "Sous le motif": "Below the design",
  "Au-dessus du motif": "Above the design",
  "Au centre": "In the centre",
  "Les lettres de moins de 5 mm de haut se brodent mal. Les lettres fines passent en satin automatiquement.": "Letters under 5 mm tall stitch poorly. Thin letters automatically use satin.",
  "Nouveau motif texte seul": "New text-only design",
  "Ajouter au motif": "Add to the design",
  "Enregistrés dans ce navigateur, sur cet appareil. Utilisez « Télécharger » pour les garder ailleurs.": "Saved in this browser, on this device. Use “Download” to keep them elsewhere.",
  "Synchroniser entre appareils": "Sync between devices",
  "Un code personnel pour retrouver vos projets sur votre téléphone et votre ordinateur. Les projets sont chiffrés avec ce code : personne d'autre ne peut les lire. Gardez-le précieusement.": "A personal code to find your projects on your phone and your computer. Projects are encrypted with this code: nobody else can read them. Keep it safe.",
  "Créer mon code": "Create my code",
  "ou saisissez votre code": "or enter your code",
  Utiliser: "Use",
  Copier: "Copy",
  "Envoyer mes projets": "Upload my projects",
  "Récupérer mes projets": "Get my projects",
  "Oublier le code ici": "Forget the code here",
  "Importer un fichier projet": "Import a project file",
  Ouvrir: "Open",
  Télécharger: "Download",
  Supprimer: "Delete",
  "Confirmer la suppression": "Confirm deletion",
  "Guide de broderie": "Stitching guide",
  "← Étape précédente": "← Previous step",
  "Étape suivante →": "Next step →",
  Voir: "Show",
  "Changez de fil.": "Change thread.",
  "Même fil : la machine s'arrête seulement.": "Same thread: the machine only stops.",
  Sections: "Sections",
  Aperçu: "Preview",
  Réglages: "Settings",
  Calques: "Layers",
  Fichier: "File",
  "Modèles prêts à broder": "Ready-to-stitch templates",
  "Choisissez un motif pour essayer, puis changez les couleurs ou ajoutez un prénom.": "Pick a design to try, then change the colours or add a name.",
  "Mes bobines": "My threads",
  "Cochez les fils que vous avez. Les couleurs du motif seront remplacées par votre bobine la plus proche.": "Tick the threads you own. The design colours will be replaced by your closest thread.",
  "N'utiliser que mes bobines (aussi pour les prochaines images)": "Only use my threads (also for next images)",
  "Appliquer au motif": "Apply to the design",
  Passer: "Skip",
  Suivant: "Next",
  Terminer: "Finish",
  Résumé: "Summary",
  "Coupes de fil": "Thread trims",
  "Fil utilisé": "Thread used",
  "Durée estimée": "Estimated time",
  "Angle (°)": "Angle (°)",
  auto: "auto",
  "Densité (mm)": "Density (mm)",
  "Long. de point (mm)": "Stitch length (mm)",
  "Compensation (mm)": "Pull compensation (mm)",
  "Sous-couche": "Underlay",
  Contour: "Outline",
  "Point triple": "Triple stitch",
  "— choisir un fil —": "— pick a thread —",
  "Fusionner avec": "Merge with",
  "— calque —": "— layer —",
  "↑ Monter": "↑ Up",
  "↓ Descendre": "↓ Down",
  "non brodé": "not stitched",
  Texte: "Text",
  "Mettre à jour le texte": "Update text",
  "Pour le déplacer : outil ✥ puis glissez le texte sur l'aperçu.": "To move it: ✥ tool, then drag the text on the preview.",
  "Sélectionner pour peindre": "Select to paint",
  "Type de point — Auto : satin pour les formes fines, remplissage pour les surfaces": "Stitch type — Auto: satin for thin shapes, fill for areas",
  Masquer: "Hide",
  Afficher: "Show",
  "✓ Aucun problème détecté.": "✓ No problem found.",
  "Aucun projet pour l'instant. Utilisez « Enregistrer » en haut de l'éditeur.": "No project yet. Use “Save” at the top of the editor.",
  "Code copié.": "Code copied.",
  "Récupération…": "Downloading…",
  "Envoi…": "Uploading…",
  "Cochez la case pour confirmer que vous pouvez partager ce motif.": "Tick the box to confirm you can share this design.",
  "Brodez la ligne de placement, puis posez le morceau de tissu dessus pour la recouvrir.": "Stitch the placement line, then lay the fabric piece over it.",
  "La machine fixe le tissu. Retirez le cadre sans démonter et découpez le tissu au ras de la couture.": "The machine tacks the fabric down. Remove the hoop without unhooping and trim the fabric close to the stitches.",
  "Bordure satin : elle recouvre le bord coupé du tissu.": "Satin border: it covers the cut edge of the fabric.",
  // Tissus
  "Coton, toile, lin": "Cotton, canvas, linen",
  "Jean, toile épaisse": "Denim, heavy canvas",
  "T-shirt, jersey (extensible)": "T-shirt, jersey (stretchy)",
  "Serviette éponge, polaire": "Towel, fleece",
  "Casquette, sac, cuir fin": "Cap, bag, thin leather",
  "Tissu fin (soie, voile)": "Thin fabric (silk, voile)",
  "Stabilisateur à déchirer sous le tissu.": "Tear-away stabilizer under the fabric.",
  "Aiguille jean 90/14, stabilisateur à déchirer.": "Denim needle 90/14, tear-away stabilizer.",
  "Stabilisateur à découper (thermocollant), aiguille pointe bille 75/11. Ne pas tendre le tissu dans le cadre.": "Cut-away (iron-on) stabilizer, ballpoint needle 75/11. Don't stretch the fabric in the hoop.",
  "Film soluble à l'eau par-dessus pour que les points ne s'enfoncent pas dans les boucles.": "Water-soluble topping so stitches don't sink into the loops.",
  "Stabilisateur épais ; évitez les motifs trop denses sur le cuir (les trous restent).": "Heavy stabilizer; avoid dense designs on leather (holes stay).",
  "Stabilisateur soluble ou très léger ; motif léger, peu dense, pour éviter les fronces.": "Wash-away or very light stabilizer; light, sparse design to avoid puckering.",
  // Visite guidée
  "Commencez ici : importez une image (photo, logo, dessin), ou choisissez un de nos modèles.": "Start here: import an image (photo, logo, drawing), or pick one of our templates.",
  "Ajoutez un prénom ou un mot, dans la police et à la hauteur de votre choix.": "Add a name or a word, in the font and height you want.",
  "Choisissez votre machine : le bon format de fichier et les bons cadres sont réglés pour vous.": "Pick your machine: the right file format and hoops are set for you.",
  "Choisissez la taille de la broderie. Elle passe en rouge si elle ne rentre pas dans le cadre.": "Choose the embroidery size. It turns red if it doesn't fit the hoop.",
  "Téléchargez le fichier et copiez-le sur la clé USB de votre machine.": "Download the file and copy it to your machine's USB stick.",
  "Besoin de plus de réglages (types de points, densité, retouches) ? Passez en mode avancé.": "Need more settings (stitch types, density, adjustments)? Switch to advanced mode.",
  // Modèles
  Cœur: "Heart",
  Étoile: "Star",
  Fleur: "Flower",
  "Badge montagne": "Mountain badge",
  Patte: "Paw",
  Ancre: "Anchor",
  Couronne: "Crown",
  Éclair: "Lightning",
  "Arc-en-ciel": "Rainbow",
  // Machines
  "Machine professionnelle (Tajima, Ricoma…)": "Professional machine (Tajima, Ricoma…)",
  "Copiez le fichier .EXP à la racine d'une clé USB (FAT32), branchez-la sur la Chicago 7 et choisissez le motif dans le menu USB. La machine s'arrête à chaque changement de couleur : suivez la fiche couleurs.": "Copy the .EXP file to the root of a USB stick (FAT32), plug it into the Chicago 7 and pick the design from the USB menu. The machine stops at each colour change: follow the colour sheet.",
  "Tajima, Barudan, machines pro": "Tajima, Barudan, pro machines",
  "Copiez le fichier .EXP sur une clé USB et ouvrez-le depuis la machine ou BERNINA ArtLink.": "Copy the .EXP file to a USB stick and open it from the machine or BERNINA ArtLink.",
  "Copiez le fichier .PES sur une clé USB et ouvrez-le depuis l'écran de broderie.": "Copy the .PES file to a USB stick and open it from the embroidery screen.",
  "Copiez le fichier .JEF sur une clé USB (dossier EMB/Embf si votre modèle l'exige).": "Copy the .JEF file to a USB stick (EMB/Embf folder if your model requires it).",
  "Copiez le fichier .VP3 sur une clé USB et ouvrez-le depuis la machine.": "Copy the .VP3 file to a USB stick and open it from the machine.",
  "Copiez le fichier .DST sur une clé USB. Les couleurs se règlent sur la machine.": "Copy the .DST file to a USB stick. Colours are set on the machine.",
  "Bernina (série 5/7/8)": "Bernina (5/7/8 series)",
  // Polices
  "Anton (bâton épais)": "Anton (bold sans)",
  "Bebas Neue (majuscules)": "Bebas Neue (capitals)",
  "Archivo Black (gras)": "Archivo Black (bold)",
  "Roboto Slab (empattements)": "Roboto Slab (serif)",
  "Lobster (rétro)": "Lobster (retro)",
  "Pacifico (script)": "Pacifico (script)",
  "Dancing Script (manuscrit)": "Dancing Script (handwritten)",
  "Arial Black (système)": "Arial Black (system)",
  "Georgia (système)": "Georgia (system)",
  // Canevas
  Broderie: "Embroidery",
};

// Textes avec des nombres ou des noms : [expression, remplacement].
const RULES = [
  [/^Cadre (\d+) × (\d+) mm$/, "Hoop $1 × $2 mm"],
  [/^✓ Le motif \((.+)\) rentre dans le cadre\.$/, "✓ The design ($1) fits the hoop."],
  [/^⚠ (.+) ne rentre pas dans le cadre (.+)\.$/, "⚠ $1 doesn't fit the $2 hoop."],
  [/^(.+) pts$/, "$1 st."],
  [/^Mes bobines \((\d+)\)$/, "My threads ($1)"],
  [/^(\d+) bobine\(s\) cochée\(s\)$/, "$1 thread(s) ticked"],
  [/^⬇ Fichier \.(\w+)$/, "⬇ .$1 file"],
  [/^Télécharger pour (.+)$/, "Download for $1"],
  [/^⬇ Télécharger pour (.+) \(\.(\w+)\)$/, "⬇ Download for $1 (.$2)"],
  [/^⬇ Télécharger pour (.+) \(\.(\w+) dans un \.zip\)$/, "⬇ Download for $1 (.$2 in a .zip)"],
  [/^Fil du nuancier (.+)$/, "$1 thread chart"],
  [/^(.+) — \.(\w+) \(recommandé\)$/, "$1 — .$2 (recommended)"],
  [/^(.+) — \.(\w+)$/, (m, name, ext) => `${translate(name)} — .${ext}`],
  [/^(.+) points · (\d+) couleur\(s\) · (.+) mm(.*)$/, "$1 stitches · $2 colour(s) · $3 mm$4"],
  [/^ · ⚠ plus grand que le cadre choisi$/, " · ⚠ larger than the chosen hoop"],
  [/^(.+) · (.+) points(.*)$/, (m, a, b, rest) => `${a} · ${b} stitches${rest.replace(/ · (\d+) fil\(s\) à couper/, " · $1 thread(s) to trim")}`],
  [/^(\d+) étape\(s\) de fil pour (.+)\. (.*)$/, (m, n, mach, rest) => `${n} thread step(s) for ${mach}. ${translate(rest)}`],
  [/^Votre machine ne coupe pas le fil toute seule : coupez les fils de saut à la fin de chaque couleur\. Touchez une étape pour voir ce qui est brodé jusque-là\.$/, "Your machine doesn't trim threads: cut jump threads at the end of each colour. Tap a step to see what is stitched so far."],
  [/^Touchez une étape pour voir ce qui est brodé jusque-là\.$/, "Tap a step to see what is stitched so far."],
  [/^≈ (.+) min$/, "≈ $1 min"],
  [/^« (.+) » enregistré dans Mes projets\.$/, "“$1” saved to My projects."],
  [/^(.+) ouvert : (.+) points\. Redimensionnez-le ou exportez-le dans un autre format\.$/, "$1 opened: $2 stitches. Resize it or export it to another format."],
  [/^(.+) enregistré\.$/, "$1 saved."],
  [/^(.+) enregistré : décompressez-le pour obtenir (.+)\.$/, "$1 saved: unzip it to get $2."],
  [/^✓ (\d+) projet\(s\) envoyé\(s\)\.$/, "✓ $1 project(s) uploaded."],
  [/^✓ (\d+) projet\(s\) récupéré\(s\)\.$/, "✓ $1 project(s) downloaded."],
  [/^Envoi… (\d+) \/ (\d+)$/, "Uploading… $1 / $2"],
  [/^Envoi de (\d+) projet\(s\)…$/, "Uploading $1 project(s)…"],
  [/^(.+)… (\d+) %$/, (m, label, n) => `${translate(label)}… ${n} %`],
  [/^Analyse des couleurs$/, "Analysing colours"],
  [/^Vectorisation$/, "Vectorizing"],
  [/^Calcul des points$/, "Computing stitches"],
  [/^⚠ (\d+) point\(s\) de plus de 8 mm : (.+)$/, "⚠ $1 stitch(es) longer than 8 mm: they may snag. Shorten the stitch length or use fill for this area."],
  [/^⚠ (\d+) zone\(s\) très dense\(s\) (.+)$/, "⚠ $1 very dense area(s) (overlapping colours or spacing too tight): the thread may break. Increase the spacing or remove a hidden colour."],
  [/^ℹ (.+) points : broderie longue (.+)$/, "ℹ $1 stitches: long embroidery (over an hour and a half). Reduce the size or use outlines."],
  [/^⚠ Le motif dépasse le cadre choisi : (.+)$/, "⚠ The design is larger than the chosen hoop: use “Max hoop” under the preview."],
  [/^⚠ Texte « (.+) » : lettres de moins de 5 mm(.+)$/, "⚠ Text “$1”: letters under 5 mm stitch poorly. Make it bigger."],
  [/^Le motif est plus grand que le cadre : (.+)$/, "The design is larger than the hoop: tap “Fit to hoop” before downloading."],
];

export const lang = (() => {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "en" || q === "fr") {
    try {
      localStorage.setItem("filtrace.lang", q);
    } catch {}
    return q;
  }
  try {
    const saved = localStorage.getItem("filtrace.lang");
    if (saved) return saved;
  } catch {}
  return (navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en";
})();

/** Traduit un texte (inchangé en français ou s'il est inconnu). */
export function translate(text) {
  if (lang !== "en" || !text) return text;
  const lead = text.match(/^\s*/)[0];
  const trail = text.match(/\s*$/)[0];
  const core = text.trim();
  if (!core) return text;
  if (DICT[core]) return lead + DICT[core] + trail;
  for (const [re, rep] of RULES) {
    if (re.test(core)) return lead + core.replace(re, rep) + trail;
  }
  return text;
}
export const t = translate;

const ATTRS = ["title", "placeholder", "aria-label"];
function translateTree(root) {
  if (root.nodeType === 3) {
    const v = translate(root.nodeValue);
    if (v !== root.nodeValue) root.nodeValue = v;
    return;
  }
  if (root.nodeType !== 1 || root.closest?.("[data-no-i18n]")) return;
  for (const a of ATTRS) {
    if (root.hasAttribute?.(a)) {
      const v = translate(root.getAttribute(a));
      if (v !== root.getAttribute(a)) root.setAttribute(a, v);
    }
  }
  if (root.tagName === "SCRIPT" || root.tagName === "STYLE" || root.tagName === "TEXTAREA") return;
  for (const child of root.childNodes) translateTree(child);
}

/** Active la traduction de la page (et de tout ce qui sera ajouté ensuite). */
export function startI18n() {
  document.documentElement.lang = lang;
  if (lang !== "en") return;
  document.title = translate(document.title);
  translateTree(document.body);
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "characterData") translateTree(m.target);
      else if (m.type === "attributes") translateTree(m.target);
      else m.addedNodes.forEach(translateTree);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

export function switchLang() {
  try {
    localStorage.setItem("filtrace.lang", lang === "en" ? "fr" : "en");
  } catch {}
  const u = new URL(location.href);
  u.searchParams.delete("lang");
  location.href = u.toString();
}
