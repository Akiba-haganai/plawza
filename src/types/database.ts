export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      accommodation_enquiries: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          message: string | null
          owner_id: string
          owner_note: string | null
          preferred_viewing_at: string | null
          requester_id: string
          requester_name: string
          requester_phone: string | null
          status: Database["public"]["Enums"]["enquiry_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          message?: string | null
          owner_id: string
          owner_note?: string | null
          preferred_viewing_at?: string | null
          requester_id: string
          requester_name: string
          requester_phone?: string | null
          status?: Database["public"]["Enums"]["enquiry_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          owner_id?: string
          owner_note?: string | null
          preferred_viewing_at?: string | null
          requester_id?: string
          requester_name?: string
          requester_phone?: string | null
          status?: Database["public"]["Enums"]["enquiry_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_enquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "accommodation_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_enquiries_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_enquiries_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          listing_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          listing_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "accommodation_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_listings: {
        Row: {
          amenities: string[]
          area: string
          availability: Database["public"]["Enums"]["availability"]
          available_from: string | null
          bathrooms: number | null
          bedrooms: number | null
          campus_id: string | null
          contact_shared: boolean
          created_at: string
          deposit_zmw: number | null
          description: string
          distance_note: string | null
          furnished: boolean
          id: string
          last_confirmed_at: string
          listing_type: string
          owner_id: string
          rejection_reason: string | null
          rent_zmw: number
          reviewed_at: string | null
          reviewed_by: string | null
          search_tsv: unknown
          status: Database["public"]["Enums"]["content_status"]
          title: string
          town_id: string
          updated_at: string
          utilities_included: string[]
        }
        Insert: {
          amenities?: string[]
          area: string
          availability?: Database["public"]["Enums"]["availability"]
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          campus_id?: string | null
          contact_shared?: boolean
          created_at?: string
          deposit_zmw?: number | null
          description: string
          distance_note?: string | null
          furnished?: boolean
          id?: string
          last_confirmed_at?: string
          listing_type: string
          owner_id: string
          rejection_reason?: string | null
          rent_zmw: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_tsv?: unknown
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          town_id: string
          updated_at?: string
          utilities_included?: string[]
        }
        Update: {
          amenities?: string[]
          area?: string
          availability?: Database["public"]["Enums"]["availability"]
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          campus_id?: string | null
          contact_shared?: boolean
          created_at?: string
          deposit_zmw?: number | null
          description?: string
          distance_note?: string | null
          furnished?: boolean
          id?: string
          last_confirmed_at?: string
          listing_type?: string
          owner_id?: string
          rejection_reason?: string | null
          rent_zmw?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_tsv?: unknown
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          town_id?: string
          updated_at?: string
          utilities_included?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_listings_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_listings_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_listings_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          area: string
          category_id: string | null
          cover_path: string | null
          created_at: string
          description: string | null
          id: string
          logo_path: string | null
          name: string
          opening_hours: Json | null
          owner_id: string
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          search_tsv: unknown
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          town_id: string
          updated_at: string
          whatsapp_phone: string | null
        }
        Insert: {
          area: string
          category_id?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_path?: string | null
          name: string
          opening_hours?: Json | null
          owner_id: string
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_tsv?: unknown
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          town_id: string
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Update: {
          area?: string
          category_id?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_path?: string | null
          name?: string
          opening_hours?: Json | null
          owner_id?: string
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_tsv?: unknown
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          town_id?: string
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      campuses: {
        Row: {
          id: string
          name: string
          short_name: string | null
          town_id: string
        }
        Insert: {
          id?: string
          name: string
          short_name?: string | null
          town_id: string
        }
        Update: {
          id?: string
          name?: string
          short_name?: string | null
          town_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campuses_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_items: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          item_category: string | null
          name: string
          price_zmw: number | null
          sort_order: number
          stock_status: string
          stock_updated_at: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          item_category?: string | null
          name: string
          price_zmw?: number | null
          sort_order?: number
          stock_status?: string
          stock_updated_at?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          item_category?: string | null
          name?: string
          price_zmw?: number | null
          sort_order?: number
          stock_status?: string
          stock_updated_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_reveals: {
        Row: {
          created_at: string
          entity_id: string
          entity_kind: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_kind: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_kind?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_reveals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favourites: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          listing_id: string | null
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favourites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "accommodation_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favourites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_reports: {
        Row: {
          business_id: string | null
          created_at: string
          details: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          listing_id: string | null
          reason: string
          reporter_id: string
          resolution_note: string | null
          roommate_id: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          details?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          listing_id?: string | null
          reason: string
          reporter_id: string
          resolution_note?: string | null
          roommate_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          business_id?: string | null
          created_at?: string
          details?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          listing_id?: string | null
          reason?: string
          reporter_id?: string
          resolution_note?: string | null
          roommate_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "listing_reports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_reports_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "accommodation_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_reports_roommate_id_fkey"
            columns: ["roommate_id"]
            isOneToOne: false
            referencedRelation: "roommate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          entity_id: string
          entity_kind: string
          id: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          entity_id: string
          entity_kind: string
          id?: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          entity_id?: string
          entity_kind?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      private_contacts: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          owner_id: string
          phone: string
          roommate_id: string | null
          updated_at: string
          whatsapp_phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          owner_id: string
          phone: string
          roommate_id?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          owner_id?: string
          phone?: string
          roommate_id?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_contact_roommate"
            columns: ["roommate_id"]
            isOneToOne: false
            referencedRelation: "roommate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_contacts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "accommodation_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      roommate_profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          budget_max_zmw: number | null
          budget_min_zmw: number | null
          campus_id: string | null
          contact_shared: boolean
          created_at: string
          display_name: string
          gender: string | null
          gender_pref: string
          guests: string | null
          id: string
          move_in_date: string | null
          noise_level: string | null
          owner_id: string
          preferred_areas: string[]
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          room_sharing: string | null
          status: Database["public"]["Enums"]["content_status"]
          study_routine: string | null
          tidiness: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          budget_max_zmw?: number | null
          budget_min_zmw?: number | null
          campus_id?: string | null
          contact_shared?: boolean
          created_at?: string
          display_name: string
          gender?: string | null
          gender_pref?: string
          guests?: string | null
          id?: string
          move_in_date?: string | null
          noise_level?: string | null
          owner_id: string
          preferred_areas?: string[]
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_sharing?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          study_routine?: string | null
          tidiness?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          budget_max_zmw?: number | null
          budget_min_zmw?: number | null
          campus_id?: string | null
          contact_shared?: boolean
          created_at?: string
          display_name?: string
          gender?: string | null
          gender_pref?: string
          guests?: string | null
          id?: string
          move_in_date?: string | null
          noise_level?: string | null
          owner_id?: string
          preferred_areas?: string[]
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_sharing?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          study_routine?: string | null
          tidiness?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roommate_profiles_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roommate_profiles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roommate_profiles_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      towns: {
        Row: {
          id: string
          name: string
          province: string
        }
        Insert: {
          id?: string
          name: string
          province: string
        }
        Update: {
          id?: string
          name?: string
          province?: string
        }
        Relationships: []
      }
      verifications: {
        Row: {
          business_id: string | null
          check_type: string
          checked_at: string
          checked_by: string
          id: string
          listing_id: string | null
          profile_id: string | null
          revoked_at: string | null
        }
        Insert: {
          business_id?: string | null
          check_type: string
          checked_at?: string
          checked_by: string
          id?: string
          listing_id?: string | null
          profile_id?: string | null
          revoked_at?: string | null
        }
        Update: {
          business_id?: string | null
          check_type?: string
          checked_at?: string
          checked_by?: string
          id?: string
          listing_id?: string | null
          profile_id?: string | null
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "accommodation_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      match_roommates: {
        Args: { p_limit?: number }
        Returns: {
          avatar_path: string
          bio: string
          budget_max_zmw: number
          budget_min_zmw: number
          campus_id: string
          criteria_compared: number
          display_name: string
          profile_id: string
          reasons: string[]
          score: number
        }[]
      }
      moderate_content: {
        Args: {
          p_action: string
          p_id: string
          p_kind: string
          p_reason?: string
        }
        Returns: undefined
      }
      resolve_report: {
        Args: {
          p_note?: string
          p_report_id: string
          p_status: Database["public"]["Enums"]["report_status"]
        }
        Returns: undefined
      }
      reveal_contact: {
        Args: { p_id: string; p_kind: string }
        Returns: {
          phone: string
          whatsapp_phone: string
        }[]
      }
    }
    Enums: {
      app_role: "moderator" | "admin"
      availability: "available" | "pending" | "occupied"
      content_status:
        | "draft"
        | "pending"
        | "active"
        | "rejected"
        | "archived"
        | "suspended"
      enquiry_status: "new" | "contacted" | "closed"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["moderator", "admin"],
      availability: ["available", "pending", "occupied"],
      content_status: [
        "draft",
        "pending",
        "active",
        "rejected",
        "archived",
        "suspended",
      ],
      enquiry_status: ["new", "contacted", "closed"],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
    },
  },
} as const
