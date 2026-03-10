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
