import { useParams, useNavigate } from 'react-router-dom'
import { usePanel } from '@/hooks/usePanels'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { ContractStepper } from '@/components/contract/ContractStepper'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function ContractPage() {
  const { panelId } = useParams<{ panelId: string }>()
  const navigate = useNavigate()
  const isValidUUID = panelId ? UUID_RE.test(panelId) : false
  const { data: panel, isLoading } = usePanel(isValidUUID ? panelId : undefined)

  if (isLoading && isValidUUID) return <LoadingScreen />

  if (!panel) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg font-medium">Panneau non trouvé</p>
          <button
            onClick={() => navigate('/app/dashboard')}
            className="mt-4 text-sm text-primary underline"
          >
            Retour au dashboard
          </button>
        </div>
      </div>
    )
  }

  return <ContractStepper panel={panel} />
}
