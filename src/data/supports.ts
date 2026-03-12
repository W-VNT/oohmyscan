export const SUPPORTS = [
  {
    id: 'taxi',
    name: 'TAXI MEDIA',
    tagline: 'Le trajet, votre temps de parole.',
    description:
      'Votre message accompagne le passager pendant tout le trajet. 8 à 20 min de contact exclusif, sans compétition.',
    contactDuration: '8 à 20 min',
    network: 'National',
    photo: '/images/supports/taxi.png',
    idealFor: ['Notoriété locale', 'Lancement produit', 'Événement'],
    size: 'large' as const,
  },
  {
    id: 'sac-pain',
    name: "BAG'AD PAIN",
    tagline: 'Votre pub dans les mains de votre cible.',
    description:
      "Le sac de boulangerie est porté dans la rue, visible de tous. Un support du quotidien, porteur d'image.",
    contactDuration: '30 min à 2h',
    network: 'Réseau boulangeries partenaires — National',
    photo: '/images/supports/sac-pain.png',
    idealFor: ['Notoriété de proximité', 'Commerce local'],
    size: 'small' as const,
  },
  {
    id: 'sac-pharma',
    name: "BAG'AD PHARMA",
    tagline: 'Une audience qualifiée, au bon moment.',
    description:
      "La sortie de pharmacie est un moment d'attention. Votre message touche une cible santé dans un contexte de confiance.",
    contactDuration: '20 min à 1h',
    network: 'Réseau pharmacies partenaires — National',
    photo: '/images/supports/sac-pharma.png',
    idealFor: ['Santé', 'Bien-être', 'Para-pharmacie'],
    size: 'small' as const,
  },
  {
    id: 'set-table',
    name: "TABLE'AD",
    tagline: 'À table, votre client lit.',
    description:
      'Le set de table est consulté pendant tout le repas. 30 à 60 minutes de contact dans un moment de détente et de réceptivité maximale.',
    contactDuration: '30 à 60 min',
    network: 'Restaurants, bistrots, cafés, hôtels, cantines — National',
    photo: '/images/supports/set-table.png',
    idealFor: ['Restauration', 'Tourisme', 'Loisirs'],
    size: 'small' as const,
  },
  {
    id: 'sous-bock',
    name: "BOCK'AD",
    tagline: 'Un moment de détente, votre message.',
    description:
      'Présent sur chaque table, le sous-bock est vu et revu pendant toute la consommation. Un support discret, mémorisé.',
    contactDuration: '20 à 45 min',
    network: 'Bars, cafés, brasseries — National',
    photo: '/images/supports/sous-bock.png',
    idealFor: ['Événementiel', 'Boissons', 'Entertainment'],
    size: 'small' as const,
  },
  {
    id: 'affiche-a3',
    name: 'SPOT A3',
    tagline: 'Partout où votre cible passe.',
    description:
      "Vitrines de commerçants, salles d'attente, points de vente — un réseau de diffusion dense et qualifié, au cœur du quotidien.",
    contactDuration: 'Exposition continue 7-14 jours',
    network: "Vitrines, salles d'attente, points de vente — National",
    photo: '/images/supports/affiche-a3.png',
    idealFor: ['Notoriété locale', 'Événement', 'Promotion'],
    size: 'large' as const,
  },
]

export type Support = (typeof SUPPORTS)[number]
