// src/data/familles.ts
// Source de verite unique — modifier ici, jamais dans les composants

export interface Produit {
  name: string
  detail: string
}

export interface FamilleStat {
  value: string
  label: string
}

export interface Famille {
  id: string
  numero: string
  name: string
  tagline: string
  description: string
  photo: string
  terrainPhotos: string[]
  produits: Produit[]
  stats: FamilleStat[]
  references: string[]
}

export const FAMILLES: Famille[] = [
  {
    id: 'diffusion-sur-mesure',
    numero: '01',
    name: 'DIFFUSION SUR-MESURE',
    tagline: 'Partout ou votre cible passe.',
    description:
      "Contact one-to-one des l'entree du commerce. Repetition garantie sur vitrine, porte d'entree, comptoir. Le seul media qui touche les 34 970 communes francaises.",
    photo: '/images/supports/affiche-a3.png',
    terrainPhotos: [
      '/images/terrain/placeholder-1.jpg',
      '/images/terrain/placeholder-2.jpg',
      '/images/terrain/placeholder-3.jpg',
    ],
    produits: [
      { name: 'Affiches A3', detail: 'Format standard, pose rapide en vitrine' },
      { name: 'Vitrophanies', detail: 'Adhesif vitrine, impact visuel fort' },
      { name: 'Presentoirs flyers', detail: 'Point de contact comptoir' },
      { name: 'PLV', detail: 'Dispositif 3D en point de vente' },
    ],
    stats: [
      { value: '34 970', label: 'communes francaises' },
      { value: '7-14j', label: "duree d'exposition" },
    ],
    references: ['VISA', 'Land Rover', 'SNCF'],
  },
  {
    id: 'medias-tactiques',
    numero: '02',
    name: 'MEDIAS TACTIQUES',
    tagline: 'A table, en boulangerie — il reste.',
    description:
      "Supports que le consommateur tient en main ou regarde pendant de longues minutes. Memorisation jusqu'a 75%. Le moment captif par excellence.",
    photo: '/images/supports/sac-pain.png',
    terrainPhotos: [
      '/images/terrain/placeholder-1.jpg',
      '/images/terrain/placeholder-2.jpg',
      '/images/terrain/placeholder-3.jpg',
    ],
    produits: [
      { name: 'Sacs a pain', detail: '15 millions de clients par jour' },
      { name: 'Sacs a pharmacie', detail: 'Audience sante, percu informatif' },
      { name: 'Sous-bocks', detail: '20 a 45 min de consommation' },
      { name: 'Sets de table', detail: '30 a 60 min de lecture captive' },
    ],
    stats: [
      { value: '15M', label: 'clients/jour sacs a pain' },
      { value: '75%', label: 'memorisation' },
      { value: '60 min', label: 'contact moyen' },
    ],
    references: ['Nutella', 'Haribo', 'BFM', 'Credit Agricole', 'MACIF'],
  },
  {
    id: 'reseaux-affichage',
    numero: '03',
    name: "RESEAUX D'AFFICHAGE",
    tagline: 'Centre-ville, balneaire, mobilite — partout.',
    description:
      "Trois reseaux complementaires pour une presence maximale. Du pieton urbain au vacancier, en passant par le voyageur en taxi.",
    photo: '/images/supports/taxi.png',
    terrainPhotos: [
      '/images/terrain/placeholder-1.jpg',
      '/images/terrain/placeholder-2.jpg',
      '/images/terrain/placeholder-3.jpg',
    ],
    produits: [
      {
        name: 'Reseau VILLE (PromoPieton)',
        detail: '20 000 faces · hyper centre-ville · devantures commerces · reporting mytraffic',
      },
      {
        name: 'Reseau ESTIVAL',
        detail: '710 campings · 5 040 panneaux · 100M ODV/14 jours · littoral francais',
      },
      {
        name: 'Taxis / VTC',
        detail: '80+ agglomerations · 25+ pays · 4 formats · 17M ODV/mois',
      },
    ],
    stats: [
      { value: '20 000', label: 'faces reseau VILLE' },
      { value: '710', label: 'campings reseau ESTIVAL' },
      { value: '100M', label: 'ODV en 14 jours' },
      { value: '80+', label: 'agglos taxis/VTC' },
    ],
    references: ['Aldi', 'Disney+', 'Puy du Fou', 'Fujifilm'],
  },
  {
    id: 'animation-terrain',
    numero: '04',
    name: 'ANIMATION TERRAIN',
    tagline: 'Le contact humain qui marque.',
    description:
      "Contact direct avec votre cible dans la rue, aux endroits strategiques. L'experientiel qui cree le souvenir et genere l'engagement.",
    photo: '/images/supports/hero.png', // placeholder — a remplacer par animation.png
    terrainPhotos: [
      '/images/terrain/placeholder-1.jpg',
      '/images/terrain/placeholder-2.jpg',
      '/images/terrain/placeholder-3.jpg',
    ],
    produits: [
      { name: 'Distribution hotesses/hotes', detail: 'Sampling, flyers, roadshow, pop-up' },
      { name: 'Affichage velo', detail: 'Visibilite mobile urbaine, zones pietonnes' },
    ],
    stats: [{ value: '100%', label: 'contact humain direct' }],
    references: ['Pasquier', 'Milka', "Cote d'Or", 'Tiffany & Co'],
  },
]

// Digital traite separement dans DigitalSection.tsx
export const DIGITAL = {
  sms: {
    title: 'SMS / RCS & DATA',
    tagline: 'Dans la poche de vos clients, instantanement.',
    features: [
      '100% RGPD — donnees hebergees en France',
      'Ciblage : age, sexe, localisation',
      'SMS · RCS enrichi · Base DATA ciblee',
    ],
    pricing: [
      { volume: '5 000 SMS', price: '999€ HT' },
      { volume: '10 000 SMS', price: '1 700€ HT' },
      { volume: '30 000 SMS', price: '4 999€ HT' },
    ],
  },
  display: {
    title: 'DISPLAY MOBILE',
    tagline: "2,1 milliards d'impressions/jour sur 18 000 apps francaises.",
    features: [
      'Taux de clic x4 vs Google Ads',
      "Ciblage geolocalise, socio-demo, centres d'interets",
      'IA + 4 millions de POI',
      "Jusqu'a 20 expositions/habitant/jour",
    ],
    pricing: null,
  },
}

// Options pour le select du formulaire contact
export const FAMILLE_OPTIONS = [
  { value: 'diffusion-sur-mesure', label: 'Diffusion sur-mesure' },
  { value: 'medias-tactiques', label: 'Medias tactiques' },
  { value: 'reseaux-affichage', label: "Reseaux d'affichage" },
  { value: 'animation-terrain', label: 'Animation terrain' },
  { value: 'digital', label: 'Digital (SMS/RCS ou Display)' },
  { value: 'multiple', label: 'Plusieurs familles / Je ne sais pas encore' },
]
