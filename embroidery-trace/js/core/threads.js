// Nuanciers de fils des machines (repris de pyembroidery) et recherche
// de la couleur de fil la plus proche.

// Brother (PEC / PES) — l'index 0 n'existe pas.
export const PEC_THREADS = [null,["0E1F7C","Prussian Blue"],["0A55A3","Blue"],["008777","Teal Green"],["4B6BAF","Cornflower Blue"],["ED171F","Red"],["D15C00","Reddish Brown"],["913697","Magenta"],["E49ACB","Light Lilac"],["915FAC","Lilac"],["9ED67D","Mint Green"],["E8A900","Deep Gold"],["FEBA35","Orange"],["FFFF00","Yellow"],["70BC1F","Lime Green"],["BA9800","Brass"],["A8A8A8","Silver"],["7D6F00","Russet Brown"],["FFFFB3","Cream Brown"],["4F5556","Pewter"],["000000","Black"],["0B3D91","Ultramarine"],["770176","Royal Purple"],["293133","Dark Gray"],["2A1301","Dark Brown"],["F64A8A","Deep Rose"],["B27624","Light Brown"],["FCBBC5","Salmon Pink"],["FE370F","Vermilion"],["F0F0F0","White"],["6A1C8A","Violet"],["A8DDC4","Seacrest"],["2584BB","Sky Blue"],["FEB343","Pumpkin"],["FFF36B","Cream Yellow"],["D0A660","Khaki"],["D15400","Clay Brown"],["66BA49","Leaf Green"],["134A46","Peacock Blue"],["878787","Gray"],["D8CCC6","Warm Gray"],["435607","Dark Olive"],["FDD9DE","Flesh Pink"],["F993BC","Pink"],["003822","Deep Green"],["B2AFD4","Lavender"],["686AB0","Wisteria Violet"],["EFE3B9","Beige"],["F73866","Carmine"],["B54B64","Amber Red"],["132B1A","Olive Green"],["C70156","Dark Fuchsia"],["FE9E32","Tangerine"],["A8DEEB","Light Blue"],["00673E","Emerald Green"],["4E2990","Purple"],["2F7E20","Moss Green"],["FFCCCC","Flesh Pink"],["FFD911","Harvest Gold"],["095BA6","Electric Blue"],["F0F970","Lemon Yellow"],["E3F35B","Fresh Green"],["FF9900","Orange"],["FFF08D","Cream Yellow"],["FFC8C8","Applique"]];

// Janome (JEF) — l'index 0 n'existe pas.
export const JEF_THREADS = [null,["000000","Black"],["FFFFFF","White"],["FFFF17","Yellow"],["FF6600","Orange"],["2F5933","Olive Green"],["237336","Green"],["65C2C8","Sky"],["AB5A96","Purple"],["F669A0","Pink"],["FF0000","Red"],["B1704E","Brown"],["0B2F84","Blue"],["E4C35D","Gold"],["481A05","Dark Brown"],["AC9CC7","Pale Violet"],["FCF294","Pale Yellow"],["F999B7","Pale Pink"],["FAB381","Peach"],["C9A480","Beige"],["970533","Wine Red"],["A0B8CC","Pale Sky"],["7FC21C","Yellow Green"],["E5E5E5","Silver Gray"],["889B9B","Gray"],["98D6BD","Pale Aqua"],["B2E1E3","Baby Blue"],["368BA0","Powder Blue"],["4F83AB","Bright Blue"],["386A91","Slate Blue"],["071650","Navy Blue"],["F999A2","Salmon Pink"],["F9676B","Coral"],["E3311F","Burnt Orange"],["E2A188","Cinnamon"],["B59474","Umber"],["E4CF99","Blond"],["FFCB00","Sunflower"],["E1ADD4","Orchid Pink"],["C3007E","Peony Purple"],["80004B","Burgundy"],["540571","Royal Purple"],["B10525","Cardinal Red"],["CAE0C0","Opal Green"],["899856","Moss Green"],["5C941A","Meadow Green"],["003114","Dark Green"],["5DAE94","Aquamarine"],["4CBF8F","Emerald Green"],["007772","Peacock Green"],["595B61","Dark Gray"],["FFFFF2","Ivory White"],["B15818","Hazel"],["CB8A07","Toast"],["986C80","Salmon"],["98692D","Cocoa Brown"],["4D3419","Sienna"],["4C330B","Sepia"],["33200A","Dark Sepia"],["523A97","Violet Blue"],["0D217E","Blue Ink"],["1E77AC","Sola Blue"],["B2DD53","Green Dust"],["F33689","Crimson"],["DE649E","Floral Pink"],["984161","Wine"],["4C5612","Olive Drab"],["4C881F","Meadow"],["E4DE79","Mustard"],["CB8A1A","Yellow Ocher"],["CBA21C","Old Gold"],["FF9805","Honey Dew"],["FCB257","Tangerine"],["FFE505","Canary Yellow"],["F0331F","Vermilion"],["1A842D","Bright Green"],["386CAE","Ocean Blue"],["E3C4B4","Beige Gray"],["E3AC81","Bamboo"]];

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

