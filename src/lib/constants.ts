export const PANEL_STATUSES = ['active', 'vacant', 'missing', 'maintenance'] as const
export type PanelStatus = (typeof PANEL_STATUSES)[number]

export const CAMPAIGN_STATUSES = ['draft', 'active', 'completed', 'cancelled'] as const
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

export const USER_ROLES = ['admin', 'operator'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const PHOTO_TYPES = ['installation', 'check', 'campaign', 'damage'] as const
export type PhotoType = (typeof PHOTO_TYPES)[number]

export const PANEL_FORMATS = ['4x3', 'Abribus', 'Bâche', '2m²', '8m²', '12m²'] as const
export const PANEL_TYPES = ['Mural', 'Totem', 'Bâche', 'Digital', 'Déroulant', 'Autre'] as const

export const PANEL_STATUS_COLORS: Record<PanelStatus, string> = {
  active: '#22c55e',
  vacant: '#6b7280',
  missing: '#ef4444',
  maintenance: '#f97316',
}

export const PANEL_STATUS_CONFIG: Record<PanelStatus, {
  label: string
  color: string
  bg: string
  variant: 'default' | 'secondary' | 'outline' | 'destructive'
}> = {
  active: { label: 'Actif', color: 'bg-green-500', bg: 'bg-green-500/15 text-green-400', variant: 'default' },
  vacant: { label: 'Vacant', color: 'bg-gray-400', bg: 'bg-gray-500/15 text-gray-400', variant: 'secondary' },
  maintenance: { label: 'Maintenance', color: 'bg-orange-500', bg: 'bg-orange-500/15 text-orange-400', variant: 'outline' },
  missing: { label: 'Manquant', color: 'bg-red-500', bg: 'bg-red-500/15 text-red-400', variant: 'destructive' },
}

export const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  installation: 'Installation',
  check: 'Vérification',
  campaign: 'Campagne',
  damage: 'Dégât',
}
