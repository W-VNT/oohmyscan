export type TvaGroup = {
  rate: number
  baseHT: number
  montantTVA: number
  totalTTC: number
}

export type DocumentLine = {
  description: string
  quantity: number
  unit: string
  unit_price: number
  tva_rate: number
  discount_type?: 'percent' | 'amount' | null
  discount_value?: number
  total_ht: number
}

export function computeTvaGroups(lines: DocumentLine[]): TvaGroup[] {
  const groups = new Map<number, number>()

  for (const line of lines) {
    const ht = line.quantity * line.unit_price
    groups.set(line.tva_rate, (groups.get(line.tva_rate) ?? 0) + ht)
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b - a)
    .map(([rate, baseHT]) => {
      const montantTVA = rate === 0 ? 0 : baseHT * (rate / 100)
      return {
        rate,
        baseHT: Math.round(baseHT * 100) / 100,
        montantTVA: Math.round(montantTVA * 100) / 100,
        totalTTC: Math.round((baseHT + montantTVA) * 100) / 100,
      }
    })
}

export function computeTotals(lines: DocumentLine[]) {
  const groups = computeTvaGroups(lines)
  const totalHT = groups.reduce((sum, g) => sum + g.baseHT, 0)
  const totalTVA = groups.reduce((sum, g) => sum + g.montantTVA, 0)
  return {
    totalHT: Math.round(totalHT * 100) / 100,
    totalTVA: Math.round(totalTVA * 100) / 100,
    totalTTC: Math.round((totalHT + totalTVA) * 100) / 100,
    groups,
  }
}

export function formatEUR(amount: number, _currency = 'EUR'): string {
  // Format number without currency symbol (symbol added manually in PDF)
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const CURRENCY_SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF' }
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency
}

export function formatDateFR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateLongFR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
