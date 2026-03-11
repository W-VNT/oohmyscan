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

export function formatEUR(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export function formatDateFR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
