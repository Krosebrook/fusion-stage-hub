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
      approvals: {
        Row: {
          action: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          expires_at: string | null
          id: string
          org_id: string
          payload: Json
          requested_by: string
          resource_id: string
          resource_type: string
          status: Database["public"]["Enums"]["approval_status"]
        }
        Insert: {
          action: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          expires_at?: string | null
          id?: string
          org_id: string
          payload: Json
          requested_by: string
          resource_id: string
          resource_type: string
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Update: {
          action?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          expires_at?: string | null
          id?: string
          org_id?: string
          payload?: Json
          requested_by?: string
          resource_id?: string
          resource_type?: string
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "approvals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          org_id: string
          resource_id: string | null
          resource_type: string
          soc2_tags: string[] | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          org_id: string
          resource_id?: string | null
          resource_type: string
          soc2_tags?: string[] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          org_id?: string
          resource_id?: string | null
          resource_type?: string
          soc2_tags?: string[] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          budget_type: string
          created_at: string
          current_value: number
          id: string
          is_frozen: boolean | null
          limit_value: number
          name: string
          org_id: string
          period: string
          reset_at: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          budget_type: string
          created_at?: string
          current_value?: number
          id?: string
          is_frozen?: boolean | null
          limit_value: number
          name: string
          org_id: string
          period: string
          reset_at: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          budget_type?: string
          created_at?: string
          current_value?: number
          id?: string
          is_frozen?: boolean | null
          limit_value?: number
          name?: string
          org_id?: string
          period?: string
          reset_at?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          claimed_at: string | null
          claimed_by: string | null
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          job_type: string
          last_error: string | null
          max_attempts: number
          org_id: string
          payload: Json
          priority: number
          result: Json | null
          scheduled_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          store_id: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          job_type: string
          last_error?: string | null
          max_attempts?: number
          org_id: string
          payload?: Json
          priority?: number
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          job_type?: string
          last_error?: string | null
          max_attempts?: number
          org_id?: string
          payload?: Json
          priority?: number
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          last_published_at: string | null
          platform_data: Json | null
          price_override: number | null
          product_id: string
          staged_changes: Json | null
          status: Database["public"]["Enums"]["listing_status"]
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          last_published_at?: string | null
          platform_data?: Json | null
          price_override?: number | null
          product_id: string
          staged_changes?: Json | null
          status?: Database["public"]["Enums"]["listing_status"]
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          last_published_at?: string | null
          platform_data?: Json | null
          price_override?: number | null
          product_id?: string
          staged_changes?: Json | null
          status?: Database["public"]["Enums"]["listing_status"]
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          metadata: Json | null
          org_id: string
          position: number | null
          product_id: string | null
          type: string | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          org_id: string
          position?: number | null
          product_id?: string | null
          type?: string | null
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          position?: number | null
          product_id?: string | null
          type?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["org_member_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_member_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_member_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      plugin_contracts: {
        Row: {
          automation_enabled: boolean | null
          capability: string
          constraints: Json | null
          created_at: string
          id: string
          level: Database["public"]["Enums"]["capability_level"]
          plugin_id: string
          workaround_description: string | null
        }
        Insert: {
          automation_enabled?: boolean | null
          capability: string
          constraints?: Json | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["capability_level"]
          plugin_id: string
          workaround_description?: string | null
        }
        Update: {
          automation_enabled?: boolean | null
          capability?: string
          constraints?: Json | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["capability_level"]
          plugin_id?: string
          workaround_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plugin_contracts_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "plugins"
            referencedColumns: ["id"]
          },
        ]
      }
      plugin_instances: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          is_enabled: boolean | null
          plugin_id: string
          store_id: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          plugin_id: string
          store_id: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          plugin_id?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plugin_instances_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "plugins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plugin_instances_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      plugins: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          base_price: number | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          metadata: Json | null
          org_id: string
          sku: string
          title: string
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          sku: string
          title: string
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          sku?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings_definitions: {
        Row: {
          created_at: string
          default_value: Json | null
          description: string | null
          id: string
          key: string
          name: string
          schema: Json
          scope: Database["public"]["Enums"]["settings_scope"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_value?: Json | null
          description?: string | null
          id?: string
          key: string
          name: string
          schema: Json
          scope?: Database["public"]["Enums"]["settings_scope"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_value?: Json | null
          description?: string | null
          id?: string
          key?: string
          name?: string
          schema?: Json
          scope?: Database["public"]["Enums"]["settings_scope"]
          updated_at?: string
        }
        Relationships: []
      }
      settings_values: {
        Row: {
          created_at: string
          created_by: string | null
          definition_id: string
          id: string
          is_active: boolean | null
          scope: Database["public"]["Enums"]["settings_scope"]
          scope_id: string | null
          value: Json
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          definition_id: string
          id?: string
          is_active?: boolean | null
          scope: Database["public"]["Enums"]["settings_scope"]
          scope_id?: string | null
          value: Json
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          definition_id?: string
          id?: string
          is_active?: boolean | null
          scope?: Database["public"]["Enums"]["settings_scope"]
          scope_id?: string | null
          value?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "settings_values_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "settings_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          credentials_encrypted: string | null
          external_id: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          name: string
          org_id: string
          platform: string
          rate_limit_state: Json | null
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials_encrypted?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          name: string
          org_id: string
          platform: string
          rate_limit_state?: Json | null
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials_encrypted?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          name?: string
          org_id?: string
          platform?: string
          rate_limit_state?: Json | null
          settings?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      variants: {
        Row: {
          created_at: string
          id: string
          inventory_quantity: number | null
          name: string
          options: Json | null
          price: number | null
          product_id: string
          sku: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_quantity?: number | null
          name: string
          options?: Json | null
          price?: number | null
          product_id: string
          sku: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_quantity?: number | null
          name?: string
          options?: Json | null
          price?: number | null
          product_id?: string
          sku?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          external_id: string
          id: string
          payload: Json
          processed_at: string | null
          signature: string | null
          status: Database["public"]["Enums"]["webhook_status"]
          store_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          external_id: string
          id?: string
          payload: Json
          processed_at?: string | null
          signature?: string | null
          status?: Database["public"]["Enums"]["webhook_status"]
          store_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          external_id?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          signature?: string | null
          status?: Database["public"]["Enums"]["webhook_status"]
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_write_org: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: boolean
      }
      claim_due_jobs: {
        Args: { p_limit: number; p_org_id: string; p_worker_id: string }
        Returns: {
          attempts: number
          claimed_at: string | null
          claimed_by: string | null
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          job_type: string
          last_error: string | null
          max_attempts: number
          org_id: string
          payload: Json
          priority: number
          result: Json | null
          scheduled_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          store_id: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_org_role: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: Database["public"]["Enums"]["org_member_role"]
      }
      is_org_member: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      approval_status: "pending" | "approved" | "rejected" | "expired"
      capability_level: "native" | "workaround" | "unsupported"
      job_status:
        | "pending"
        | "claimed"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
      listing_status:
        | "draft"
        | "staged"
        | "publishing"
        | "published"
        | "failed"
        | "delisted"
      org_member_role: "owner" | "operator" | "viewer"
      settings_scope:
        | "global"
        | "org"
        | "store"
        | "plugin_instance"
        | "workflow"
      webhook_status: "received" | "processing" | "processed" | "failed"
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
      approval_status: ["pending", "approved", "rejected", "expired"],
      capability_level: ["native", "workaround", "unsupported"],
      job_status: [
        "pending",
        "claimed",
        "running",
        "completed",
        "failed",
        "cancelled",
      ],
      listing_status: [
        "draft",
        "staged",
        "publishing",
        "published",
        "failed",
        "delisted",
      ],
      org_member_role: ["owner", "operator", "viewer"],
      settings_scope: ["global", "org", "store", "plugin_instance", "workflow"],
      webhook_status: ["received", "processing", "processed", "failed"],
    },
  },
} as const
