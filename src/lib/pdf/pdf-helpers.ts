export type TvaGroup = {
  rate: number
  code: string // A, B, C...
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

/** Map tva_rate index to letter code (A=20%, B=10%, C=5.5%, D=0%) */
const TVA_CODE_MAP: Record<number, string> = { 20: 'A', 10: 'B', 5.5: 'C', 0: 'D' }
let nextCode = 0

export function computeTvaGroups(lines: DocumentLine[]): TvaGroup[] {
  const groups = new Map<number, number>()

  for (const line of lines) {
    const ht = line.quantity * line.unit_price
    groups.set(line.tva_rate, (groups.get(line.tva_rate) ?? 0) + ht)
  }

  // Reset dynamic code counter
  nextCode = 0
  const usedCodes = new Set<string>()

  return Array.from(groups.entries())
    .sort(([a], [b]) => b - a)
    .map(([rate, baseHT]) => {
      let code = TVA_CODE_MAP[rate]
      if (!code || usedCodes.has(code)) {
        // Fallback for custom rates
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        while (usedCodes.has(letters[nextCode])) nextCode++
        code = letters[nextCode] ?? '?'
      }
      usedCodes.add(code)

      const montantTVA = rate === 0 ? 0 : baseHT * (rate / 100)
      return {
        rate,
        code,
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

/** Get TVA code letter for a given rate, based on computed groups */
export function getTvaCode(rate: number, groups: TvaGroup[]): string {
  return groups.find((g) => g.rate === rate)?.code ?? '?'
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
