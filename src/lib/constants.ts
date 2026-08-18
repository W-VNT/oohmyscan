// Image upload validation
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
export const MAX_IMAGE_SIZE = 20 * 1024 * 1024 // 20MB before compression

export const PANEL_STATUSES = ['active', 'vacant', 'missing', 'maintenance'] as const
export type PanelStatus = (typeof PANEL_STATUSES)[number]

export const CAMPAIGN_STATUSES = ['draft', 'active', 'completed', 'cancelled'] as const
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

export const USER_ROLES = ['admin', 'operator'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const PHOTO_TYPES = ['installation', 'check', 'campaign', 'damage'] as const
export type PhotoType = (typeof PHOTO_TYPES)[number]

// PANEL_FORMATS and PANEL_TYPES removed — now managed dynamically from panel_formats table
// Use usePanelTypes() / useActivePanelTypes() from @/hooks/admin/usePanelTypes

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

export const CAMPAIGN_STATUS_CONFIG: Record<CampaignStatus, {
  label: string
  className: string
}> = {
  draft: { label: 'Brouillon', className: 'bg-gray-500/15 text-gray-500' },
  active: { label: 'Active', className: 'bg-green-500/15 text-green-600' },
  completed: { label: 'Terminée', className: 'bg-blue-500/15 text-blue-600' },
  cancelled: { label: 'Annulée', className: 'bg-red-500/15 text-red-600' },
}

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'converted', 'cancelled'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

export const QUOTE_STATUS_CONFIG: Record<QuoteStatus, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  className?: string
}> = {
  draft: { label: 'Brouillon', variant: 'outline', className: 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  sent: { label: 'Envoyé', variant: 'default' },
  accepted: { label: 'Accepté', variant: 'default', className: 'bg-green-600 text-white' },
  rejected: { label: 'Refusé', variant: 'destructive' },
  converted: { label: 'Converti', variant: 'default' },
  cancelled: { label: 'Annulé', variant: 'outline' },
}

export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  className?: string
}> = {
  draft: { label: 'Brouillon', variant: 'outline', className: 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  sent: { label: 'Envoyée', variant: 'default', className: 'bg-blue-600 text-white' },
  paid: { label: 'Payée', variant: 'default', className: 'bg-green-600 text-white' },
  overdue: { label: 'En retard', variant: 'destructive' },
  cancelled: { label: 'Annulée', variant: 'outline' },
}

export const INVOICE_TYPES = ['standard', 'acompte', 'solde', 'avoir'] as const
export type InvoiceType = (typeof INVOICE_TYPES)[number]

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  standard: 'Facture',
  acompte: 'Facture d\'acompte',
  solde: 'Facture de solde',
  avoir: 'Avoir',
}

// Conditions de règlement — unifiées devis + factures.
// '60_days_eom' est conservé en interne pour la rétro-compat des factures
// existantes mais n'apparaît plus dans PAYMENT_TERMS_OPTIONS (dropdown).
export const PAYMENT_TERMS = [
  'cash_on_order',
  'on_receipt',
  'deposit_50_30_days',
  'deposit_50_30_days_eom',
  '30_days',
  '30_days_eom',
  '45_days_eom',
  '60_days',
  '60_days_eom',
] as const
export type PaymentTerms = (typeof PAYMENT_TERMS)[number]

/** Options proposées dans les formulaires (sans le legacy 60_days_eom). */
export const PAYMENT_TERMS_OPTIONS: readonly PaymentTerms[] = [
  'cash_on_order',
  'on_receipt',
  'deposit_50_30_days',
  'deposit_50_30_days_eom',
  '30_days',
  '30_days_eom',
  '45_days_eom',
  '60_days',
] as const

export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  cash_on_order: 'Paiement comptant à la commande',
  on_receipt: 'Paiement à réception de facture',
  deposit_50_30_days: "50 % d'acompte à la commande, solde à 30 jours date de facture",
  deposit_50_30_days_eom: "50 % d'acompte à la commande, solde à 30 jours fin de mois",
  '30_days': 'Paiement à 30 jours date de facture',
  '30_days_eom': 'Paiement à 30 jours fin de mois',
  '45_days_eom': 'Paiement à 45 jours fin de mois',
  '60_days': 'Paiement à 60 jours date de facture',
  '60_days_eom': 'Paiement à 60 jours fin de mois',
}

/** Deplace d au dernier jour de son mois courant. On fait setDate(1) avant
 *  setMonth pour eviter les overflow (ex: 31/03 → setMonth(+1) sauterait
 *  avril et donnerait 31/05 → setDate(0) = 30/04 au lieu du 31/03 attendu). */
