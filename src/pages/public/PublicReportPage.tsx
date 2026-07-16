import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { usePublicCampaignReport } from '@/hooks/admin/useCampaignReport'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, FileText, Download, ExternalLink } from 'lucide-react'

/**
 * Bloque toute indexation par les crawlers : les URLs contiennent un token
 * de partage secret, un rapport indexe fuiterait donnees client (nom
 * campagne, photos terrain, adresses) sur Google.
 */
const REPORT_ROBOTS = 'noindex, nofollow, noarchive, nosnippet'

export function PublicReportPage() {
  const { token } = useParams<{ token: string }>()
  const { data, isLoading, isError } = usePublicCampaignReport(token)

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>Chargement… — OOH MY AD !</title>
          <meta name="robots" content={REPORT_ROBOTS} />
        </Helmet>
        <div className="flex min-h-screen items-center justify-center bg-muted/30">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  if (isError || !data) {
    return (
      <>
        <Helmet>
          <title>Rapport introuvable — OOH MY AD !</title>
          <meta name="robots" content={REPORT_ROBOTS} />
        </Helmet>
        <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
          <Card className="max-w-sm">
            <CardContent className="text-center">
              <FileText className="mx-auto size-12 text-muted-foreground" />
              <h1 className="mt-4 text-lg font-semibold">Rapport introuvable</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Ce lien n'est pas valide, le rapport a été dépublié ou supprimé.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const campaignName = data.campaign?.name ?? 'Campagne'

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Helmet>
        <title>{`Rapport ${campaignName} — OOH MY AD !`}</title>
        <meta name="robots" content={REPORT_ROBOTS} />
      </Helmet>
      {/* Top bar */}
      <header className="border-b border-border bg-background px-4 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Rapport de campagne
            </p>
            <h1 className="truncate text-sm font-semibold sm:text-base">
              {data.campaign?.name ?? 'Campagne'}
            </h1>
            {data.campaign?.clients && (
              <p className="truncate text-xs text-muted-foreground">{data.campaign.clients.company_name}</p>
            )}
          </div>
          <div className="flex gap-2">
            <a
              href={data.pdfUrl}
              download
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
            >
              <Download className="size-3.5" />
              Télécharger
            </a>
            <a
              href={data.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
            >
              <ExternalLink className="size-3.5" />
              Ouvrir
            </a>
          </div>
        </div>
      </header>

      {/* PDF viewer */}
      <main className="flex-1 p-2 sm:p-4">
        <div className="mx-auto h-[calc(100vh-120px)] max-w-5xl overflow-hidden rounded-lg border border-border bg-background shadow-sm">
          <iframe
            src={data.pdfUrl}
            title="Rapport de campagne"
            className="size-full"
          />
        </div>
      </main>

      <footer className="border-t border-border bg-background py-2 text-center text-[10px] text-muted-foreground">
        <span className="font-['Poppins'] font-black uppercase tracking-[0.02em]">OOH MY AD&nbsp;!</span>
      </footer>
    </div>
  )
}
