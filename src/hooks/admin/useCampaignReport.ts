import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CampaignReport, BrandedSlide } from '@/lib/campaign-report-types'

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
