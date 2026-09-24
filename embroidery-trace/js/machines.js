// Profils de machines : format de fichier, cadres disponibles et contraintes.

export const MACHINES = {
  chicago7: {
    label: "bernette Chicago 7",
    format: "exp",
    hoops: ["110x170", "100x100", "40x40"],
    trims: false, // pas de coupe-fil automatique
    shortName: true, // noms courts (8 caractères) pour la clé USB
    usb: "Copiez le fichier .EXP à la racine d'une clé USB (FAT32), branchez-la sur la Chicago 7 et choisissez le motif dans le menu USB. La machine s'arrête à chaque changement de couleur : suivez la fiche couleurs.",
  },
  bernina: {
    label: "Bernina (série 5/7/8)",
    format: "exp",
    hoops: ["100x130", "145x255", "150x400", "210x400", "260x400"],
    trims: true,
    shortName: false,
    usb: "Copiez le fichier .EXP sur une clé USB et ouvrez-le depuis la machine ou BERNINA ArtLink.",
  },
  brother: {
    label: "Brother / Baby Lock / bernette b70-b79",
    format: "pes",
    hoops: ["100x100", "130x180", "160x260", "200x300", "240x360"],
    usb: "Copiez le fichier .PES sur une clé USB et ouvrez-le depuis l'écran de broderie.",
  },
  janome: {
    label: "Janome / Elna",
    format: "jef",
    hoops: ["126x110", "140x200", "200x200", "200x280"],
    usb: "Copiez le fichier .JEF sur une clé USB (dossier EMB/Embf si votre modèle l'exige).",
  },
  pfaff: {
    label: "Pfaff / Husqvarna Viking",
    format: "vp3",
    hoops: ["120x115", "150x240", "200x260", "360x200"],
    usb: "Copiez le fichier .VP3 sur une clé USB et ouvrez-le depuis la machine.",
  },
  pro: {
    label: "Machine professionnelle (Tajima, Ricoma…)",
    format: "dst",
    hoops: ["100x100", "130x180", "200x200", "240x360", "360x500"],
    usb: "Copiez le fichier .DST sur une clé USB. Les couleurs se règlent sur la machine.",
  },
};

export const DEFAULT_MACHINE = "chicago7";

/** Nom de fichier accepté par la machine. */
export function machineFileName(machine, name) {
  const m = MACHINES[machine];
  if (m?.shortName) {
    const base = name.normalize("NFD").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8) || "MOTIF";
    return `${base}.${m.format.toUpperCase()}`;
  }
  return `${name}.${m ? m.format : "dst"}`;
}
