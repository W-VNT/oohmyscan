import { Document, Page, View, Image, Text, StyleSheet } from '@react-pdf/renderer'

// Dymo 450 label: 89mm x 36mm (landscape)
// QR code centered + numéro de série pour traçabilité d'impression (#1, #2, ...)

const MM_TO_PT = 2.835
const LABEL_W = 89  // mm
const LABEL_H = 36  // mm
const QR_SIZE = 26  // mm

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
  serial: {
    marginTop: 1 * MM_TO_PT,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
  },
})

export interface DymoQRPDFProps {
  labels: { qrDataUrl: string; serial: number }[]
}

export function DymoQRPDF({ labels }: DymoQRPDFProps) {
  return (
    <Document>
      {labels.map((label, i) => (
        <Page key={i} size={{ width: LABEL_W * MM_TO_PT, height: LABEL_H * MM_TO_PT }} style={s.page}>
          <View style={{ alignItems: 'center' }}>
            <Image src={label.qrDataUrl} style={s.qr} />
            <Text style={s.serial}>#{label.serial}</Text>
          </View>
        </Page>
      ))}
    </Document>
  )
}
