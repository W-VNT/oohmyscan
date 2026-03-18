export type AuditAction = 'create' | 'update' | 'delete'

export interface AuditLog {
  id: string
  actor_id: string | null
  action: AuditAction
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: AuditAction
          table_name: string
          record_id: string | null
          old_data: Record<string, unknown> | null
          new_data: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: string
          table_name: string
          record_id?: string | null
          old_data?: Record<string, unknown> | null
          new_data?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          action?: string
          table_name?: string
          record_id?: string | null
          old_data?: Record<string, unknown> | null
          new_data?: Record<string, unknown> | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          role: 'admin' | 'operator'
          phone: string | null
          avatar_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          role: 'admin' | 'operator'
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: 'admin' | 'operator'
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      panels: {
        Row: {
          id: string
          qr_code: string
          reference: string
          name: string | null
          lat: number
          lng: number
          address: string | null
          city: string | null
          contact_phone: string | null
          format: string | null
          type: string | null
          status: 'active' | 'vacant' | 'missing' | 'maintenance'
          notes: string | null
          installed_at: string | null
          installed_by: string | null
          location_id: string | null
          zone_label: string | null
          last_checked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          qr_code: string
          reference: string
          name?: string | null
          lat: number
          lng: number
          address?: string | null
          city?: string | null
          contact_phone?: string | null
          format?: string | null
          type?: string | null
          status?: 'active' | 'vacant' | 'missing' | 'maintenance'
          notes?: string | null
          location_id?: string | null
          zone_label?: string | null
          installed_at?: string | null
          installed_by?: string | null
          last_checked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          qr_code?: string
          reference?: string
          name?: string | null
          lat?: number
          lng?: number
          address?: string | null
          city?: string | null
          contact_phone?: string | null
          format?: string | null
          type?: string | null
          status?: 'active' | 'vacant' | 'missing' | 'maintenance'
          notes?: string | null
          location_id?: string | null
          zone_label?: string | null
          installed_at?: string | null
          installed_by?: string | null
          last_checked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      panel_photos: {
        Row: {
          id: string
          panel_id: string
          storage_path: string
          photo_type: 'installation' | 'check' | 'campaign' | 'damage'
          taken_by: string | null
          taken_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          panel_id: string
          storage_path: string
          photo_type: 'installation' | 'check' | 'campaign' | 'damage'
          taken_by?: string | null
          taken_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          panel_id?: string
          storage_path?: string
          photo_type?: 'installation' | 'check' | 'campaign' | 'damage'
          taken_by?: string | null
          taken_at?: string
          notes?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          id: string
          name: string
          client_id: string | null
          description: string | null
          start_date: string
          end_date: string
          status: 'draft' | 'active' | 'completed' | 'cancelled'
          budget: number | null
          target_panel_count: number | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          client_id?: string | null
          description?: string | null
          start_date: string
          end_date: string
          status?: 'draft' | 'active' | 'completed' | 'cancelled'
          budget?: number | null
          target_panel_count?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          client_id?: string | null
          description?: string | null
          start_date?: string
          end_date?: string
          status?: 'draft' | 'active' | 'completed' | 'cancelled'
          budget?: number | null
          target_panel_count?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      panel_campaigns: {
        Row: {
          id: string
          panel_id: string
          campaign_id: string
          assigned_at: string
          assigned_by: string | null
          unassigned_at: string | null
          validation_photo_path: string | null
          validated_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          panel_id: string
          campaign_id: string
          assigned_at?: string
          assigned_by?: string | null
          unassigned_at?: string | null
          validation_photo_path?: string | null
          validated_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          panel_id?: string
          campaign_id?: string
          assigned_at?: string
          assigned_by?: string | null
          unassigned_at?: string | null
          validation_photo_path?: string | null
          validated_at?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          company_name: string
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          address: string | null
          city: string | null
          postal_code: string | null
          siret: string | null
          tva_number: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          city?: string | null
          postal_code?: string | null
          siret?: string | null
          tva_number?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          city?: string | null
          postal_code?: string | null
          siret?: string | null
          tva_number?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      panel_formats: {
        Row: {
          id: string
          name: string
          width_cm: number | null
          height_cm: number | null
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          width_cm?: number | null
          height_cm?: number | null
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          width_cm?: number | null
          height_cm?: number | null
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      service_catalog: {
        Row: {
          id: string
          name: string
          default_unit_price: number
          default_tva_rate: number
          unit: string
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          default_unit_price?: number
          default_tva_rate?: number
          unit?: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          default_unit_price?: number
          default_tva_rate?: number
          unit?: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          id: string
          company_name: string | null
          address: string | null
          city: string | null
          postal_code: string | null
          siret: string | null
          tva_number: string | null
          logo_path: string | null
          email: string | null
          phone: string | null
          iban: string | null
          bic: string | null
          quote_prefix: string
          invoice_prefix: string
          next_quote_number: number
          next_invoice_number: number
          legal_mentions: string | null
          potential_prefix: string
          next_potential_number: number
          default_panel_type_id: string | null
          late_penalty_text: string | null
          terms_and_conditions: string | null
        }
        Insert: {
          id?: string
          company_name?: string | null
          address?: string | null
          city?: string | null
          postal_code?: string | null
          siret?: string | null
          tva_number?: string | null
          logo_path?: string | null
          email?: string | null
          phone?: string | null
          iban?: string | null
          bic?: string | null
          quote_prefix?: string
          invoice_prefix?: string
          next_quote_number?: number
          next_invoice_number?: number
          legal_mentions?: string | null
          potential_prefix?: string
          next_potential_number?: number
          default_panel_type_id?: string | null
        }
        Update: {
          id?: string
          company_name?: string | null
          address?: string | null
          city?: string | null
          postal_code?: string | null
          siret?: string | null
          tva_number?: string | null
          logo_path?: string | null
          email?: string | null
          phone?: string | null
          iban?: string | null
          bic?: string | null
          quote_prefix?: string
          invoice_prefix?: string
          next_quote_number?: number
          next_invoice_number?: number
          legal_mentions?: string | null
          potential_prefix?: string
          next_potential_number?: number
          default_panel_type_id?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          id: string
          quote_number: string
          client_id: string
          campaign_id: string | null
          status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted' | 'cancelled'
          issued_at: string
          valid_until: string
          notes: string | null
          client_reference: string | null
          is_archived: boolean
          include_terms: boolean
          currency: string
          custom_fields: Record<string, unknown>
          public_token: string
          total_ht: number
          total_tva: number
          total_ttc: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quote_number: string
          client_id: string
          campaign_id?: string | null
          status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted' | 'cancelled'
          issued_at?: string
          valid_until?: string
          notes?: string | null
          client_reference?: string | null
          is_archived?: boolean
          include_terms?: boolean
          currency?: string
          custom_fields?: Record<string, unknown>
          total_ht?: number
          total_tva?: number
          total_ttc?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quote_number?: string
          client_id?: string
          campaign_id?: string | null
          status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted' | 'cancelled'
          issued_at?: string
          valid_until?: string
          notes?: string | null
          client_reference?: string | null
          is_archived?: boolean
          include_terms?: boolean
          currency?: string
          custom_fields?: Record<string, unknown>
          total_ht?: number
          total_tva?: number
          total_ttc?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_templates: {
        Row: {
          id: string
          name: string
          lines: unknown
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          lines?: unknown
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          lines?: unknown
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      quote_lines: {
        Row: {
          id: string
          quote_id: string
          service_catalog_id: string | null
          description: string
          quantity: number
          unit: string
          unit_price: number
          tva_rate: number
          discount_type: 'percent' | 'amount' | null
          discount_value: number
          line_type: 'item' | 'section'
          total_ht: number
          sort_order: number
        }
        Insert: {
          id?: string
          quote_id: string
          service_catalog_id?: string | null
          description: string
          quantity?: number
          unit?: string
          unit_price?: number
          tva_rate?: number
          discount_type?: 'percent' | 'amount' | null
          discount_value?: number
          line_type?: 'item' | 'section'
          total_ht?: number
          sort_order?: number
        }
        Update: {
          id?: string
          quote_id?: string
          service_catalog_id?: string | null
          description?: string
          quantity?: number
          unit?: string
          unit_price?: number
          tva_rate?: number
          discount_type?: 'percent' | 'amount' | null
          discount_value?: number
          line_type?: 'item' | 'section'
          total_ht?: number
          sort_order?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          quote_id: string | null
          client_id: string
          campaign_id: string | null
          status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          issued_at: string
          due_at: string
          paid_at: string | null
          notes: string | null
          total_ht: number
          total_tva: number
          total_ttc: number
          created_by: string | null
          invoice_type: 'standard' | 'acompte' | 'solde' | 'avoir'
          deposit_percentage: number | null
          deposit_invoice_id: string | null
          credit_note_for_id: string | null
          payment_terms: 'on_receipt' | '30_days' | '30_days_eom' | '60_days' | '60_days_eom'
          client_reference: string | null
          is_archived: boolean
          include_terms: boolean
          currency: string
          custom_fields: Record<string, unknown>
          public_token: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number: string
          quote_id?: string | null
          client_id: string
          campaign_id?: string | null
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          invoice_type?: 'standard' | 'acompte' | 'solde' | 'avoir'
          deposit_percentage?: number | null
          deposit_invoice_id?: string | null
          credit_note_for_id?: string | null
          payment_terms?: 'on_receipt' | '30_days' | '30_days_eom' | '60_days' | '60_days_eom'
          client_reference?: string | null
          is_archived?: boolean
          include_terms?: boolean
          currency?: string
          custom_fields?: Record<string, unknown>
          issued_at?: string
          due_at?: string
          paid_at?: string | null
          notes?: string | null
          total_ht?: number
          total_tva?: number
          total_ttc?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          quote_id?: string | null
          client_id?: string
          campaign_id?: string | null
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          invoice_type?: 'standard' | 'acompte' | 'solde' | 'avoir'
          deposit_percentage?: number | null
          deposit_invoice_id?: string | null
          credit_note_for_id?: string | null
          payment_terms?: 'on_receipt' | '30_days' | '30_days_eom' | '60_days' | '60_days_eom'
          client_reference?: string | null
          is_archived?: boolean
          include_terms?: boolean
          currency?: string
          custom_fields?: Record<string, unknown>
          issued_at?: string
          due_at?: string
          paid_at?: string | null
          notes?: string | null
          total_ht?: number
          total_tva?: number
          total_ttc?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_lines: {
        Row: {
          id: string
          invoice_id: string
          service_catalog_id: string | null
          description: string
          quantity: number
          unit: string
          unit_price: number
          tva_rate: number
          discount_type: 'percent' | 'amount' | null
          discount_value: number
          line_type: 'item' | 'section'
          total_ht: number
          sort_order: number
        }
        Insert: {
          id?: string
          invoice_id: string
          service_catalog_id?: string | null
          description: string
          quantity?: number
          unit?: string
          unit_price?: number
          tva_rate?: number
          discount_type?: 'percent' | 'amount' | null
          discount_value?: number
          line_type?: 'item' | 'section'
          total_ht?: number
          sort_order?: number
        }
        Update: {
          id?: string
          invoice_id?: string
          service_catalog_id?: string | null
          description?: string
          quantity?: number
          unit?: string
          unit_price?: number
          tva_rate?: number
          discount_type?: 'percent' | 'amount' | null
          discount_value?: number
          line_type?: 'item' | 'section'
          total_ht?: number
          sort_order?: number
        }
        Relationships: []
      }
      dunning_history: {
        Row: {
          id: string
          invoice_id: string
          level: number
          sent_at: string
          method: 'email' | 'manual'
          notes: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          invoice_id: string
          level?: number
          sent_at?: string
          method?: 'email' | 'manual'
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          invoice_id?: string
          level?: number
          sent_at?: string
          method?: 'email' | 'manual'
          notes?: string | null
          created_by?: string | null
        }
        Relationships: []
      }
      recurring_invoices: {
        Row: {
          id: string
          client_id: string
          campaign_id: string | null
          frequency: 'monthly' | 'quarterly' | 'yearly'
          next_issue_date: string
          template_lines: unknown
          payment_terms: string
          notes: string | null
          currency: string
          is_active: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          campaign_id?: string | null
          frequency?: 'monthly' | 'quarterly' | 'yearly'
          next_issue_date: string
          template_lines?: unknown
          payment_terms?: string
          notes?: string | null
          currency?: string
          is_active?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          campaign_id?: string | null
          frequency?: 'monthly' | 'quarterly' | 'yearly'
          next_issue_date?: string
          template_lines?: unknown
          payment_terms?: string
          notes?: string | null
          currency?: string
          is_active?: boolean
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      document_attachments: {
        Row: {
          id: string
          document_type: 'quote' | 'invoice'
          document_id: string
          storage_path: string
          file_name: string
          file_size: number | null
          mime_type: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_type: 'quote' | 'invoice'
          document_id: string
          storage_path: string
          file_name: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_type?: 'quote' | 'invoice'
          document_id?: string
          storage_path?: string
          file_name?: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          invoice_id: string
          amount: number
          payment_method: 'virement' | 'cheque' | 'especes' | 'cb' | 'prelevement' | 'autre'
          payment_date: string
          reference: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          amount: number
          payment_method?: 'virement' | 'cheque' | 'especes' | 'cb' | 'prelevement' | 'autre'
          payment_date?: string
          reference?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          amount?: number
          payment_method?: 'virement' | 'cheque' | 'especes' | 'cb' | 'prelevement' | 'autre'
          payment_date?: string
          reference?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      campaign_visuals: {
        Row: {
          id: string
          campaign_id: string
          panel_format_id: string | null
          storage_path: string
          file_name: string
          sort_order: number
          uploaded_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          panel_format_id?: string | null
          storage_path: string
          file_name?: string
          sort_order?: number
          uploaded_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          panel_format_id?: string | null
          storage_path?: string
          file_name?: string
          sort_order?: number
          uploaded_at?: string
        }
        Relationships: []
      }
      qr_stock: {
        Row: {
          id: string
          uuid_code: string
          is_assigned: boolean
          panel_id: string | null
          generated_at: string
          assigned_at: string | null
        }
        Insert: {
          id?: string
          uuid_code?: string
          is_assigned?: boolean
          panel_id?: string | null
          generated_at?: string
          assigned_at?: string | null
        }
        Update: {
          id?: string
          uuid_code?: string
          is_assigned?: boolean
          panel_id?: string | null
          generated_at?: string
          assigned_at?: string | null
        }
        Relationships: []
      }
      potential_requests: {
        Row: {
          id: string
          reference: string
          prospect_name: string
          city: string
          cities: string[]
          radius_km: number
          support_type: string | null
          lat: number | null
          lng: number | null
          existing_panels_count: number
          potential_spots_count: number
          existing_panel_ids: string[]
          potential_spots: unknown
          status: 'draft' | 'sent'
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reference: string
          prospect_name: string
          city: string
          cities?: string[]
          radius_km?: number
          support_type?: string | null
          lat?: number | null
          lng?: number | null
          existing_panels_count?: number
          potential_spots_count?: number
          existing_panel_ids?: string[]
          potential_spots?: unknown
          status?: 'draft' | 'sent'
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reference?: string
          prospect_name?: string
          city?: string
          cities?: string[]
          radius_km?: number
          support_type?: string | null
          lat?: number | null
          lng?: number | null
          existing_panels_count?: number
          potential_spots_count?: number
          existing_panel_ids?: string[]
          potential_spots?: unknown
          status?: 'draft' | 'sent'
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          id: string
          name: string
          company: string | null
          email: string
          city: string | null
          support_interest: string | null
          message: string
          source: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          company?: string | null
          email: string
          city?: string | null
          support_interest?: string | null
          message: string
          source?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          company?: string | null
          email?: string
          city?: string | null
          support_interest?: string | null
          message?: string
          source?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          id: string
          name: string
          address: string
          postal_code: string
          city: string
          phone: string | null
          owner_last_name: string
          owner_first_name: string
          owner_role: string
          owner_email: string | null
          closing_months: string | null
          has_contract: boolean
          contract_signed_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          postal_code: string
          city: string
          phone?: string | null
          owner_last_name: string
          owner_first_name: string
          owner_role?: string
          owner_email?: string | null
          closing_months?: string | null
          has_contract?: boolean
          contract_signed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          postal_code?: string
          city?: string
          phone?: string | null
          owner_last_name?: string
          owner_first_name?: string
          owner_role?: string
          owner_email?: string | null
          closing_months?: string | null
          has_contract?: boolean
          contract_signed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      panel_contracts: {
        Row: {
          id: string
          location_id: string
          contract_number: string
          establishment_name: string
          establishment_address: string
          establishment_postal_code: string
          establishment_city: string
          establishment_phone: string | null
          owner_last_name: string
          owner_first_name: string
          owner_role: string
          owner_email: string | null
          closing_months: string | null
          panels_snapshot: unknown
          signature_owner: string
          signature_operator: string
          signed_at: string
          signed_city: string | null
          storage_path: string | null
          status: 'signed' | 'amended' | 'terminated'
          next_amendment_number: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          location_id: string
          contract_number: string
          establishment_name: string
          establishment_address: string
          establishment_postal_code: string
          establishment_city: string
          establishment_phone?: string | null
          owner_last_name: string
          owner_first_name: string
          owner_role: string
          owner_email?: string | null
          closing_months?: string | null
          panels_snapshot?: unknown
          signature_owner: string
          signature_operator: string
          signed_at: string
          signed_city?: string | null
          storage_path?: string | null
          status?: 'signed' | 'amended' | 'terminated'
          next_amendment_number?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          contract_number?: string
          establishment_name?: string
          establishment_address?: string
          establishment_postal_code?: string
          establishment_city?: string
          establishment_phone?: string | null
          owner_last_name?: string
          owner_first_name?: string
          owner_role?: string
          owner_email?: string | null
          closing_months?: string | null
          panels_snapshot?: unknown
          signature_owner?: string
          signature_operator?: string
          signed_at?: string
          signed_city?: string | null
          storage_path?: string | null
          status?: 'signed' | 'amended' | 'terminated'
          next_amendment_number?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_amendments: {
        Row: {
          id: string
          contract_id: string
          location_id: string
          amendment_number: string
          reason: 'panel_added' | 'panel_removed' | 'terms_updated'
          panels_added: unknown
          panels_removed: unknown
          panels_snapshot: unknown
          signature_owner: string
          signature_operator: string
          signed_at: string
          signed_city: string | null
          storage_path: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          location_id: string
          amendment_number: string
          reason: 'panel_added' | 'panel_removed' | 'terms_updated'
          panels_added?: unknown
          panels_removed?: unknown
          panels_snapshot?: unknown
          signature_owner: string
          signature_operator: string
          signed_at: string
          signed_city?: string | null
          storage_path?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          contract_id?: string
          location_id?: string
          amendment_number?: string
          reason?: 'panel_added' | 'panel_removed' | 'terms_updated'
          panels_added?: unknown
          panels_removed?: unknown
          panels_snapshot?: unknown
          signature_owner?: string
          signature_operator?: string
          signed_at?: string
          signed_city?: string | null
          storage_path?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      panels_without_location: {
        Row: {
          id: string
          qr_code: string
          reference: string
          name: string | null
          location_id: null
          [key: string]: unknown
        }
        Relationships: []
      }
    }
    Functions: {
      get_next_quote_number: {
        Args: Record<string, never>
        Returns: string
      }
      get_next_invoice_number: {
        Args: Record<string, never>
        Returns: string
      }
      get_next_potential_number: {
        Args: Record<string, never>
        Returns: string
      }
      get_next_amendment_number: {
        Args: { p_contract_id: string }
        Returns: string
      }
      get_next_contract_number: {
        Args: Record<string, never>
        Returns: string
      }
      save_quote_lines: {
        Args: {
          p_quote_id: string
          p_lines: Record<string, unknown>[]
          p_total_ht: number
          p_total_tva: number
          p_total_ttc: number
        }
        Returns: undefined
      }
      save_invoice_lines: {
        Args: {
          p_invoice_id: string
          p_lines: Record<string, unknown>[]
          p_total_ht: number
          p_total_tva: number
          p_total_ttc: number
        }
        Returns: undefined
      }
      admin_update_user_role: {
        Args: {
          target_user_id: string
          new_role: string
        }
        Returns: {
          success: boolean
          error?: string
        }
      }
    }
  }
}
