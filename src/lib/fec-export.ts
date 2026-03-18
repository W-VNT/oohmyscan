/**
 * Generate FEC (Fichier des Écritures Comptables) export.
 * Format: tab-separated, UTF-8 with BOM.
 * Standard: Article L47 A-1 du LPF (Livre des procédures fiscales).
 *
 * Accounts used:
 * - 411xxx: Clients (debit TTC on invoice creation)
 * - 706000: Prestations de services (credit HT)
 * - 445710: TVA collectée (credit TVA)
 * - 512000: Banque (debit on payment)
 */

interface FECInvoice {
  invoice_number: string
  issued_at: string
  paid_at: string | null
  status: string
  total_ht: number
  total_tva: number
  total_ttc: number
  client_name: string
  invoice_type: string
}

interface FECPayment {
  invoice_number: string
  payment_date: string
  amount: number
  payment_method: string
  reference: string | null
}

const FEC_HEADERS = [
  'JournalCode',
  'JournalLib',
  'EcritureNum',
  'EcritureDate',
  'CompteNum',
  'CompteLib',
  'CompAuxNum',
  'CompAuxLib',
  'PieceRef',
  'PieceDate',
  'EcritureLib',
  'Debit',
  'Credit',
  'EcritureLet',
  'DateLet',
  'ValidDate',
  'Montantdevise',
  'Idevise',
]

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

function formatAmount(amount: number): string {
  return amount.toFixed(2).replace('.', ',')
}

export function generateFEC(
  invoices: FECInvoice[],
  payments: FECPayment[],
  startDate: string,
  endDate: string,
): string {
  const rows: string[][] = []
  let ecritureNum = 1

  // Sort invoices by date
  const sorted = [...invoices]
    .filter((inv) => inv.status !== 'cancelled' && inv.issued_at >= startDate && inv.issued_at <= endDate)
    .sort((a, b) => a.issued_at.localeCompare(b.issued_at))

  for (const inv of sorted) {
    const num = String(ecritureNum).padStart(6, '0')
    const date = formatDate(inv.issued_at)
    const isAvoir = inv.invoice_type === 'avoir'

    // Line 1: Client debit (TTC)
    rows.push([
      'VE', 'Journal des ventes', num, date,
      '411000', `Client ${inv.client_name}`,
      '', inv.client_name,
      inv.invoice_number, date,
      `Facture ${inv.invoice_number} - ${inv.client_name}`,
      isAvoir ? '' : formatAmount(Math.abs(inv.total_ttc)),
      isAvoir ? formatAmount(Math.abs(inv.total_ttc)) : '',
      '', '', date, '', 'EUR',
    ])

    // Line 2: Revenue credit (HT)
    rows.push([
      'VE', 'Journal des ventes', num, date,
      '706000', 'Prestations de services',
      '', '',
      inv.invoice_number, date,
      `Facture ${inv.invoice_number} - ${inv.client_name}`,
      isAvoir ? formatAmount(Math.abs(inv.total_ht)) : '',
      isAvoir ? '' : formatAmount(Math.abs(inv.total_ht)),
      '', '', date, '', 'EUR',
    ])

    // Line 3: TVA credit
    if (Math.abs(inv.total_tva) > 0) {
      rows.push([
        'VE', 'Journal des ventes', num, date,
        '445710', 'TVA collectée',
        '', '',
        inv.invoice_number, date,
        `TVA Facture ${inv.invoice_number}`,
        isAvoir ? formatAmount(Math.abs(inv.total_tva)) : '',
        isAvoir ? '' : formatAmount(Math.abs(inv.total_tva)),
        '', '', date, '', 'EUR',
      ])
    }

    ecritureNum++
  }

  // Payments → Bank journal
  const sortedPayments = [...payments]
    .filter((p) => p.payment_date >= startDate && p.payment_date <= endDate)
    .sort((a, b) => a.payment_date.localeCompare(b.payment_date))

  for (const pmt of sortedPayments) {
    const num = String(ecritureNum).padStart(6, '0')
    const date = formatDate(pmt.payment_date)

    // Line 1: Bank debit
    rows.push([
      'BQ', 'Journal de banque', num, date,
      '512000', 'Banque',
      '', '',
      pmt.reference ?? pmt.invoice_number, date,
      `Règlement ${pmt.invoice_number}${pmt.reference ? ` (${pmt.reference})` : ''}`,
      formatAmount(pmt.amount),
      '',
      '', '', date, '', 'EUR',
    ])

    // Line 2: Client credit
    rows.push([
      'BQ', 'Journal de banque', num, date,
      '411000', 'Client',
      '', '',
      pmt.invoice_number, date,
      `Règlement ${pmt.invoice_number}`,
      '',
      formatAmount(pmt.amount),
      '', '', date, '', 'EUR',
    ])

    ecritureNum++
  }

  // Build file content
  const header = FEC_HEADERS.join('\t')
  const body = rows.map((r) => r.join('\t')).join('\n')
  return '\uFEFF' + header + '\n' + body
}

export function downloadFEC(content: string, siren: string, year: string) {
  const filename = `${siren}FEC${year}0101.txt`
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