function endOfMonth(d: Date): void {
  d.setDate(1)
  d.setMonth(d.getMonth() + 1)
  d.setDate(0)
}

/** Compute due date from issue date and payment terms.
 *  Pour cash_on_order / deposit_*, la date de l'échéance globale reste celle
 *  du solde (30j ou 30j fin de mois) — l'acompte se règle à la commande.
 *
 *  Interpretation "N jours fin de mois" = date facture + N jours calendaires
 *  PUIS dernier jour du mois qui contient cette date (LME art. L441-10,
 *  interpretation Cour de cassation). Exemple : 28/07 + 30 jours fin de mois
 *  = 27/08 → dernier jour d'aout = 31/08. */
export function computeDueDate(issuedAt: string, terms: PaymentTerms): string {
  const d = new Date(issuedAt)
  switch (terms) {
    case 'cash_on_order':
    case 'on_receipt':
      break
    case 'deposit_50_30_days':
    case '30_days':
      d.setDate(d.getDate() + 30)
      break
    case 'deposit_50_30_days_eom':
    case '30_days_eom':
      d.setDate(d.getDate() + 30)
      endOfMonth(d)
      break
    case '45_days_eom':
      d.setDate(d.getDate() + 45)
      endOfMonth(d)
      break
    case '60_days':
      d.setDate(d.getDate() + 60)
      break
    case '60_days_eom':
      d.setDate(d.getDate() + 60)
      endOfMonth(d)
      break
  }
  return d.toISOString().split('T')[0]
}

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const
export type Currency = (typeof CURRENCIES)[number]

export const CURRENCY_LABELS: Record<Currency, string> = {
  EUR: '€ Euro',
  USD: '$ Dollar US',
  GBP: '£ Livre sterling',
  CHF: 'CHF Franc suisse',
}

export const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  installation: 'Installation',
  check: 'Vérification',
  campaign: 'Campagne',
  damage: 'Dégât',
}

export const PANEL_ZONES = [
  { value: 'entrance',    label: 'Entrée principale' },
  { value: 'hall',         label: 'Hall / Accueil' },
  { value: 'waiting',     label: 'Salle d\'attente' },
  { value: 'hallway',     label: 'Couloir / Passage' },
  { value: 'restrooms',   label: 'Sanitaires / WC' },
  { value: 'locker_room', label: 'Vestiaires' },
  { value: 'parking',     label: 'Parking' },
  { value: 'terrace',     label: 'Terrasse / Extérieur' },
  { value: 'dining',      label: 'Salle de restauration' },
  { value: 'bar',         label: 'Bar / Comptoir' },
  { value: 'leisure',     label: 'Espace détente / Loisirs' },
  { value: 'shop',        label: 'Commerce / Boutique' },
  { value: 'office',      label: 'Bureau / Open space' },
  { value: 'meeting',     label: 'Salle de réunion' },
  { value: 'kitchen',     label: 'Cuisine / Office' },
  { value: 'technical',   label: 'Local technique' },
  { value: 'elevator',    label: 'Ascenseur / Escalier' },
  { value: 'pool',        label: 'Piscine' },
  { value: 'other',       label: 'Autre' },
] as const

export type PanelZone = (typeof PANEL_ZONES)[number]['value']

export const PANEL_PROBLEMS = [
  { value: 'damaged',    label: 'Endommagé',       icon: 'Zap',       status: 'maintenance' as PanelStatus },
  { value: 'missing',    label: 'Manquant',         icon: 'CircleOff', status: 'missing' as PanelStatus },
  { value: 'detached',   label: 'Décollé',          icon: 'Unlink',    status: 'maintenance' as PanelStatus },
  { value: 'dirty',      label: 'Sale / Illisible', icon: 'Droplets',  status: 'maintenance' as PanelStatus },
  { value: 'obstructed', label: 'Obstrué',          icon: 'EyeOff',    status: 'maintenance' as PanelStatus },
] as const

export const CONTRACT_STATUSES = ['signed', 'amended', 'terminated'] as const
export type ContractStatus = (typeof CONTRACT_STATUSES)[number]

export const AMENDMENT_REASONS = ['panel_added', 'panel_removed', 'terms_updated'] as const
export type AmendmentReason = (typeof AMENDMENT_REASONS)[number]

export const POTENTIAL_STATUSES = ['draft', 'sent'] as const
export type PotentialStatus = (typeof POTENTIAL_STATUSES)[number]

export const POTENTIAL_STATUS_CONFIG: Record<PotentialStatus, {
  label: string
  variant: 'default' | 'secondary'
}> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  sent: { label: 'Envoyé', variant: 'default' },
}
