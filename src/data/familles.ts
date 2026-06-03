// src/data/familles.ts
// Source de vérité unique — modifier ici, jamais dans les composants

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
    tagline: 'Partout où votre cible passe.',
    description:
      "Contact one-to-one dès l'entrée du commerce. Répétition garantie sur vitrine, porte d'entrée, comptoir. Le seul média qui touche les 34 970 communes françaises.",
    photo: '/images/supports/affiche-a3.jpg',
    terrainPhotos: [
      '/images/terrain/puy-du-fou.jpg',
      '/images/terrain/futuroscope.jpg',
      '/images/terrain/visa-vitrine.jpg',
      '/images/terrain/orange.jpg',
    ],
    produits: [
      { name: 'Affiches A3', detail: 'Format standard, pose rapide en vitrine' },
      { name: 'Vitrophanies', detail: 'Adhésif vitrine, impact visuel fort' },
      { name: 'Présentoirs flyers', detail: 'Point de contact comptoir' },
      { name: 'PLV', detail: 'Dispositif 3D en point de vente' },
    ],
    stats: [
      { value: '34 970', label: 'communes françaises' },
      { value: '7-14j', label: "durée d'exposition" },
    ],
    references: ['Puy du Fou', 'Futuroscope', 'Visa', 'Orange'],
  },
  {
    id: 'medias-tactiques',
    numero: '02',
    name: 'MÉDIAS TACTIQUES',
    tagline: 'À table, en boulangerie — il reste.',
    description:
      "Supports que le consommateur tient en main ou regarde pendant de longues minutes. Mémorisation jusqu'à 75%. Le moment captif par excellence.",
    photo: '/images/supports/sac-pain.jpg',
    terrainPhotos: [
      '/images/terrain/bonne-maman.jpg',
      '/images/terrain/credit-agricole.jpg',
      '/images/terrain/sncf.jpg',
      '/images/terrain/uber.jpg',
    ],
    produits: [
      { name: 'Sacs à pain', detail: '15 millions de clients par jour' },
      { name: 'Sacs à pharmacie', detail: 'Audience santé, perçu informatif' },
      { name: 'Sous-bocks', detail: '20 à 45 min de consommation' },
      { name: 'Sets de table', detail: '30 à 60 min de lecture captive' },
    ],
    stats: [
      { value: '15M', label: 'clients/jour sacs à pain' },
      { value: '75%', label: 'mémorisation' },
      { value: '60 min', label: 'contact moyen' },
    ],
    references: ['Bonne Maman', 'Crédit Agricole', 'SNCF', 'Uber'],
  },
  {
    id: 'reseaux-affichage',
    numero: '03',
    name: "RÉSEAUX D'AFFICHAGE",
    tagline: 'Centre-ville, balnéaire, mobilité — partout.',
    description:
      "Trois réseaux complémentaires pour une présence maximale. Du piéton urbain au vacancier, en passant par le voyageur en taxi.",
    photo: '/images/supports/taxi.jpg',
    terrainPhotos: [
      '/images/terrain/turkish-airlines.jpg',
      '/images/terrain/airbus.jpg',
      '/images/terrain/hard-rock.jpg',
      '/images/terrain/visa.jpg',
    ],
    produits: [
      {
        name: 'Réseau VILLE (PromoPiéton)',
        detail: '20 000 faces · hyper centre-ville · devantures commerces · reporting Mytraffic',
      },
      {
        name: 'Réseau ESTIVAL',
        detail: '710 campings · 5 040 panneaux · 100M ODV/14 jours · littoral français',
      },
      {
        name: 'Taxis / VTC',
        detail: '80+ agglomérations · 25+ pays · 4 formats · 17M ODV/mois',
      },
    ],
    stats: [
      { value: '20 000', label: 'faces réseau VILLE' },
      { value: '710', label: 'campings réseau ESTIVAL' },
      { value: '100M', label: 'ODV en 14 jours' },
      { value: '80+', label: 'agglos taxis/VTC' },
    ],
    references: ['Turkish Airlines', 'Airbus', 'Visa', 'Hard Rock Café'],
  },
  {
    id: 'animation-terrain',
    numero: '04',
    name: 'ANIMATION TERRAIN',
    tagline: 'Le contact humain qui marque.',
    description:
      "Contact direct avec votre cible dans la rue, aux endroits stratégiques. L'expérientiel qui crée le souvenir et génère l'engagement.",
    photo: '/images/supports/hero.jpg', // placeholder — à remplacer par animation.png
    terrainPhotos: [
      '/images/terrain/pasquier.jpg',
      '/images/terrain/darty.jpg',
      '/images/terrain/tiffany.jpg',
    ],
    produits: [
      { name: 'Distribution hôtesses/hôtes', detail: 'Sampling, flyers, roadshow, pop-up' },
      { name: 'Affichage vélo', detail: 'Visibilité mobile urbaine, zones piétonnes' },
    ],
    stats: [{ value: '100%', label: 'contact humain direct' }],
    references: ['Pasquier', 'Darty', 'Tiffany & Co'],
  },
]

// Digital traité séparément dans DigitalSection.tsx
export const DIGITAL = {
  sms: {
    title: 'SMS / RCS & DATA',
    tagline: 'Le canal le plus direct vers vos clients.',
    intro:
      '92% des SMS sont lus dans les 4 minutes — aucun autre média ne fait mieux.',
    features: [
      '95% des Français équipés d\'un mobile',
      'Taux de clic > 4% · désabonnement < 0,3%',
      'Ciblage : âge, sexe, géolocalisation précise',
      '100% RGPD — données hébergées en France',
    ],
    priceFrom: 'À partir de 5 000 SMS',
  },
  display: {
    title: 'DISPLAY MOBILE',
    tagline: 'Le bon message, au bon moment, sur les meilleures apps.',
    intro:
      "2,1 milliards d'impressions/jour sur 18 000 apps françaises premium.",
    features: [
      'Taux de clic x4 vs Google Ads',
      "Ciblage géolocalisé · socio-démo · centres d'intérêt",
      'IA + 4 millions de POI activables',
      "Jusqu'à 20 expositions/habitant/jour",
    ],
    priceFrom: 'Tarification sur-mesure',
  },
}

// Options pour le select du formulaire contact
export const FAMILLE_OPTIONS = [
  { value: 'diffusion-sur-mesure', label: 'Diffusion sur-mesure' },
  { value: 'medias-tactiques', label: 'Médias tactiques' },
  { value: 'reseaux-affichage', label: "Réseaux d'affichage" },
  { value: 'animation-terrain', label: 'Animation terrain' },
  { value: 'digital', label: 'Digital (SMS/RCS ou Display)' },
  { value: 'multiple', label: 'Plusieurs familles / Je ne sais pas encore' },
]
