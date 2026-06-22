import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CampaignReport, BrandedSlide } from '@/lib/campaign-report-types'

/**
 * Liste tous les rapports de campagne avec les infos de campagne et client
 * pour l'affichage en page liste.
 */
export interface CampaignReportListItem {
  id: string
  campaign_id: string
  generated_at: string
  updated_at: string
  slides_count: number
  brand_color: string | null
  campaign: {
    name: string
    status: string
    start_date: string
    end_date: string
    client: { company_name: string } | null
  } | null
}

export function useAllCampaignReports() {
  return useQuery({
    queryKey: ['campaign-reports', 'all'],
    queryFn: async (): Promise<CampaignReportListItem[]> => {
      const { data, error } = await supabase
        .from('campaign_reports')
        .select('id, campaign_id, generated_at, updated_at, slides, brand_color, campaigns(name, status, start_date, end_date, clients(company_name))')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return ((data ?? []) as unknown as Array<{
        id: string
        campaign_id: string
        generated_at: string
        updated_at: string
        slides: BrandedSlide[] | null
        brand_color: string | null
        campaigns: { name: string; status: string; start_date: string; end_date: string; clients: { company_name: string } | null } | null
      }>).map((r) => ({
        id: r.id,
        campaign_id: r.campaign_id,
        generated_at: r.generated_at,
        updated_at: r.updated_at,
        slides_count: Array.isArray(r.slides) ? r.slides.length : 0,
        brand_color: r.brand_color,
        campaign: r.campaigns ? {
          name: r.campaigns.name,
          status: r.campaigns.status,
          start_date: r.campaigns.start_date,
          end_date: r.campaigns.end_date,
          client: r.campaigns.clients,
        } : null,
      }))
    },
    staleTime: 60_000,
  })
}

/**
 * Charge le rapport de campagne. Retourne null si aucun rapport n'existe encore
 * (la generation est declenchee separement via useCreateCampaignReport).
 */
export function useCampaignReport(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-report', campaignId],
    queryFn: async (): Promise<CampaignReport | null> => {
      if (!campaignId) return null
      const { data, error } = await supabase
        .from('campaign_reports')
        .select('*')
        .eq('campaign_id', campaignId)
        .maybeSingle()
      if (error) throw error
      return data as CampaignReport | null
    },
    enabled: !!campaignId,
  })
}

interface CreateReportInput {
  campaign_id: string
  slides: BrandedSlide[]
  intro_text?: string | null
  cover_photo_path?: string | null
  contact_user_id?: string | null
}

/** Cree (ou ecrase) le rapport pour une campagne. UPSERT sur campaign_id. */
export function useCreateOrReplaceCampaignReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateReportInput): Promise<CampaignReport> => {
      const { data, error } = await supabase
        .from('campaign_reports')
        .upsert(
          {
            campaign_id: input.campaign_id,
            slides: input.slides,
            intro_text: input.intro_text ?? null,
            cover_photo_path: input.cover_photo_path ?? null,
            contact_user_id: input.contact_user_id ?? null,
            generated_at: new Date().toISOString(),
          },
          { onConflict: 'campaign_id' },
        )
        .select()
        .single()
      if (error) throw error
      return data as CampaignReport
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-report', data.campaign_id] })
    },
  })
}

interface UpdateReportInput {
  id: string
  campaign_id: string
  slides?: BrandedSlide[]
  intro_text?: string | null
  cover_photo_path?: string | null
  contact_user_id?: string | null
  contact_name_override?: string | null
  contact_email_override?: string | null
  contact_phone_override?: string | null
}

/** Update un rapport existant. */
export function useUpdateCampaignReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateReportInput): Promise<CampaignReport> => {
      const { id, campaign_id: _campaign_id, ...updates } = input
      const { data, error } = await supabase
        .from('campaign_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as CampaignReport
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-report', data.campaign_id] })
    },
  })
}

/**
 * Publie le rapport : génère le PDF, upload dans campaign-reports-public,
 * met à jour published_pdf_path + published_at. Le public_token existe déjà
 * (auto-généré à la création).
 */
