export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      drops: {
        Row: {
          content: string;
          created_at: string;
          echo_count: number;
          id: string;
          pass_count: number;
          relay_count: number;
          spark_count: number;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          echo_count?: number;
          id?: string;
          pass_count?: number;
          relay_count?: number;
          spark_count?: number;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          echo_count?: number;
          id?: string;
          pass_count?: number;
          relay_count?: number;
          spark_count?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "drops_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      echoes: {
        Row: {
          content: string;
          created_at: string;
          drop_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          drop_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          drop_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "echoes_drop_id_fkey";
            columns: ["drop_id"];
            isOneToOne: false;
            referencedRelation: "drops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "echoes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      hides: {
        Row: {
          created_at: string;
          drop_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          drop_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          drop_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hides_drop_id_fkey";
            columns: ["drop_id"];
            isOneToOne: false;
            referencedRelation: "drops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hides_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      mutes: {
        Row: {
          created_at: string;
          muted_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          muted_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          muted_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mutes_muted_id_fkey";
            columns: ["muted_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mutes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          actor_id: string;
          created_at: string;
          drop_id: string | null;
          id: string;
          read: boolean;
          type: "spark" | "echo" | "relay" | "orbit";
          user_id: string;
        };
        Insert: {
          actor_id: string;
          created_at?: string;
          drop_id?: string | null;
          id?: string;
          read?: boolean;
          type: "spark" | "echo" | "relay" | "orbit";
          user_id: string;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          drop_id?: string | null;
          id?: string;
          read?: boolean;
          type?: "spark" | "echo" | "relay" | "orbit";
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_drop_id_fkey";
            columns: ["drop_id"];
            isOneToOne: false;
            referencedRelation: "drops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      orbits: {
        Row: {
          created_at: string;
          followed_id: string;
          follower_id: string;
        };
        Insert: {
          created_at?: string;
          followed_id: string;
          follower_id: string;
        };
        Update: {
          created_at?: string;
          followed_id?: string;
          follower_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orbits_followed_id_fkey";
            columns: ["followed_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orbits_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      passes: {
        Row: {
          created_at: string;
          drop_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          drop_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          drop_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "passes_drop_id_fkey";
            columns: ["drop_id"];
            isOneToOne: false;
            referencedRelation: "drops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "passes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_color: string;
          avatar_emoji: string;
          bio: string;
          created_at: string;
          display_name: string;
          followers_count: number;
          following_count: number;
          id: string;
          onboarded: boolean;
          updated_at: string;
          username: string;
        };
        Insert: {
          avatar_color?: string;
          avatar_emoji?: string;
          bio?: string;
          created_at?: string;
          display_name?: string;
          followers_count?: number;
          following_count?: number;
          id: string;
          onboarded?: boolean;
          updated_at?: string;
          username: string;
        };
        Update: {
          avatar_color?: string;
          avatar_emoji?: string;
          bio?: string;
          created_at?: string;
          display_name?: string;
          followers_count?: number;
          following_count?: number;
          id?: string;
          onboarded?: boolean;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      relays: {
        Row: {
          created_at: string;
          drop_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          drop_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          drop_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "relays_drop_id_fkey";
            columns: ["drop_id"];
            isOneToOne: false;
            referencedRelation: "drops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "relays_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          drop_id: string;
          id: string;
          note: string | null;
          reason: string;
          reporter_id: string;
        };
        Insert: {
          created_at?: string;
          drop_id: string;
          id?: string;
          note?: string | null;
          reason: string;
          reporter_id: string;
        };
        Update: {
          created_at?: string;
          drop_id?: string;
          id?: string;
          note?: string | null;
          reason?: string;
          reporter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_drop_id_fkey";
            columns: ["drop_id"];
            isOneToOne: false;
            referencedRelation: "drops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      sparks: {
        Row: {
          created_at: string;
          drop_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          drop_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          drop_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sparks_drop_id_fkey";
            columns: ["drop_id"];
            isOneToOne: false;
            referencedRelation: "drops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sparks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      mark_all_notifications_read: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      feed_for_you: {
        Args: { p_limit?: number; p_viewer?: string };
        Returns: {
          author_id: string;
          avatar_color: string;
          avatar_emoji: string;
          content: string;
          created_at: string;
          display_name: string;
          drop_id: string;
          echo_count: number;
          pass_count: number;
          relay_count: number;
          score: number;
          spark_count: number;
          username: string;
        }[];
      };
      feed_global: {
        Args: { p_before?: string; p_limit?: number };
        Returns: {
          author_id: string;
          avatar_color: string;
          avatar_emoji: string;
          content: string;
          created_at: string;
          display_name: string;
          drop_id: string;
          echo_count: number;
          pass_count: number;
          relay_count: number;
          score: number;
          spark_count: number;
          username: string;
        }[];
      };
      feed_orbit: {
        Args: { p_before?: string; p_limit?: number; p_viewer?: string };
        Returns: {
          author_id: string;
          avatar_color: string;
          avatar_emoji: string;
          content: string;
          created_at: string;
          display_name: string;
          drop_id: string;
          echo_count: number;
          pass_count: number;
          relay_count: number;
          score: number;
          spark_count: number;
          username: string;
        }[];
      };
      get_drop: {
        Args: { p_drop: string; p_viewer?: string };
        Returns: {
          author_id: string;
          avatar_color: string;
          avatar_emoji: string;
          content: string;
          created_at: string;
          display_name: string;
          drop_id: string;
          echo_count: number;
          pass_count: number;
          relay_count: number;
          score: number;
          spark_count: number;
          username: string;
        }[];
      };
      hall_of_blurbs: {
        Args: never;
        Returns: {
          author_id: string;
          avatar_color: string;
          avatar_emoji: string;
          content: string;
          created_at: string;
          display_name: string;
          drop_id: string;
          echo_count: number;
          pass_count: number;
          relay_count: number;
          score: number;
          spark_count: number;
          username: string;
        }[];
      };
      heat_score: {
        Args: {
          p_created: string;
          p_echoes: number;
          p_passes: number;
          p_relays: number;
          p_sparks: number;
        };
        Returns: number;
      };
      profile_drops: {
        Args: {
          p_before?: string;
          p_limit?: number;
          p_username: string;
          p_viewer?: string;
        };
        Returns: {
          author_id: string;
          avatar_color: string;
          avatar_emoji: string;
          content: string;
          created_at: string;
          display_name: string;
          drop_id: string;
          echo_count: number;
          pass_count: number;
          relay_count: number;
          score: number;
          spark_count: number;
          username: string;
        }[];
      };
      recommend_drops: {
        Args: { p_limit?: number; p_viewer?: string };
        Returns: {
          author_id: string;
          avatar_color: string;
          avatar_emoji: string;
          content: string;
          created_at: string;
          display_name: string;
          drop_id: string;
          echo_count: number;
          pass_count: number;
          relay_count: number;
          score: number;
          spark_count: number;
          username: string;
        }[];
      };
      viewer_hidden: {
        Args: { p_drop: string; p_viewer: string };
        Returns: boolean;
      };
      viral_now: {
        Args: { p_limit?: number };
        Returns: {
          author_id: string;
          avatar_color: string;
          avatar_emoji: string;
          content: string;
          created_at: string;
          display_name: string;
          drop_id: string;
          echo_count: number;
          pass_count: number;
          relay_count: number;
          score: number;
          spark_count: number;
          username: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
