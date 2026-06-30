import { Document, Page, View, Image, StyleSheet } from '@react-pdf/renderer'

// Dymo label: 32mm x 57mm (portrait natif — matche l'orientation par défaut
// du driver Dymo LabelWriter 450 sur Mac qui propose ce papier en Portrait).
// Pas de rotation automatique nécessaire → impression fidèle.
// QR = 32mm (fill 100% en largeur), centré verticalement (12.5mm margin)

const LABEL_W = 32 // mm — largeur (côté court, alimentation rouleau)
const LABEL_H = 57 // mm — hauteur (côté long, sens d'impression)
const QR_SIZE = 32 // mm — fill largeur · ~12.5mm margin haut/bas

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
