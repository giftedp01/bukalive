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
      chat_messages: {
        Row: {
          event_id: string
          id: string
          message: string
          sent_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          message: string
          sent_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          message?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          book_url: string | null
          category: Database["public"]["Enums"]["event_category"]
          category_id: string | null
          cover_image_url: string | null
          created_at: string
          currency: string
          description: string
          destination_id: string | null
          duration_minutes: number
          host_id: string
          id: string
          is_flagged: boolean
          is_published: boolean
          location: string
          price_cents: number
          province_id: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["event_status"]
          stay_url: string | null
          sub_experiences: Json
          title: string
          updated_at: string
          view_count: number
          visit_url: string | null
        }
        Insert: {
          book_url?: string | null
          category?: Database["public"]["Enums"]["event_category"]
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string
          destination_id?: string | null
          duration_minutes?: number
          host_id: string
          id?: string
          is_flagged?: boolean
          is_published?: boolean
          location?: string
          price_cents?: number
          province_id?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["event_status"]
          stay_url?: string | null
          sub_experiences?: Json
          title: string
          updated_at?: string
          view_count?: number
          visit_url?: string | null
        }
        Update: {
          book_url?: string | null
          category?: Database["public"]["Enums"]["event_category"]
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string
          destination_id?: string | null
          duration_minutes?: number
          host_id?: string
          id?: string
          is_flagged?: boolean
          is_published?: boolean
          location?: string
          price_cents?: number
          province_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          stay_url?: string | null
          sub_experiences?: Json
          title?: string
          updated_at?: string
          view_count?: number
          visit_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string
          host_applied_at: string | null
          host_bio: string | null
          host_status: Database["public"]["Enums"]["host_status"]
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          host_applied_at?: string | null
          host_bio?: string | null
          host_status?: Database["public"]["Enums"]["host_status"]
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          host_applied_at?: string | null
          host_bio?: string | null
          host_status?: Database["public"]["Enums"]["host_status"]
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount_cents: number
          currency: string
          event_id: string
          id: string
          provider: string
          provider_ref: string | null
          purchased_at: string
          viewer_id: string
        }
        Insert: {
          amount_cents?: number
          currency?: string
          event_id: string
          id?: string
          provider?: string
          provider_ref?: string | null
          purchased_at?: string
          viewer_id: string
        }
        Update: {
          amount_cents?: number
          currency?: string
          event_id?: string
          id?: string
          provider?: string
          provider_ref?: string | null
          purchased_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
          role: Database["public"]["Enums"]["app_role"]
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
      has_access: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_host: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "host" | "viewer"
      event_category:
        | "sports"
        | "festival"
        | "conference"
        | "wedding"
        | "safari"
        | "concert"
        | "extreme_sports"
        | "arts"
        | "fashion"
        | "other"
      event_status: "draft" | "upcoming" | "live" | "ended"
      host_status: "none" | "pending" | "approved" | "rejected"
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
      app_role: ["admin", "host", "viewer"],
      event_category: [
        "sports",
        "festival",
        "conference",
        "wedding",
        "safari",
        "concert",
        "extreme_sports",
        "arts",
        "fashion",
        "other",
      ],
      event_status: ["draft", "upcoming", "live", "ended"],
      host_status: ["none", "pending", "approved", "rejected"],
    },
  },
} as const
