import { CheckCircle, FileText, Eye } from 'lucide-react'

interface ContractSuccessProps {
  type: 'contract' | 'amendment'
  contractNumber: string
  locationName: string
  onViewPanel: () => void
}

export function ContractSuccess({
  type,
  contractNumber,
  locationName,
  onViewPanel,
}: ContractSuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-500/15">
        <CheckCircle className="size-8 text-green-600" />
      </div>

      <h2 className="text-lg font-semibold">
        {type === 'contract' ? 'Contrat signé' : 'Avenant signé'}
      </h2>

      <p className="mt-2 text-sm text-muted-foreground">
        {type === 'contract'
          ? `Le contrat a été enregistré pour ${locationName}.`
          : `L'avenant a été enregistré pour ${locationName}.`}
      </p>

      <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2 font-mono text-sm font-medium">
        <FileText className="size-4 text-muted-foreground" />
        {contractNumber}
      </div>

      <button
        onClick={onViewPanel}
        className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Eye className="size-4" />
        Voir la fiche panneau
      </button>
    </div>
  )
}