export function usePublishCampaignReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      report: CampaignReport
      slides: BrandedSlide[]
      brandColor: string
    }): Promise<CampaignReport> => {
      const { exportBrandedReport } = await import('@/lib/pdf/BrandedReportPDF')
      const blob = await exportBrandedReport(input.slides, input.brandColor)

      const path = `${input.report.public_token}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('campaign-reports-public')
        .upload(path, blob, {
          contentType: 'application/pdf',
          upsert: true,
          cacheControl: 'public, max-age=300',
        })
      if (uploadError) throw uploadError

      const { data, error } = await supabase
        .from('campaign_reports')
        .update({
          published_pdf_path: path,
          published_at: new Date().toISOString(),
        })
        .eq('id', input.report.id)
        .select()
        .single()
      if (error) throw error

      return data as CampaignReport
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-report', data.campaign_id] })
      queryClient.invalidateQueries({ queryKey: ['campaign-reports', 'all'] })
    },
  })
}

/** Dépublie : supprime le PDF du bucket public + clear published_pdf_path. */
export function useUnpublishCampaignReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (report: CampaignReport): Promise<CampaignReport> => {
      if (report.published_pdf_path) {
        await supabase.storage
          .from('campaign-reports-public')
          .remove([report.published_pdf_path])
      }
      const { data, error } = await supabase
        .from('campaign_reports')
        .update({ published_pdf_path: null, published_at: null })
        .eq('id', report.id)
        .select()
        .single()
      if (error) throw error
      return data as CampaignReport
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-report', data.campaign_id] })
      queryClient.invalidateQueries({ queryKey: ['campaign-reports', 'all'] })
    },
  })
}

/** Récupère un rapport publié via son token public (accès anonyme). */
export function usePublicCampaignReport(token: string | undefined) {
  return useQuery({
    queryKey: ['public-report', token],
    queryFn: async () => {
      if (!token) return null
      const { data, error } = await supabase
        .from('campaign_reports')
        .select('id, public_token, published_pdf_path, published_at, campaigns(name, start_date, end_date, clients(company_name))')
        .eq('public_token', token)
        .not('published_pdf_path', 'is', null)
        .maybeSingle()
      if (error) throw error
      if (!data) return null

      const { data: pub } = supabase.storage
        .from('campaign-reports-public')
        .getPublicUrl((data as unknown as { published_pdf_path: string }).published_pdf_path)

      return {
        pdfUrl: pub.publicUrl,
        publishedAt: (data as unknown as { published_at: string }).published_at,
        campaign: (data as unknown as { campaigns: { name: string; start_date: string; end_date: string; clients: { company_name: string } | null } | null }).campaigns,
      }
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

/** Supprime un rapport (utile pour "Reset depuis zero"). */
export function useDeleteCampaignReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, campaign_id }: { id: string; campaign_id: string }) => {
      const { error } = await supabase.from('campaign_reports').delete().eq('id', id)
      if (error) throw error
      return { campaign_id }
    },
    onSuccess: ({ campaign_id }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-report', campaign_id] })
    },
  })
}

/**
 * Autosave hook : ecrit en DB apres un debounce.
 * Utilise dans l'editeur pour persister automatiquement les modifs.
 *
 * Pattern :
 *   const { isSaving, lastSavedAt } = useAutosaveCampaignReport(report?.id, slides)
 */
export function useAutosaveCampaignReport(
  reportId: string | undefined,
  slides: BrandedSlide[],
  intro_text: string | null,
  brand_color: string | null,
  enabled: boolean,
  debounceMs = 1000,
) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPayloadRef = useRef<string>('')

  useEffect(() => {
    if (!enabled || !reportId) return
    const payload = JSON.stringify({ slides, intro_text, brand_color })
    if (payload === lastPayloadRef.current) return

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true)
      setError(null)
      try {
        const { error: updateError } = await supabase
          .from('campaign_reports')
          .update({ slides, intro_text, brand_color })
          .eq('id', reportId)
        if (updateError) throw updateError
        lastPayloadRef.current = payload
        setLastSavedAt(new Date())
      } catch (e) {
        setError(e as Error)
      } finally {
        setIsSaving(false)
      }
    }, debounceMs)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [reportId, slides, intro_text, brand_color, enabled, debounceMs])

  return { isSaving, lastSavedAt, error }
}
