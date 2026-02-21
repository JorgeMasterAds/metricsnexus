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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      conversions: {
        Row: {
          amount: number
          click_id: string | null
          created_at: string
          currency: string
          id: string
          is_order_bump: boolean
          paid_at: string | null
          platform: string
          product_name: string | null
          raw_payload: Json | null
          smart_link_id: string | null
          status: string
          transaction_id: string
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          amount?: number
          click_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_order_bump?: boolean
          paid_at?: string | null
          platform: string
          product_name?: string | null
          raw_payload?: Json | null
          smart_link_id?: string | null
          status?: string
          transaction_id: string
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          amount?: number
          click_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_order_bump?: boolean
          paid_at?: string | null
          platform?: string
          product_name?: string | null
          raw_payload?: Json | null
          smart_link_id?: string | null
          status?: string
          transaction_id?: string
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversions_smart_link_id_fkey"
            columns: ["smart_link_id"]
            isOneToOne: false
            referencedRelation: "smart_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cakto_webhook_secret: string | null
          created_at: string
          custom_domain: string | null
          email: string | null
          full_name: string | null
          gamification_goal: number
          hotmart_webhook_secret: string | null
          id: string
          integration_platform: string | null
          updated_at: string
        }
        Insert: {
          cakto_webhook_secret?: string | null
          created_at?: string
          custom_domain?: string | null
          email?: string | null
          full_name?: string | null
          gamification_goal?: number
          hotmart_webhook_secret?: string | null
          id: string
          integration_platform?: string | null
          updated_at?: string
        }
        Update: {
          cakto_webhook_secret?: string | null
          created_at?: string
          custom_domain?: string | null
          email?: string | null
          full_name?: string | null
          gamification_goal?: number
          hotmart_webhook_secret?: string | null
          id?: string
          integration_platform?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      smart_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          smart_link_id: string
          updated_at: string
          url: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          smart_link_id: string
          updated_at?: string
          url: string
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          smart_link_id?: string
          updated_at?: string
          url?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "variants_smart_link_id_fkey"
            columns: ["smart_link_id"]
            isOneToOne: false
            referencedRelation: "smart_links"
            referencedColumns: ["id"]
          },
        ]
      }
      views: {
        Row: {
          click_id: string
          created_at: string
          device: string | null
          id: string
          ip_hash: string | null
          referer: string | null
          smart_link_id: string
          user_agent: string | null
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          variant_id: string
        }
        Insert: {
          click_id: string
          created_at?: string
          device?: string | null
          id?: string
          ip_hash?: string | null
          referer?: string | null
          smart_link_id: string
          user_agent?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant_id: string
        }
        Update: {
          click_id?: string
          created_at?: string
          device?: string | null
          id?: string
          ip_hash?: string | null
          referer?: string | null
          smart_link_id?: string
          user_agent?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "views_smart_link_id_fkey"
            columns: ["smart_link_id"]
            isOneToOne: false
            referencedRelation: "smart_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "views_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          attributed_click_id: string | null
          attributed_variant_id: string | null
          created_at: string
          event_type: string | null
          id: string
          ignore_reason: string | null
          is_attributed: boolean
          platform: string
          raw_payload: Json | null
          status: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          attributed_click_id?: string | null
          attributed_variant_id?: string | null
          created_at?: string
          event_type?: string | null
          id?: string
          ignore_reason?: string | null
          is_attributed?: boolean
          platform: string
          raw_payload?: Json | null
          status?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          attributed_click_id?: string | null
          attributed_variant_id?: string | null
          created_at?: string
          event_type?: string | null
          id?: string
          ignore_reason?: string | null
          is_attributed?: boolean
          platform?: string
          raw_payload?: Json | null
          status?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
