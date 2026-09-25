// Réglages selon le tissu : espacement, compensation d'étirement, sous-couche
// et longueur de point adaptés, plus un conseil de stabilisateur.

export const FABRICS = {
  coton: {
    label: "Coton, toile, lin",
    spacing: 0.4,
    pullComp: 0.2,
    underlay: true,
    stitchLength: 3,
    tip: "Stabilisateur à déchirer sous le tissu.",
  },
  jean: {
    label: "Jean, toile épaisse",
    spacing: 0.4,
    pullComp: 0.15,
    underlay: true,
    stitchLength: 3.5,
    tip: "Aiguille jean 90/14, stabilisateur à déchirer.",
  },
  tshirt: {
    label: "T-shirt, jersey (extensible)",
    spacing: 0.45,
    pullComp: 0.35,
    underlay: true,
    stitchLength: 2.5,
    tip: "Stabilisateur à découper (thermocollant), aiguille pointe bille 75/11. Ne pas tendre le tissu dans le cadre.",
  },
  eponge: {
    label: "Serviette éponge, polaire",
    spacing: 0.35,
    pullComp: 0.25,
    underlay: true,
    stitchLength: 3,
    tip: "Film soluble à l'eau par-dessus pour que les points ne s'enfoncent pas dans les boucles.",
  },
  casquette: {
    label: "Casquette, sac, cuir fin",
    spacing: 0.4,
    pullComp: 0.3,
    underlay: true,
    stitchLength: 3,
    tip: "Stabilisateur épais ; évitez les motifs trop denses sur le cuir (les trous restent).",
  },
  fin: {
    label: "Tissu fin (soie, voile)",
    spacing: 0.55,
    pullComp: 0.15,
    underlay: false,
    stitchLength: 2.5,
    tip: "Stabilisateur soluble ou très léger ; motif léger, peu dense, pour éviter les fronces.",
  },
};
