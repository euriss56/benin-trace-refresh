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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      imei_checks: {
        Row: {
          checked_at: string
          city: string | null
          id: string
          imei: string
          latency_ms: number | null
          result: string
          risk_score: number
          source: string | null
          user_id: string | null
        }
        Insert: {
          checked_at?: string
          city?: string | null
          id?: string
          imei: string
          latency_ms?: number | null
          result: string
          risk_score: number
          source?: string | null
          user_id?: string | null
        }
        Update: {
          checked_at?: string
          city?: string | null
          id?: string
          imei?: string
          latency_ms?: number | null
          result?: string
          risk_score?: number
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ml_training_logs: {
        Row: {
          accuracy: number | null
          created_at: string
          duration_seconds: number | null
          epochs: number
          id: string
          loss: number | null
          model_name: string
          status: string
          training_samples: number
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          duration_seconds?: number | null
          epochs?: number
          id?: string
          loss?: number | null
          model_name?: string
          status?: string
          training_samples?: number
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          duration_seconds?: number | null
          epochs?: number
          id?: string
          loss?: number | null
          model_name?: string
          status?: string
          training_samples?: number
          user_id?: string
        }
        Relationships: []
      }
      neighborhoods: {
        Row: {
          centroid_lat: number
          centroid_lng: number
          city: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          centroid_lat: number
          centroid_lng: number
          city?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          centroid_lat?: number
          centroid_lng?: number
          city?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      police_contacts: {
        Row: {
          address: string | null
          city: string
          commissioner_name: string
          created_at: string
          email: string | null
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city: string
          commissioner_name: string
          created_at?: string
          email?: string | null
          id?: string
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          commissioner_name?: string
          created_at?: string
          email?: string | null
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      police_reports: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          notified_at: string | null
          phone_id: string
          police_reference: string | null
          report_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          notified_at?: string | null
          phone_id: string
          police_reference?: string | null
          report_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          notified_at?: string | null
          phone_id?: string
          police_reference?: string | null
          report_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "police_reports_phone_id_fkey"
            columns: ["phone_id"]
            isOneToOne: false
            referencedRelation: "stolen_phones"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          marche: string | null
          name: string
          phone: string | null
          type_activite: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marche?: string | null
          name?: string
          phone?: string | null
          type_activite?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marche?: string | null
          name?: string
          phone?: string | null
          type_activite?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stolen_phones: {
        Row: {
          brand: string
          case_number: string
          city: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          imei: string
          model: string
          neighborhood_id: string | null
          photo_urls: string[] | null
          status: string
          theft_date: string
          user_id: string
        }
        Insert: {
          brand: string
          case_number: string
          city: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          imei: string
          model: string
          neighborhood_id?: string | null
          photo_urls?: string[] | null
          status?: string
          theft_date: string
          user_id: string
        }
        Update: {
          brand?: string
          case_number?: string
          city?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          imei?: string
          model?: string
          neighborhood_id?: string | null
          photo_urls?: string[] | null
          status?: string
          theft_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stolen_phones_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_case_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "admin" | "dealer" | "technicien" | "enqueteur"
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
      app_role: ["user", "admin", "dealer", "technicien", "enqueteur"],
    },
  },
} as const
