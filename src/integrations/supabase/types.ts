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
      account_users: {
        Row: {
          accepted_at: string | null
          account_id: string
          id: string
          invited_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          account_id: string
          id?: string
          invited_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          account_id?: string
          id?: string
          invited_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_users_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          address: string | null
          admin_email: string | null
          cnpj: string | null
          company_name: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          responsible_name: string | null
          slug: string | null
          tax_rate: number | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_email?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          responsible_name?: string | null
          slug?: string | null
          tax_rate?: number | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_email?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          responsible_name?: string | null
          slug?: string | null
          tax_rate?: number | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ad_accounts: {
        Row: {
          account_id: string
          created_at: string
          external_account_id: string
          id: string
          integration_id: string
          name: string | null
          platform: Database["public"]["Enums"]["ad_platform"]
        }
        Insert: {
          account_id: string
          created_at?: string
          external_account_id: string
          id?: string
          integration_id: string
          name?: string | null
          platform: Database["public"]["Enums"]["ad_platform"]
        }
        Update: {
          account_id?: string
          created_at?: string
          external_account_id?: string
          id?: string
          integration_id?: string
          name?: string | null
          platform?: Database["public"]["Enums"]["ad_platform"]
        }
        Relationships: [
          {
            foreignKeyName: "ad_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_accounts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_accounts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_spend: {
        Row: {
          account_id: string
          ad_account_id: string | null
          ad_name: string | null
          adset_name: string | null
          campaign_id: string | null
          campaign_name: string | null
          clicks: number | null
          created_at: string
          date: string
          id: string
          impressions: number | null
          platform: Database["public"]["Enums"]["ad_platform"]
          spend: number | null
        }
        Insert: {
          account_id: string
          ad_account_id?: string | null
          ad_name?: string | null
          adset_name?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          clicks?: number | null
          created_at?: string
          date: string
          id?: string
          impressions?: number | null
          platform: Database["public"]["Enums"]["ad_platform"]
          spend?: number | null
        }
        Update: {
          account_id?: string
          ad_account_id?: string | null
          ad_name?: string | null
          adset_name?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          clicks?: number | null
          created_at?: string
          date?: string
          id?: string
          impressions?: number | null
          platform?: Database["public"]["Enums"]["ad_platform"]
          spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_spend_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_spend_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      clicks: {
        Row: {
          account_id: string
          click_id: string
          country: string | null
          created_at: string
          device_type: string | null
          id: string
          ip: string | null
          project_id: string | null
          referrer: string | null
          smartlink_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          variant_id: string | null
        }
        Insert: {
          account_id: string
          click_id: string
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip?: string | null
          project_id?: string | null
          referrer?: string | null
          smartlink_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant_id?: string | null
        }
        Update: {
          account_id?: string
          click_id?: string
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip?: string | null
          project_id?: string | null
          referrer?: string | null
          smartlink_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clicks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_smartlink_id_fkey"
            columns: ["smartlink_id"]
            isOneToOne: false
            referencedRelation: "smartlinks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "smartlink_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          id: string
          period_end: string | null
          period_start: string | null
          referral_id: string
          status: Database["public"]["Enums"]["payout_status"] | null
        }
        Insert: {
          account_id: string
          amount?: number
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          referral_id: string
          status?: Database["public"]["Enums"]["payout_status"] | null
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          referral_id?: string
          status?: Database["public"]["Enums"]["payout_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_events: {
        Row: {
          account_id: string | null
          created_at: string
          event_type: string
          id: string
          raw_payload: Json | null
          transaction_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          raw_payload?: Json | null
          transaction_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          raw_payload?: Json | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversion_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_items: {
        Row: {
          account_id: string | null
          amount: number | null
          conversion_id: string
          created_at: string
          id: string
          is_order_bump: boolean | null
          product_id: string | null
          product_name: string
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          conversion_id: string
          created_at?: string
          id?: string
          is_order_bump?: boolean | null
          product_id?: string | null
          product_name: string
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          conversion_id?: string
          created_at?: string
          id?: string
          is_order_bump?: boolean | null
          product_id?: string | null
          product_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversion_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_items_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: false
            referencedRelation: "conversions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      conversions: {
        Row: {
          account_id: string | null
          amount: number | null
          click_id: string | null
          created_at: string
          currency: string | null
          fees: number | null
          id: string
          is_order_bump: boolean | null
          net_amount: number | null
          paid_at: string | null
          payment_method: string | null
          platform: string | null
          product_name: string | null
          project_id: string | null
          raw_payload: Json | null
          ref_id: string | null
          smartlink_id: string | null
          status: Database["public"]["Enums"]["conversion_status"] | null
          transaction_id: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          variant_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          click_id?: string | null
          created_at?: string
          currency?: string | null
          fees?: number | null
          id?: string
          is_order_bump?: boolean | null
          net_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          platform?: string | null
          product_name?: string | null
          project_id?: string | null
          raw_payload?: Json | null
          ref_id?: string | null
          smartlink_id?: string | null
          status?: Database["public"]["Enums"]["conversion_status"] | null
          transaction_id: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          click_id?: string | null
          created_at?: string
          currency?: string | null
          fees?: number | null
          id?: string
          is_order_bump?: boolean | null
          net_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          platform?: string | null
          product_name?: string | null
          project_id?: string | null
          raw_payload?: Json | null
          ref_id?: string | null
          smartlink_id?: string | null
          status?: Database["public"]["Enums"]["conversion_status"] | null
          transaction_id?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_smartlink_id_fkey"
            columns: ["smartlink_id"]
            isOneToOne: false
            referencedRelation: "smartlinks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "smartlink_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_domains: {
        Row: {
          account_id: string
          created_at: string
          domain: string
          id: string
          is_active: boolean
          is_verified: boolean
          project_id: string | null
          updated_at: string
          verification_token: string
        }
        Insert: {
          account_id: string
          created_at?: string
          domain: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          project_id?: string | null
          updated_at?: string
          verification_token?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          domain?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          project_id?: string | null
          updated_at?: string
          verification_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_domains_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_domains_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_metrics: {
        Row: {
          account_id: string
          conversions: number | null
          created_at: string
          date: string
          id: string
          revenue: number | null
          smartlink_id: string | null
          variant_id: string | null
          views: number | null
        }
        Insert: {
          account_id: string
          conversions?: number | null
          created_at?: string
          date: string
          id?: string
          revenue?: number | null
          smartlink_id?: string | null
          variant_id?: string | null
          views?: number | null
        }
        Update: {
          account_id?: string
          conversions?: number | null
          created_at?: string
          date?: string
          id?: string
          revenue?: number | null
          smartlink_id?: string | null
          variant_id?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_metrics_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_metrics_smartlink_id_fkey"
            columns: ["smartlink_id"]
            isOneToOne: false
            referencedRelation: "smartlinks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_metrics_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "smartlink_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          created_at: string
          id: string
          layout_json: Json
          page: string
          project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout_json?: Json
          page?: string
          project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          layout_json?: Json
          page?: string
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          account_id: string
          config: Json | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          config?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          config?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          access_token_encrypted: string | null
          account_id: string
          config: Json | null
          created_at: string
          expires_at: string | null
          external_account_id: string | null
          id: string
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token_encrypted: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted?: string | null
          account_id: string
          config?: Json | null
          created_at?: string
          expires_at?: string | null
          external_account_id?: string | null
          id?: string
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token_encrypted?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string | null
          account_id?: string
          config?: Json | null
          created_at?: string
          expires_at?: string | null
          external_account_id?: string | null
          id?: string
          provider?: Database["public"]["Enums"]["integration_provider"]
          refresh_token_encrypted?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          account_id: string
          channel: Database["public"]["Enums"]["notification_channel"] | null
          created_at: string
          daily_report_time: string | null
          id: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          account_id: string
          channel?: Database["public"]["Enums"]["notification_channel"] | null
          created_at?: string
          daily_report_time?: string | null
          id?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          account_id?: string
          channel?: Database["public"]["Enums"]["notification_channel"] | null
          created_at?: string
          daily_report_time?: string | null
          id?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          id: string
          paid_at: string | null
          requested_at: string | null
          status: Database["public"]["Enums"]["payout_status"] | null
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          id?: string
          paid_at?: string | null
          requested_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          requested_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      pixels: {
        Row: {
          account_id: string
          config: Json | null
          created_at: string
          id: string
          name: string
          pixel_id: string
          platform: string
          updated_at: string
        }
        Insert: {
          account_id: string
          config?: Json | null
          created_at?: string
          id?: string
          name: string
          pixel_id: string
          platform: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          config?: Json | null
          created_at?: string
          id?: string
          name?: string
          pixel_id?: string
          platform?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pixels_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          features: Json | null
          id: string
          max_projects: number
          max_smartlinks: number
          max_users: number
          max_webhooks: number
          name: string
          price: number
          stripe_price_id: string | null
          stripe_product_id: string | null
        }
        Insert: {
          created_at?: string
          features?: Json | null
          id?: string
          max_projects?: number
          max_smartlinks?: number
          max_users?: number
          max_webhooks?: number
          name: string
          price?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Update: {
          created_at?: string
          features?: Json | null
          id?: string
          max_projects?: number
          max_smartlinks?: number
          max_users?: number
          max_webhooks?: number
          name?: string
          price?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          log_retention_days: number | null
          login_bg_url: string | null
          max_accounts: number | null
          max_free_events_monthly: number | null
          max_free_users: number | null
          max_projects_per_account: number | null
          max_smartlinks_free: number | null
          max_users_per_account: number | null
          max_webhooks_free: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_retention_days?: number | null
          login_bg_url?: string | null
          max_accounts?: number | null
          max_free_events_monthly?: number | null
          max_free_users?: number | null
          max_projects_per_account?: number | null
          max_smartlinks_free?: number | null
          max_users_per_account?: number | null
          max_webhooks_free?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          log_retention_days?: number | null
          login_bg_url?: string | null
          max_accounts?: number | null
          max_free_events_monthly?: number | null
          max_free_users?: number | null
          max_projects_per_account?: number | null
          max_smartlinks_free?: number | null
          max_users_per_account?: number | null
          max_webhooks_free?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      product_costs: {
        Row: {
          account_id: string
          cost: number
          created_at: string
          effective_from: string
          id: string
          product_id: string
        }
        Insert: {
          account_id: string
          cost: number
          created_at?: string
          effective_from?: string
          id?: string
          product_id: string
        }
        Update: {
          account_id?: string
          cost?: number
          created_at?: string
          effective_from?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_costs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          account_id: string
          cost: number | null
          created_at: string
          external_id: string | null
          id: string
          name: string
          platform: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          cost?: number | null
          created_at?: string
          external_id?: string | null
          id?: string
          name: string
          platform?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          cost?: number | null
          created_at?: string
          external_id?: string | null
          id?: string
          name?: string
          platform?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_users: {
        Row: {
          accepted_at: string | null
          id: string
          invited_at: string | null
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invited_at?: string | null
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invited_at?: string | null
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_users_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          account_id: string
          avatar_url: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          account_id: string
          code: string
          created_at: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          account_id: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          account_id?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code_id: string | null
          referred_account_id: string
          referrer_account_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code_id?: string | null
          referred_account_id: string
          referrer_account_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code_id?: string | null
          referred_account_id?: string
          referrer_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_account_id_fkey"
            columns: ["referred_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_account_id_fkey"
            columns: ["referrer_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_goals: {
        Row: {
          account_id: string
          created_at: string
          goal: number
          id: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          goal?: number
          id?: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          goal?: number
          id?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      smartlink_variants: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          smartlink_id: string
          url: string
          weight: number | null
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          smartlink_id: string
          url: string
          weight?: number | null
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          smartlink_id?: string
          url?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "smartlink_variants_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smartlink_variants_smartlink_id_fkey"
            columns: ["smartlink_id"]
            isOneToOne: false
            referencedRelation: "smartlinks"
            referencedColumns: ["id"]
          },
        ]
      }
      smartlinks: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          project_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          project_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          project_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smartlinks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smartlinks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          account_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string | null
          plan_type: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          plan_type?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          plan_type?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          account_id: string | null
          body: string
          category: string
          created_at: string
          id: string
          subject: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          body: string
          category?: string
          created_at?: string
          id?: string
          subject: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          body?: string
          category?: string
          created_at?: string
          id?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      system_announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "system_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      system_announcements: {
        Row: {
          body: string
          id: string
          published_at: string | null
          title: string
        }
        Insert: {
          body: string
          id?: string
          published_at?: string | null
          title: string
        }
        Update: {
          body?: string
          id?: string
          published_at?: string | null
          title?: string
        }
        Relationships: []
      }
      taxes: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          rate: number
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          rate: number
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "taxes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_limits: {
        Row: {
          account_id: string
          id: string
          max_dashboards: number | null
          max_projects: number | null
          max_smartlinks: number | null
          max_users: number | null
          max_webhooks: number | null
        }
        Insert: {
          account_id: string
          id?: string
          max_dashboards?: number | null
          max_projects?: number | null
          max_smartlinks?: number | null
          max_users?: number | null
          max_webhooks?: number | null
        }
        Update: {
          account_id?: string
          id?: string
          max_dashboards?: number | null
          max_projects?: number | null
          max_smartlinks?: number | null
          max_users?: number | null
          max_webhooks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_limits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          account_id: string | null
          attributed_click_id: string | null
          created_at: string
          event_type: string | null
          id: string
          ignore_reason: string | null
          is_attributed: boolean | null
          platform: string | null
          project_id: string | null
          raw_payload: Json | null
          status: string | null
          transaction_id: string | null
          webhook_id: string | null
        }
        Insert: {
          account_id?: string | null
          attributed_click_id?: string | null
          created_at?: string
          event_type?: string | null
          id?: string
          ignore_reason?: string | null
          is_attributed?: boolean | null
          platform?: string | null
          project_id?: string | null
          raw_payload?: Json | null
          status?: string | null
          transaction_id?: string | null
          webhook_id?: string | null
        }
        Update: {
          account_id?: string | null
          attributed_click_id?: string | null
          created_at?: string
          event_type?: string | null
          id?: string
          ignore_reason?: string | null
          is_attributed?: boolean | null
          platform?: string | null
          project_id?: string | null
          raw_payload?: Json | null
          status?: string | null
          transaction_id?: string | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          webhook_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          webhook_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_products_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          platform: string | null
          platform_name: string | null
          project_id: string | null
          token: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          platform?: string | null
          platform_name?: string | null
          project_id?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          platform?: string | null
          platform_name?: string | null
          project_id?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      integrations_safe: {
        Row: {
          account_id: string | null
          config: Json | null
          created_at: string | null
          expires_at: string | null
          external_account_id: string | null
          id: string | null
          provider: Database["public"]["Enums"]["integration_provider"] | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          config?: Json | null
          created_at?: string | null
          expires_at?: string | null
          external_account_id?: string | null
          id?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"] | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          config?: Json | null
          created_at?: string | null
          expires_at?: string | null
          external_account_id?: string | null
          id?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_old_webhook_logs: { Args: never; Returns: undefined }
      find_user_id_by_email: { Args: { _email: string }; Returns: string }
      get_user_account_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_emails_by_ids: {
        Args: { _user_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      user_has_admin_access: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      ad_platform: "meta" | "google" | "tiktok" | "other"
      app_role: "owner" | "admin" | "member"
      conversion_status:
        | "approved"
        | "refunded"
        | "chargedback"
        | "canceled"
        | "pending"
      integration_provider:
        | "meta_ads"
        | "google_ads"
        | "hotmart"
        | "eduzz"
        | "kiwify"
        | "monetizze"
        | "other"
      notification_channel: "email" | "webhook"
      payout_status: "pending" | "approved" | "paid" | "rejected"
      subscription_status: "active" | "canceled" | "past_due" | "trialing"
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
      ad_platform: ["meta", "google", "tiktok", "other"],
      app_role: ["owner", "admin", "member"],
      conversion_status: [
        "approved",
        "refunded",
        "chargedback",
        "canceled",
        "pending",
      ],
      integration_provider: [
        "meta_ads",
        "google_ads",
        "hotmart",
        "eduzz",
        "kiwify",
        "monetizze",
        "other",
      ],
      notification_channel: ["email", "webhook"],
      payout_status: ["pending", "approved", "paid", "rejected"],
      subscription_status: ["active", "canceled", "past_due", "trialing"],
    },
  },
} as const
