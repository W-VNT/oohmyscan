/**
 * Mapping code postal francais -> 13 regions actuelles (post-2016)
 * + DROM-COM (Guadeloupe, Martinique, Guyane, La Reunion, Mayotte)
 *
 * Utilise par les rapports de campagne pour grouper les panneaux par region.
 */

export type RegionFR =
  | 'Auvergne-Rhône-Alpes'
  | 'Bourgogne-Franche-Comté'
  | 'Bretagne'
  | 'Centre-Val de Loire'
  | 'Corse'
  | 'Grand Est'
  | 'Hauts-de-France'
  | 'Île-de-France'
  | 'Normandie'
  | 'Nouvelle-Aquitaine'
  | 'Occitanie'
  | 'Pays de la Loire'
  | "Provence-Alpes-Côte d'Azur"
  | 'Guadeloupe'
  | 'Martinique'
  | 'Guyane'
  | 'La Réunion'
  | 'Mayotte'
  | 'Inconnu'

/** Departement (01 - 95 + DROM) -> region. */
const DEPT_TO_REGION: Record<string, RegionFR> = {
  '01': 'Auvergne-Rhône-Alpes',
  '02': 'Hauts-de-France',
  '03': 'Auvergne-Rhône-Alpes',
  '04': "Provence-Alpes-Côte d'Azur",
  '05': "Provence-Alpes-Côte d'Azur",
  '06': "Provence-Alpes-Côte d'Azur",
  '07': 'Auvergne-Rhône-Alpes',
  '08': 'Grand Est',
  '09': 'Occitanie',
  '10': 'Grand Est',
  '11': 'Occitanie',
  '12': 'Occitanie',
  '13': "Provence-Alpes-Côte d'Azur",
  '14': 'Normandie',
  '15': 'Auvergne-Rhône-Alpes',
  '16': 'Nouvelle-Aquitaine',
  '17': 'Nouvelle-Aquitaine',
  '18': 'Centre-Val de Loire',
  '19': 'Nouvelle-Aquitaine',
  '20': 'Corse', // 2A + 2B
  '21': 'Bourgogne-Franche-Comté',
  '22': 'Bretagne',
  '23': 'Nouvelle-Aquitaine',
  '24': 'Nouvelle-Aquitaine',
  '25': 'Bourgogne-Franche-Comté',
  '26': 'Auvergne-Rhône-Alpes',
  '27': 'Normandie',
  '28': 'Centre-Val de Loire',
  '29': 'Bretagne',
  '30': 'Occitanie',
  '31': 'Occitanie',
  '32': 'Occitanie',
  '33': 'Nouvelle-Aquitaine',
  '34': 'Occitanie',
  '35': 'Bretagne',
  '36': 'Centre-Val de Loire',
  '37': 'Centre-Val de Loire',
  '38': 'Auvergne-Rhône-Alpes',
  '39': 'Bourgogne-Franche-Comté',
  '40': 'Nouvelle-Aquitaine',
  '41': 'Centre-Val de Loire',
  '42': 'Auvergne-Rhône-Alpes',
  '43': 'Auvergne-Rhône-Alpes',
  '44': 'Pays de la Loire',
  '45': 'Centre-Val de Loire',
  '46': 'Occitanie',
  '47': 'Nouvelle-Aquitaine',
  '48': 'Occitanie',
  '49': 'Pays de la Loire',
  '50': 'Normandie',
  '51': 'Grand Est',
  '52': 'Grand Est',
  '53': 'Pays de la Loire',
  '54': 'Grand Est',
  '55': 'Grand Est',
  '56': 'Bretagne',
  '57': 'Grand Est',
  '58': 'Bourgogne-Franche-Comté',
  '59': 'Hauts-de-France',
  '60': 'Hauts-de-France',
  '61': 'Normandie',
  '62': 'Hauts-de-France',
  '63': 'Auvergne-Rhône-Alpes',
  '64': 'Nouvelle-Aquitaine',
  '65': 'Occitanie',
  '66': 'Occitanie',
  '67': 'Grand Est',
  '68': 'Grand Est',
  '69': 'Auvergne-Rhône-Alpes',
  '70': 'Bourgogne-Franche-Comté',
  '71': 'Bourgogne-Franche-Comté',
  '72': 'Pays de la Loire',
  '73': 'Auvergne-Rhône-Alpes',
  '74': 'Auvergne-Rhône-Alpes',
  '75': 'Île-de-France',
  '76': 'Normandie',
  '77': 'Île-de-France',
  '78': 'Île-de-France',
  '79': 'Nouvelle-Aquitaine',
  '80': 'Hauts-de-France',
  '81': 'Occitanie',
  '82': 'Occitanie',
  '83': "Provence-Alpes-Côte d'Azur",
  '84': "Provence-Alpes-Côte d'Azur",
  '85': 'Pays de la Loire',
  '86': 'Nouvelle-Aquitaine',
  '87': 'Nouvelle-Aquitaine',
  '88': 'Grand Est',
  '89': 'Bourgogne-Franche-Comté',
  '90': 'Bourgogne-Franche-Comté',
  '91': 'Île-de-France',
  '92': 'Île-de-France',
  '93': 'Île-de-France',
  '94': 'Île-de-France',
  '95': 'Île-de-France',
}

