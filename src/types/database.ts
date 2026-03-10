export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: 'admin' | 'operator'
          phone: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          role: 'admin' | 'operator'
          phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: 'admin' | 'operator'
          phone?: string | null
          created_at?: string
        }
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
      }
      campaigns: {
        Row: {
          id: string
          name: string
          client: string
          description: string | null
          start_date: string
          end_date: string
          status: 'draft' | 'active' | 'completed' | 'cancelled'
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          client: string
          description?: string | null
          start_date: string
          end_date: string
          status?: 'draft' | 'active' | 'completed' | 'cancelled'
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          client?: string
          description?: string | null
          start_date?: string
          end_date?: string
          status?: 'draft' | 'active' | 'completed' | 'cancelled'
          created_by?: string | null
          created_at?: string
        }
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
      }
    }
  }
}
