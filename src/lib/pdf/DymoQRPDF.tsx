import { Document, Page, View, Image, Text, StyleSheet } from '@react-pdf/renderer'

// Dymo 450 label: 89mm x 36mm (landscape)
// QR code centered + petit code lisible sous le QR pour traçabilité

const MM_TO_PT = 2.835
const LABEL_W = 89  // mm
const LABEL_H = 36  // mm
const QR_SIZE = 26  // mm (réduit de 28 → 26 pour laisser place au code)

const s = StyleSheet.create({
  page: {
    width: LABEL_W * MM_TO_PT,
    height: LABEL_H * MM_TO_PT,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  qr: {
    width: QR_SIZE * MM_TO_PT,
    height: QR_SIZE * MM_TO_PT,
  },
  code: {
    marginTop: 1.5 * MM_TO_PT,
    fontSize: 8,
    fontFamily: 'Courier',
    letterSpacing: 0.5,
    color: '#000000',
  },
})

export interface DymoQRPDFProps {
  labels: { qrDataUrl: string; code: string }[]
}

export function DymoQRPDF({ labels }: DymoQRPDFProps) {
  return (
    <Document>
      {labels.map((label, i) => (
        <Page key={i} size={{ width: LABEL_W * MM_TO_PT, height: LABEL_H * MM_TO_PT }} style={s.page}>
          <View style={{ alignItems: 'center' }}>
            <Image src={label.qrDataUrl} style={s.qr} />
            <Text style={s.code}>{label.code}</Text>
          </View>
        </Page>
      ))}
    </Document>
  )
}
