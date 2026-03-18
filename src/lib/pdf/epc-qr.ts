/**
 * Generate an EPC QR Code (European Payments Council) for SEPA Credit Transfer.
 * Standard: EPC069-12 v2.1
 * Scannable by most European banking apps to pre-fill a wire transfer.
 */
import QRCode from 'qrcode'

interface EPCParams {
  /** Beneficiary name (max 70 chars) */
  name: string
  /** IBAN (no spaces) */
  iban: string
  /** BIC/SWIFT (8 or 11 chars, optional for SEPA zone) */
  bic?: string
  /** Amount in EUR */
  amount: number
  /** Unstructured remittance info (max 140 chars) — e.g. invoice number */
  reference: string
}

/**
 * Generate EPC QR code as base64 data URL (PNG).
 * Returns null if IBAN is missing or amount is 0.
 */
export async function generateEPCQR(params: EPCParams): Promise<string | null> {
  if (!params.iban || params.amount <= 0) return null

  const cleanIban = params.iban.replace(/\s/g, '')
  const cleanBic = params.bic?.replace(/\s/g, '') ?? ''
  const amountStr = `EUR${params.amount.toFixed(2)}`

  // EPC QR Code data format (line-separated)
  const lines = [
    'BCD',                          // Service Tag
    '002',                          // Version
    '1',                            // Character set (UTF-8)
    'SCT',                          // Identification (SEPA Credit Transfer)
    cleanBic,                       // BIC (can be empty)
    params.name.slice(0, 70),       // Beneficiary name
    cleanIban,                      // IBAN
    amountStr,                      // Amount
    '',                             // Purpose (empty)
    '',                             // Structured reference (empty)
    params.reference.slice(0, 140), // Unstructured remittance info
    '',                             // Beneficiary to originator info
  ]

  const data = lines.join('\n')

  try {
    return await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 140,
      color: { dark: '#000000', light: '#FFFFFF' },
    })
  } catch {
    return null
  }
}
