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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      deals: {
        Row: {
          checkout_url: string | null
          created_at: string
          deal_terms: Json | null
          flowglad_reference: string | null
          id: string
          panel_id: string
          status: Database["public"]["Enums"]["deal_status"]
        }
        Insert: {
          checkout_url?: string | null
          created_at?: string
          deal_terms?: Json | null
          flowglad_reference?: string | null
          id?: string
          panel_id: string
          status?: Database["public"]["Enums"]["deal_status"]
        }
        Update: {
          checkout_url?: string | null
          created_at?: string
          deal_terms?: Json | null
          flowglad_reference?: string | null
          id?: string
          panel_id?: string
          status?: Database["public"]["Enums"]["deal_status"]
        }
        Relationships: [
          {
            foreignKeyName: "deals_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "panels"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          companies_invested: string | null
          created_at: string | null
          id: string
          investment_thesis: string | null
          investor_id: string | null
          investor_type: string | null
          job_title: string | null
          name: string
          risk_tolerance: string | null
        }
        Insert: {
          companies_invested?: string | null
          created_at?: string | null
          id?: string
          investment_thesis?: string | null
          investor_id?: string | null
          investor_type?: string | null
          job_title?: string | null
          name: string
          risk_tolerance?: string | null
        }
        Update: {
          companies_invested?: string | null
          created_at?: string | null
          id?: string
          investment_thesis?: string | null
          investor_id?: string | null
          investor_type?: string | null
          job_title?: string | null
          name?: string
          risk_tolerance?: string | null
        }
        Relationships: []
      }
      panels: {
        Row: {
          created_at: string
          id: string
          offers: Json
          personas: Json
          pitch_id: string
          questions: Json
        }
        Insert: {
          created_at?: string
          id?: string
          offers?: Json
          personas?: Json
          pitch_id: string
          questions?: Json
        }
        Update: {
          created_at?: string
          id?: string
          offers?: Json
          personas?: Json
          pitch_id?: string
          questions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "panels_pitch_id_fkey"
            columns: ["pitch_id"]
            isOneToOne: false
            referencedRelation: "pitches"
            referencedColumns: ["id"]
          },
        ]
      }
      pitches: {
        Row: {
          arr: number | null
          ask_amount: number
          created_at: string
          equity_percent: number
          id: string
          mrr: number | null
          parsed_json: Json | null
          raw_pitch_text: string
          stage: Database["public"]["Enums"]["stage"] | null
          startup_name: string | null
          user_id: string
        }
        Insert: {
          arr?: number | null
          ask_amount: number
          created_at?: string
          equity_percent: number
          id?: string
          mrr?: number | null
          parsed_json?: Json | null
          raw_pitch_text: string
          stage?: Database["public"]["Enums"]["stage"] | null
          startup_name?: string | null
          user_id: string
        }
        Update: {
          arr?: number | null
          ask_amount?: number
          created_at?: string
          equity_percent?: number
          id?: string
          mrr?: number | null
          parsed_json?: Json | null
          raw_pitch_text?: string
          stage?: Database["public"]["Enums"]["stage"] | null
          startup_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          deals_today: number
          id: string
          last_reset_date: string
          panels_today: number
          plan: string
          plan_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deals_today?: number
          id?: string
          last_reset_date?: string
          panels_today?: number
          plan?: string
          plan_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deals_today?: number
          id?: string
          last_reset_date?: string
          panels_today?: number
          plan?: string
          plan_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      startup_pitches: {
        Row: {
          arr: number | null
          ask_amount: number
          created_at: string | null
          equity_percent: number
          id: string
          mrr: number | null
          pitch_text: string
          stage: string
          startup_id: string | null
          startup_name: string
        }
        Insert: {
          arr?: number | null
          ask_amount: number
          created_at?: string | null
          equity_percent: number
          id?: string
          mrr?: number | null
          pitch_text: string
          stage: string
          startup_id?: string | null
          startup_name: string
        }
        Update: {
          arr?: number | null
          ask_amount?: number
          created_at?: string | null
          equity_percent?: number
          id?: string
          mrr?: number | null
          pitch_text?: string
          stage?: string
          startup_id?: string | null
          startup_name?: string
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
      deal_status: "draft" | "accepted" | "declined" | "paid"
      stage: "Pre-Seed" | "Seed" | "Series A" | "Series B" | "Series C"
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
      deal_status: ["draft", "accepted", "declined", "paid"],
      stage: ["Pre-Seed", "Seed", "Series A", "Series B", "Series C"],
    },
  },
} as const
