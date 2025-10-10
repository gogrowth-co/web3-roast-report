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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      anonymous_roasts: {
        Row: {
          ai_analysis: Json | null
          claimed_by_user_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          expires_at: string | null
          id: string
          processed_at: string | null
          score: number | null
          screenshot_url: string | null
          session_id: string
          status: string
          url: string
        }
        Insert: {
          ai_analysis?: Json | null
          claimed_by_user_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          processed_at?: string | null
          score?: number | null
          screenshot_url?: string | null
          session_id: string
          status?: string
          url: string
        }
        Update: {
          ai_analysis?: Json | null
          claimed_by_user_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          processed_at?: string | null
          score?: number | null
          screenshot_url?: string | null
          session_id?: string
          status?: string
          url?: string
        }
        Relationships: []
      }
      feedback_items: {
        Row: {
          category: string
          created_at: string | null
          feedback: string
          id: string
          roast_id: string | null
          severity: string
        }
        Insert: {
          category: string
          created_at?: string | null
          feedback: string
          id?: string
          roast_id?: string | null
          severity: string
        }
        Update: {
          category?: string
          created_at?: string | null
          feedback?: string
          id?: string
          roast_id?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_items_roast_id_fkey"
            columns: ["roast_id"]
            isOneToOne: false
            referencedRelation: "roasts"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          price_id: string | null
          session_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          price_id?: string | null
          session_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          price_id?: string | null
          session_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      roast_results: {
        Row: {
          created_at: string | null
          id: string
          result_json: Json
          roast_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          result_json: Json
          roast_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          result_json?: Json
          roast_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      roasts: {
        Row: {
          ai_analysis: Json | null
          completed_at: string | null
          created_at: string | null
          expert_analysis: Json | null
          id: string
          score: number | null
          screenshot_url: string | null
          status: string
          url: string
          user_id: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          completed_at?: string | null
          created_at?: string | null
          expert_analysis?: Json | null
          id?: string
          score?: number | null
          screenshot_url?: string | null
          status?: string
          url: string
          user_id?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          completed_at?: string | null
          created_at?: string | null
          expert_analysis?: Json | null
          id?: string
          score?: number | null
          screenshot_url?: string | null
          status?: string
          url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      shared_roasts: {
        Row: {
          id: string
          inserted_at: string
          roast_id: string
          share_id: string
        }
        Insert: {
          id?: string
          inserted_at?: string
          roast_id: string
          share_id: string
        }
        Update: {
          id?: string
          inserted_at?: string
          roast_id?: string
          share_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_roasts_roast_id_fkey"
            columns: ["roast_id"]
            isOneToOne: false
            referencedRelation: "roasts"
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