// Distance "redmean", identique à pyembroidery.
function redmean(c1, c2) {
  const rm = (c1[0] + c2[0]) / 2;
  const r = c1[0] - c2[0];
  const g = c1[1] - c2[1];
  const b = c1[2] - c2[2];
  return (((512 + rm) * r * r) >> 8) + 4 * g * g + (((767 - rm) * b * b) >> 8);
}

/** Index du fil le plus proche dans un nuancier (en excluant éventuellement un index). */
export function nearestThreadIndex(hex, table, exclude = -1) {
  const c = hexToRgb(hex);
  let bi = 1;
  let bd = Infinity;
  for (let i = 1; i < table.length; i++) {
    if (!table[i] || i === exclude) continue;
    const d = redmean(c, hexToRgb(table[i][0]));
    if (d < bd) (bd = d), (bi = i);
  }
  return bi;
}

/** Nom lisible du fil Brother le plus proche (pour la fiche couleurs). */
export function nearestThreadName(hex) {
  const i = nearestThreadIndex(hex, PEC_THREADS);
  return { brand: "Brother", index: i, name: PEC_THREADS[i][1], hex: "#" + PEC_THREADS[i][0] };
}
// Husqvarna Viking (HUS) — référence et nom.
export const HUS_THREADS = [["000000","Black","026"],["0000E7","Blue","005"],["00C600","Green","002"],["FF0000","Red","014"],["840084","Purple","008"],["FFFF00","Yellow","020"],["848484","Grey","024"],["8484E7","Light Blue","006"],["00FF84","Light Green","003"],["FF7B31","Orange","017"],["FF8CA5","Pink","011"],["845200","Brown","028"],["FFFFFF","White","022"],["000084","Dark Blue","004"],["008400","Dark Green","001"],["7B0000","Dark Red","013"],["FF6384","Light Red","015"],["522952","Dark Purple","007"],["FF00FF","Light Purple","009"],["FFDE00","Dark Yellow","019"],["FFFF9C","Light Yellow","021"],["525252","Dark Grey","025"],["D6D6D6","Light Grey","023"],["FF5208","Dark Orange","016"],["FF9C5A","Light Orange","018"],["FF52B5","Dark Pink","010"],["FFC6DE","Light Pink","012"],["523100","Dark Brown","027"],["B5A584","Light Brown","029"]];

/** Nuanciers proposés dans l'éditeur. Chaque entrée : [hex, nom, référence]. */
export const THREAD_CHARTS = {
  brother: { label: "Brother", threads: PEC_THREADS.slice(1).map((t, i) => [t[0], t[1], String(i + 1)]) },
  janome: { label: "Janome", threads: JEF_THREADS.slice(1).map((t, i) => [t[0], t[1], String(i + 1)]) },
  husqvarna: { label: "Husqvarna Viking", threads: HUS_THREADS },
};

/** Fil le plus proche dans un nuancier : {hex, name, ref}. */
export function nearestInChart(hex, chartKey) {
  const list = THREAD_CHARTS[chartKey].threads;
  const c = hexToRgb(hex);
  let best = list[0];
  let bd = Infinity;
  for (const t of list) {
    const d = redmean(c, hexToRgb(t[0]));
    if (d < bd) (bd = d), (best = t);
  }
  return { hex: "#" + best[0], name: best[1], ref: best[2] };
}
