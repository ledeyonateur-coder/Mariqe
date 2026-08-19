// ============================================================================
// SITE CONFIG — point d'entrée unique de la marque.
// Pour créer un nouveau site avec la même base, copie ce fichier (ou passe
// une config différente à <App configOverride={...}/>) : couleurs, polices,
// textes, navigation, produits et sections de page sont tous pilotés d'ici.
// Aucun composant ne contient de texte ou de couleur codé en dur.
// ============================================================================

export const siteConfig = {
  // ---- Identité de marque -------------------------------------------------
  brand: {
    name: 'Soleil',
    tagline: 'Vêtements upcyclés — capsule faite main',
    showLogoDot: true,
  },

  // ---- Système de design ---------------------------------------------------
  theme: {
    colors: {
      primary: '#8098DD', // pervenche
      primaryDeep: '#5F76BE',
      gold: '#C9A44C',
      terracotta: '#C1633C',
      indigo: '#51617A',
      sable: '#E4D9C4',
      ecru: '#F5F1E8',
      paper: '#FBF7EF',
      ink: '#2B2621',
      inkSoft: '#5C5348',
    },
    fonts: {
      display: "'Fredoka', 'Arial Rounded MT Bold', sans-serif",
      body: "'Fraunces', Georgia, serif",
      mono: "'IBM Plex Mono', 'Courier New', monospace",
      googleFontsUrl:
        'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Fraunces:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap',
    },
    // Motifs de fond réutilisables (cartes produit, visuel de fiche produit)
    textures: {
      patchwork: {
        type: 'patchwork',
        base: 'sable',
        accent: 'terracotta',
      },
      sherpa: {
        type: 'dots',
        base: 'ecru',
        dot: 'sable',
      },
      denim: {
        type: 'stripes',
        colors: ['#3E4C6B', '#566A90', '#46567A'],
        base: '#4A5A7C',
      },
      feston: {
        type: 'scallop',
        base: 'sable',
        edge: 'ink',
      },
    },
  },

  // ---- Navigation -----------------------------------------------------------
  nav: [
    { label: 'Accueil', path: '/' },
    { label: 'Boutique', path: '/boutique' },
    { label: 'Notre histoire', path: '/histoire' },
    { label: 'Contact', path: '/contact' },
  ],

  // ---- Page d'accueil : composée d'une liste de sections ordonnable --------
  home: {
    hero: {
      eyebrow: 'Vêtements upcyclés — capsule faite main',
      words: [
        { emphasis: false },
      ],
      manifesto:
        "Des vêtements qui ont déjà vécu une vie, et qui commencent la tienne. Rider méditerranéen × artisanat japonais, upcycling intégral, fabrication 100% main.",
      ctas: [
        { label: 'Découvrir la boutique', to: '/boutique', variant: 'primary' },
        { label: 'Notre histoire', to: '/histoire', variant: 'outline' },
      ],
    },
    sections: [
      { type: 'wave', color: 'primary' },
      {
        type: 'featured',
        number: '01',
        title: 'Pièces phares',
        count: 3,
      },
      { type: 'wave', color: 'terracotta' },
      {
        type: 'steps',
        number: '02',
        title: 'Comment on fabrique',
        items: [
          { badge: '01 · SOURCING', title: 'On chine', text: "Brocantes, dépôts-vente, recycleries — chaque tissu a déjà une histoire avant de rejoindre l'atelier." },
          { badge: '02 · TRI', title: 'On trie', text: 'Par grammage et par nuance, pour que chaque pièce garde un tombé homogène malgré des sources différentes.' },
          { badge: '03 · FABRICATION', title: 'On coud', text: 'Patchwork, sashiko, point de feston — à la main ou à la machine, toujours en petite série.' },
          { badge: '04 · SIGNATURE', title: 'On numérote', text: "Chaque pièce reçoit une référence unique. Il n'en existera jamais deux identiques." },
        ],
      },
      {
        type: 'newsletter',
        title: 'Les nouvelles pièces, avant tout le monde',
        text: "Une pièce est unique — une fois partie, elle ne revient pas. On te prévient dès qu'une nouvelle capsule arrive.",
        placeholder: 'ton@email.com',
        buttonLabel: "S'inscrire",
        confirmMessage: 'Merci, à bientôt ✦',
      },
    ],
  },

  // ---- Boutique ---------------------------------------------------------
  shop: {
    eyebrow: 'La boutique',
    title: 'Chaque pièce, un seul exemplaire',
    lede: "Rien n'est réimprimé, rien n'est réédité. Ce que tu vois est ce qui existe.",
    waveColor: 'gold',
    filters: [
      { label: 'Tout', value: 'all' },
      { label: 'Gilets', value: 'gilets' },
      { label: 'Pulls', value: 'pulls' },
      { label: 'Jeans', value: 'jeans' },
      { label: 'Chemises', value: 'chemises' },
    ],
  },

  // ---- Catalogue produits ----------------------------------------------
  products: [
    {
      id: 'riviera',
      name: 'Gilet Riviera',
      type: 'Gilet',
      filter: 'gilets',
      price: '145€',
      ref: 'SOLEIL-001',
      texture: 'patchwork',
      icon: 'gilet',
      iconStroke: 'ink',
      badge: 'pièce unique',
      description:
        "Sans manches, coupe droite oversize, encolure montante. Assemblé à partir de plusieurs polaires chinées — la répartition des couleurs varie d'un exemplaire à l'autre.",
      specs: [
        { label: 'Matière', value: 'Polaire / sherpa upcyclée (pulls et plaids de seconde main)' },
        { label: 'Taille', value: 'XS – XXL' },
        { label: 'Construction', value: 'Patchwork cousu, liseré en biais contrastant, tampon-hanko brodé main' },
      ],
      availability: 'pièce unique, 1 exemplaire disponible',
    },
    {
      id: 'mistral',
      name: 'Pull Mistral',
      type: 'Pull',
      filter: 'pulls',
      price: '135€',
      ref: 'SOLEIL-002',
      texture: 'sherpa',
      icon: 'pull',
      iconStroke: 'ink',
      badge: 'pièce unique',
      description:
        "Col montant, épaule tombée, manches amples. Le bloc-couleur du buste change selon le tissu trouvé en atelier — trois zones, une infinité de combinaisons.",
      specs: [
        { label: 'Matière', value: 'Polaire / laine bouclette upcyclée, doublure coton récupérée' },
        { label: 'Taille', value: 'XS – XXL' },
        { label: 'Construction', value: 'Col montant doublé, plastron boutons-pression, écusson brodé main' },
      ],
      availability: 'pièce unique, 1 exemplaire disponible',
    },
    {
      id: 'calanque',
      name: 'Jean Calanque',
      type: 'Jean',
      filter: 'jeans',
      price: '165€',
      ref: 'SOLEIL-003',
      texture: 'denim',
      icon: 'jean',
      iconStroke: 'paper',
      badge: 'pièce unique',
      description:
        "Coupe baggy, taille haute, jambe large. L'indigo varie légèrement d'un jean source à l'autre — la preuve qu'il a déjà eu une vie avant la tienne.",
      specs: [
        { label: 'Matière', value: 'Denim 100% upcyclé, jeans de seconde main réassemblés' },
        { label: 'Taille', value: '34 – 48' },
        { label: 'Construction', value: 'Coutures de reprise surpiquées façon sashiko, ourlet brut non fini' },
      ],
      availability: 'pièce unique, 1 exemplaire disponible',
    },
    {
      id: 'embruns',
      name: 'Chemise Embruns',
      type: 'Chemise',
      filter: 'chemises',
      price: '95€',
      ref: 'SOLEIL-004',
      texture: 'feston',
      icon: 'chemise',
      iconStroke: 'ink',
      badge: 'pièce unique',
      description:
        "Oversize, manches courtes, appliqués cousus main. Les fleurs sont découpées dans les plus belles chutes du mois — jamais deux chemises identiques.",
      specs: [
        { label: 'Matière', value: 'Coton / lin upcyclé, appliqués en chutes contrastantes' },
        { label: 'Taille', value: 'XS – XXL' },
        { label: 'Construction', value: 'Appliqué floral graphique, poche plaquée, finitions au point de feston' },
      ],
      availability: 'pièce unique, 1 exemplaire disponible',
    },
  ],

  // ---- Page "Notre histoire" ---------------------------------------------
  story: {
    eyebrow: 'Notre histoire',
    title: 'Pourquoi Soleil existe',
    waveColor: 'indigo',
    paragraphs: [
      "Soleil est née d'un mélange qui n'aurait pas dû fonctionner : l'énergie d'un rider méditerranéen, planche sous le bras, peau salée par la mer — et la patience d'un atelier japonais, où une pièce de tissu abîmée devient un motif plutôt qu'un déchet.",
      "On ne fabrique rien de neuf. Chaque vêtement part d'un tissu qui a déjà vécu : un plaid de brocante, une chemise oubliée, un jean qui traînait dans un dépôt-vente. On trie, on assemble, on coud à la main — patchwork, sashiko, point de feston — et on numérote. Une pièce, un numéro, une seule fois.",
      "Ce n'est pas une contrainte écologique déguisée en argument marketing. C'est un vrai choix esthétique : on préfère l'irrégularité d'un tissu chiné à la perfection d'un tissu neuf.",
    ],
    tags: [
      { label: '100% upcyclé', accent: true },
      { label: 'tissu chiné ou français', accent: false },
      { label: 'fabrication main', accent: true },
      { label: 'pièce numérotée', accent: false },
      { label: 'jamais deux identiques', accent: true },
    ],
  },

  // ---- Contact ------------------------------------------------------------
  contact: {
    eyebrow: 'Contact',
    title: 'Une question, une pièce sur-mesure ?',
    waveColor: 'primary',
    fields: [
      { name: 'nom', label: 'Nom', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'message', label: 'Message', type: 'textarea', required: true },
    ],
    submitLabel: 'Envoyer',
    confirmMessage:
      "Merci ! (Ce formulaire est un aperçu de design — connecte-le à ton service d'emailing pour qu'il fonctionne réellement.)",
    side: {
      heading: 'Atelier',
      text: 'Sur rendez-vous — adresse à venir.<br>Réponse sous quelques jours.',
      socialHeading: 'Suivre Soleil',
      social: [
        { label: 'Instagram', href: '#' },
        { label: 'Pinterest', href: '#' },
      ],
    },
  },

  // ---- Pied de page -------------------------------------------------------
  footer: {
    tagline: 'Soleil — vêtements upcyclés, faits à la main',
    waveColor: 'terracotta',
    credit: "Site de démonstration — planche d'inspiration convertie en maquette fonctionnelle.",
  },
};

export default siteConfig;
