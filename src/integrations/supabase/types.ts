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
      conversion_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          project_id: string | null
          raw_payload: Json | null
          transaction_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          project_id?: string | null
          raw_payload?: Json | null
          transaction_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          project_id?: string | null
          raw_payload?: Json | null
          transaction_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
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
          project_id: string | null
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
          project_id?: string | null
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
          project_id?: string | null
          raw_payload?: Json | null
          smart_link_id?: string | null
          status?: string
          transaction_id?: string
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
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
      daily_metrics: {
        Row: {
          conversions: number
          date: string
          id: string
          project_id: string | null
          revenue: number
          smart_link_id: string | null
          user_id: string
          variant_id: string | null
          views: number
        }
        Insert: {
          conversions?: number
          date: string
          id?: string
          project_id?: string | null
          revenue?: number
          smart_link_id?: string | null
          user_id: string
          variant_id?: string | null
          views?: number
        }
        Update: {
          conversions?: number
          date?: string
          id?: string
          project_id?: string | null
          revenue?: number
          smart_link_id?: string | null
          user_id?: string
          variant_id?: string | null
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          webhook_secret: string | null
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
          webhook_secret?: string | null
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
          webhook_secret?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      redirect_errors: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          slug: string | null
          smart_link_id: string | null
          status_code: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          slug?: string | null
          smart_link_id?: string | null
          status_code: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          slug?: string | null
          smart_link_id?: string | null
          status_code?: number
          variant_id?: string | null
        }
        Relationships: []
      }
      smart_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          project_id: string | null
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          project_id?: string | null
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          project_id?: string | null
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
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
          project_id: string | null
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
          project_id?: string | null
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
          project_id?: string | null
          smart_link_id?: string
          updated_at?: string
          url?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "variants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
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
          is_suspect: boolean | null
          project_id: string | null
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
          is_suspect?: boolean | null
          project_id?: string | null
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
          is_suspect?: boolean | null
          project_id?: string | null
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
            foreignKeyName: "views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
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
          project_id: string | null
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
          project_id?: string | null
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
          project_id?: string | null
          raw_payload?: Json | null
          status?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      plan_type: "bronze" | "prata" | "ouro"
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
    Enums: {
      plan_type: ["bronze", "prata", "ouro"],
    },
  },
} as const
