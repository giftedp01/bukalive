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
      analytics_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          kind: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          kind: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          kind?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      businesses: {
        Row: {
          business_type: string
          category_id: string | null
          city: string
          country_id: string
          created_at: string
          description: string
          destination_slug: string | null
          id: string
          is_sample: boolean
          logo_url: string | null
          name: string
          owner_id: string | null
          slug: string
          summary: string
          updated_at: string
          verification_status: string
          website: string | null
        }
        Insert: {
          business_type?: string
          category_id?: string | null
          city?: string
          country_id: string
          created_at?: string
          description?: string
          destination_slug?: string | null
          id?: string
          is_sample?: boolean
          logo_url?: string | null
          name: string
          owner_id?: string | null
          slug: string
          summary?: string
          updated_at?: string
          verification_status?: string
          website?: string | null
        }
        Update: {
          business_type?: string
          category_id?: string | null
          city?: string
          country_id?: string
          created_at?: string
          description?: string
          destination_slug?: string | null
          id?: string
          is_sample?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          slug?: string
          summary?: string
          updated_at?: string
          verification_status?: string
          website?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          event_id: string
          id: string
          is_question: boolean
          message: string
          sent_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          event_id: string
          id?: string
          is_question?: boolean
          message: string
          sent_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          event_id?: string
          id?: string
          is_question?: boolean
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
      destinations: {
        Row: {
          best_time: string | null
          category_id: string | null
          city: string
          country_id: string
          cover_image_url: string | null
          created_at: string
          description: string
          id: string
          image_key: string | null
          is_featured: boolean
          is_sample: boolean
          latitude: number | null
          longitude: number | null
          name: string
          region: string
          slug: string
          summary: string
          updated_at: string
        }
        Insert: {
          best_time?: string | null
          category_id?: string | null
          city?: string
          country_id: string
          cover_image_url?: string | null
          created_at?: string
          description?: string
          id?: string
          image_key?: string | null
          is_featured?: boolean
          is_sample?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          region?: string
          slug: string
          summary?: string
          updated_at?: string
        }
        Update: {
          best_time?: string | null
          category_id?: string | null
          city?: string
          country_id?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string
          id?: string
          image_key?: string | null
          is_featured?: boolean
          is_sample?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          region?: string
          slug?: string
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          book_url: string | null
          booking_url: string | null
          business_id: string | null
          category: Database["public"]["Enums"]["event_category"]
          category_id: string | null
          country_id: string | null
          cover_image_url: string | null
          created_at: string
          currency: string
          description: string
          destination_id: string | null
          duration_minutes: number
          event_type: string
          host_id: string
          id: string
          is_flagged: boolean
          is_published: boolean
          is_sample: boolean
          latitude: number | null
          location: string
          longitude: number | null
          price_cents: number
          province_id: string | null
          replay_url: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["event_status"]
          stay_url: string | null
          sub_experiences: Json
          subcategory: string | null
          title: string
          updated_at: string
          view_count: number
          viewer_count: number
          visit_url: string | null
        }
        Insert: {
          book_url?: string | null
          booking_url?: string | null
          business_id?: string | null
          category?: Database["public"]["Enums"]["event_category"]
          category_id?: string | null
          country_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string
          destination_id?: string | null
          duration_minutes?: number
          event_type?: string
          host_id: string
          id?: string
          is_flagged?: boolean
          is_published?: boolean
          is_sample?: boolean
          latitude?: number | null
          location?: string
          longitude?: number | null
          price_cents?: number
          province_id?: string | null
          replay_url?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["event_status"]
          stay_url?: string | null
          sub_experiences?: Json
          subcategory?: string | null
          title: string
          updated_at?: string
          view_count?: number
          viewer_count?: number
          visit_url?: string | null
        }
        Update: {
          book_url?: string | null
          booking_url?: string | null
          business_id?: string | null
          category?: Database["public"]["Enums"]["event_category"]
          category_id?: string | null
          country_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string
          destination_id?: string | null
          duration_minutes?: number
          event_type?: string
          host_id?: string
          id?: string
          is_flagged?: boolean
          is_published?: boolean
          is_sample?: boolean
          latitude?: number | null
          location?: string
          longitude?: number | null
          price_cents?: number
          province_id?: string | null
          replay_url?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          stay_url?: string | null
          sub_experiences?: Json
          subcategory?: string | null
          title?: string
          updated_at?: string
          view_count?: number
          viewer_count?: number
          visit_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          business_id: string | null
          created_at: string
          destination_slug: string
          id: string
          is_sample: boolean
          kind: string
          link_url: string | null
          name: string
          price_from: string | null
          summary: string
          url: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          destination_slug: string
          id?: string
          is_sample?: boolean
          kind: string
          link_url?: string | null
          name: string
          price_from?: string | null
          summary?: string
          url?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          destination_slug?: string
          id?: string
          is_sample?: boolean
          kind?: string
          link_url?: string | null
          name?: string
          price_from?: string | null
          summary?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      livestream_requests: {
        Row: {
          approved_budget_cents: number | null
          created_at: string
          description: string
          format: string
          id: string
          location: string
          paid_at: string | null
          payment_status: string
          preferred_date: string | null
          rejection_reason: string | null
          requested_budget_cents: number
          requester_id: string
          status: string
        }
        Insert: {
          approved_budget_cents?: number | null
          created_at?: string
          description: string
          format: string
          id?: string
          location: string
          paid_at?: string | null
          payment_status?: string
          preferred_date?: string | null
          rejection_reason?: string | null
          requested_budget_cents?: number
          requester_id: string
          status?: string
        }
        Update: {
          approved_budget_cents?: number | null
          created_at?: string
          description?: string
          format?: string
          id?: string
          location?: string
          paid_at?: string | null
          payment_status?: string
          preferred_date?: string | null
          rejection_reason?: string | null
          requested_budget_cents?: number
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "livestream_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livestream_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      reports: {
        Row: {
          created_at: string
          details: string
          id: string
          item_id: string
          item_type: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string
          id?: string
          item_id: string
          item_type: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          item_id?: string
          item_type?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_profile_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_profile_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
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
      watch_history: {
        Row: {
          event_id: string
          user_id: string
          watched_at: string
        }
        Insert: {
          event_id: string
          user_id: string
          watched_at?: string
        }
        Update: {
          event_id?: string
          user_id?: string
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          full_name: string | null
          host_bio: string | null
          host_status: Database["public"]["Enums"]["host_status"] | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          full_name?: string | null
          host_bio?: string | null
          host_status?: Database["public"]["Enums"]["host_status"] | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          full_name?: string | null
          host_bio?: string | null
          host_status?: Database["public"]["Enums"]["host_status"] | null
          id?: string | null
        }
        Relationships: []
      }
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
