import { Document, Page, View, Image } from '@react-pdf/renderer'

// Dymo label 30334 (Multi-purpose) : 57mm × 32mm
//
// Direction physique du papier :
// - Largeur du rouleau (perpendiculaire au feed) : 57mm
// - Longueur de feed (sens d'impression)         : 32mm
//
// → PDF page = 57 wide × 32 tall (landscape)
// → Mac print dialog : Orientation Paysage, Auto-rotation décochée
//
// QR carré 30mm centré (1mm margin top/bottom · 13.5mm margin left/right)

const MM_TO_PT = 2.83465
const PAGE_W_PT = 57 * MM_TO_PT  // ≈ 161.6 pt
const PAGE_H_PT = 32 * MM_TO_PT  // ≈ 90.7 pt
const QR_PT = 30 * MM_TO_PT      // ≈ 85.0 pt

export interface DymoQRPDFProps {
  labels: { qrDataUrl: string }[]
}

export function DymoQRPDF({ labels }: DymoQRPDFProps) {
  return (
    <Document>
      {labels.map((label, i) => (
        <Page
          key={i}
          size={{ width: PAGE_W_PT, height: PAGE_H_PT }}
          style={{ padding: 0, margin: 0 }}
        >
          <View
            style={{
              width: PAGE_W_PT,
              height: PAGE_H_PT,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image src={label.qrDataUrl} style={{ width: QR_PT, height: QR_PT }} />
          </View>
        </Page>
      ))}
    </Document>
  )
}
