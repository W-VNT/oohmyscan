import { Document, Page, View, Image } from '@react-pdf/renderer'

// Dymo label: 32mm x 57mm (portrait — orientation natif du driver Dymo
// LabelWriter 450 sur Mac avec papier "Etiquette Stock 57 par 32 mm").
// Conversion 1mm = 2.83465 pt (PostScript standard).
//
// Page : 32 × 57 mm = 90.71 × 161.57 pt
// QR   : 30 × 30 mm = 85.04 × 85.04 pt (laisse 1mm margin horizontal pour
//        ne pas être collé au bord — zone non-imprimable Dymo)

const MM_TO_PT = 2.83465
const PAGE_W_PT = 32 * MM_TO_PT
const PAGE_H_PT = 57 * MM_TO_PT
const QR_PT = 30 * MM_TO_PT

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
              flexDirection: 'column',
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
