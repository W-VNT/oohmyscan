/**
 * Context React pour la couleur de marque du rapport campagne.
 *
 * Utilise pour theming dynamique du rapport (badge, wave, accents).
 * Toutes les SlideViews lisent la couleur via useBrandColor() au lieu d'importer
 * la constante BRAND_RED.
 *
 * Pour le PDF, la couleur est passee en parametre explicite (pas via context).
 */

import { createContext, useContext, type ReactNode } from 'react'
import { BRAND_RED, deriveBrandPalette } from './report-brand'

interface BrandPalette {
  /** Couleur principale. */
  red: string
  /** Variante claire derivee (~55% blanc). Utilisee pour l'ombre du badge. */
  redLight: string
  /** Variante tres claire derivee (~85% blanc). Background subtil de section. */
  redPale: string
}

const BrandColorContext = createContext<BrandPalette>(deriveBrandPalette(BRAND_RED))

export function BrandColorProvider({
  color,
  children,
}: {
  color: string
  children: ReactNode
}) {
  const palette = deriveBrandPalette(color)
  return <BrandColorContext.Provider value={palette}>{children}</BrandColorContext.Provider>
}

export function useBrandColor(): BrandPalette {
  return useContext(BrandColorContext)
}
