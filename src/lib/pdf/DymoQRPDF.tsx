import { Document, Page, View, Image, StyleSheet } from '@react-pdf/renderer'

// Dymo 450 label: 36mm x 89mm (landscape)
// QR code centered, no text

const LABEL_W = 89 // mm → points: 89 * 2.835 ≈ 252
const LABEL_H = 36 // mm → points: 36 * 2.835 ≈ 102
const QR_SIZE = 28 // mm — leaves ~4mm margin top/bottom

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
