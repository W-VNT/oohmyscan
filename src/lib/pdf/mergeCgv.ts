import { PDFDocument } from 'pdf-lib'
import { supabase } from '@/lib/supabase'

/**
 * Si un PDF CGV est uploade dans Supabase Storage, le merge en fin de PDF source.
 * Sinon retourne le blob source inchange (le rich text CGV est deja sur la
 * page 2 du PDF source, gere par QuotePDF/InvoicePDF).
 */
export async function mergeWithCgvPdf(
  sourceBlob: Blob,
  cgvPdfPath: string | null | undefined,
): Promise<Blob> {
  if (!cgvPdfPath) return sourceBlob

  try {
    // Telecharge le PDF CGV depuis Supabase Storage
    const { data: cgvFile, error } = await supabase.storage
      .from('company-pdfs')
      .download(cgvPdfPath)
    if (error || !cgvFile) {
      console.error('Erreur telechargement CGV PDF:', error)
      return sourceBlob
    }

    const sourceBytes = await sourceBlob.arrayBuffer()
    const cgvBytes = await cgvFile.arrayBuffer()

    const sourcePdf = await PDFDocument.load(sourceBytes)
    const cgvPdf = await PDFDocument.load(cgvBytes)

    const cgvPages = await sourcePdf.copyPages(cgvPdf, cgvPdf.getPageIndices())
    cgvPages.forEach((page) => sourcePdf.addPage(page))

    const merged = await sourcePdf.save()
    return new Blob([new Uint8Array(merged)], { type: 'application/pdf' })
  } catch (err) {
    console.error('Erreur merge CGV PDF:', err)
    return sourceBlob
  }
}
