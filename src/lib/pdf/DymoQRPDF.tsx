import { Document, Page, View, Image, StyleSheet } from '@react-pdf/renderer'

// Dymo label: 57mm x 32mm (landscape)
// QR code centered, no text

const LABEL_W = 57 // mm → points: 57 * 2.835 ≈ 162
const LABEL_H = 32 // mm → points: 32 * 2.835 ≈ 91
const QR_SIZE = 26 // mm — leaves ~3mm margin top/bottom

const s = StyleSheet.create({
  page: {
    width: LABEL_W * 2.835,
    height: LABEL_H * 2.835,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qr: {
    width: QR_SIZE * 2.835,
    height: QR_SIZE * 2.835,
  },
})

export interface DymoQRPDFProps {
  labels: { qrDataUrl: string }[]
}

export function DymoQRPDF({ labels }: DymoQRPDFProps) {
  return (
    <Document>
      {labels.map((label, i) => (
        <Page key={i} size={{ width: LABEL_W * 2.835, height: LABEL_H * 2.835 }} style={s.page}>
          <View>
            <Image src={label.qrDataUrl} style={s.qr} />
          </View>
        </Page>
      ))}
    </Document>
  )
}