const DROM_TO_REGION: Record<string, RegionFR> = {
  '971': 'Guadeloupe',
  '972': 'Martinique',
  '973': 'Guyane',
  '974': 'La Réunion',
  '976': 'Mayotte',
}

/**
 * Convertit un code postal francais en region.
 * Retourne 'Inconnu' si le format n'est pas reconnu.
 */
export function postalCodeToRegion(postalCode: string | null | undefined): RegionFR {
  if (!postalCode) return 'Inconnu'
  const trimmed = postalCode.trim().replace(/\s/g, '')
  if (trimmed.length < 2) return 'Inconnu'

  // DROM (97x) : on regarde les 3 premiers chiffres
  if (trimmed.startsWith('97')) {
    const code3 = trimmed.slice(0, 3)
    return DROM_TO_REGION[code3] ?? 'Inconnu'
  }

  // Metropole : 2 premiers chiffres = departement
  const dept = trimmed.slice(0, 2)
  return DEPT_TO_REGION[dept] ?? 'Inconnu'
}

/**
 * Extrait un code postal francais (5 chiffres) d'une adresse libre.
 * Ex: "12 rue de la Paix, 75001 Paris" -> "75001"
 * Retourne null si aucun code postal valide trouve.
 */
export function extractPostalFromAddress(address: string | null | undefined): string | null {
  if (!address) return null
  // Code postal francais : 5 chiffres consecutifs. On capture le 1er trouve.
  // (?:\D|^) pour eviter de capturer une partie d'un numero plus long
  const match = address.match(/(?:\D|^)(\d{5})(?:\D|$)/)
  return match ? match[1] : null
}

/**
 * Liste ordonnee des regions FR (ordre alphabetique strict pour stabilite UI).
 */
export const ALL_REGIONS: RegionFR[] = [
  'Auvergne-Rhône-Alpes',
  'Bourgogne-Franche-Comté',
  'Bretagne',
  'Centre-Val de Loire',
  'Corse',
  'Grand Est',
  'Guadeloupe',
  'Guyane',
  'Hauts-de-France',
  'Île-de-France',
  'La Réunion',
  'Martinique',
  'Mayotte',
  'Normandie',
  'Nouvelle-Aquitaine',
  'Occitanie',
  'Pays de la Loire',
  "Provence-Alpes-Côte d'Azur",
]

/**
 * Groupe un tableau d'elements par region (postalCodeToRegion sur le code postal).
 * Les elements sans code postal valide vont dans 'Inconnu'.
 */
export function groupByRegion<T>(
  items: T[],
  getPostalCode: (item: T) => string | null | undefined,
): Map<RegionFR, T[]> {
  const groups = new Map<RegionFR, T[]>()
  for (const item of items) {
    const region = postalCodeToRegion(getPostalCode(item))
    const list = groups.get(region) ?? []
    list.push(item)
    groups.set(region, list)
  }
  return groups
}
