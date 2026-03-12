export interface Database {
  public: {
    Tables: {
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
          client: string
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
          client: string
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
          client?: string
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
        }
        Relationships: []
      }
      quotes: {
        Row: {
          id: string
          quote_number: string
          client_id: string
          campaign_id: string | null
          status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'cancelled'
          issued_at: string
          valid_until: string
          notes: string | null
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
          status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'cancelled'
          issued_at?: string
          valid_until?: string
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
          quote_number?: string
          client_id?: string
          campaign_id?: string | null
          status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'cancelled'
          issued_at?: string
          valid_until?: string
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
      quote_lines: {
        Row: {
          id: string
          quote_id: string
          description: string
          quantity: number
          unit: string
          unit_price: number
          tva_rate: number
          total_ht: number
          sort_order: number
        }
        Insert: {
          id?: string
          quote_id: string
          description: string
          quantity?: number
          unit?: string
          unit_price?: number
          tva_rate?: number
          total_ht?: number
          sort_order?: number
        }
        Update: {
          id?: string
          quote_id?: string
          description?: string
          quantity?: number
          unit?: string
          unit_price?: number
          tva_rate?: number
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
          description: string
          quantity: number
          unit: string
          unit_price: number
          tva_rate: number
          total_ht: number
          sort_order: number
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity?: number
          unit?: string
          unit_price?: number
          tva_rate?: number
          total_ht?: number
          sort_order?: number
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          quantity?: number
          unit?: string
          unit_price?: number
          tva_rate?: number
          total_ht?: number
          sort_order?: number
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
    }
    Views: {
      [_ in never]: never
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
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
