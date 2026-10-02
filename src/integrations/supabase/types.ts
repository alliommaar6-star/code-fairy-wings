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
      app_state: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      app_state_history: {
        Row: {
          archived_at: string
          id: number
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          archived_at?: string
          id?: number
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          archived_at?: string
          id?: number
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "portal_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          amount: number
          client_key: string
          confirmed_at: string | null
          created_at: string
          id: string
          method: string
          mode: string
          order_id: string
          reference: string | null
          rejection_reason: string | null
          status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          client_key: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          method: string
          mode?: string
          order_id: string
          reference?: string | null
          rejection_reason?: string | null
          status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          client_key?: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          method?: string
          mode?: string
          order_id?: string
          reference?: string | null
          rejection_reason?: string | null
          status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "portal_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_access_log: {
        Row: {
          action: string
          created_at: string
          id: number
          token_hash: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          token_hash: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          token_hash?: string
        }
        Relationships: []
      }
      portal_customers: {
        Row: {
          created_at: string
          district: string
          id: string
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          district?: string
          id?: string
          name?: string
          phone: string
        }
        Update: {
          created_at?: string
          district?: string
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      portal_order_items: {
        Row: {
          discount: number
          id: string
          image_url: string | null
          line_total: number
          order_id: string
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          discount?: number
          id?: string
          image_url?: string | null
          line_total?: number
          order_id: string
          product_name: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          discount?: number
          id?: string
          image_url?: string | null
          line_total?: number
          order_id?: string
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "portal_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "portal_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_orders: {
        Row: {
          advance_amount: number
          cargo_company: string | null
          cargo_region: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          delivery_address: string
          delivery_fee: number
          delivery_fee_payer: string
          discount: number
          driver_name: string | null
          driver_phone: string | null
          fulfillment_status: string
          fulfillment_type: string
          id: string
          last_accessed_at: string | null
          order_no: string
          paid_amount: number
          sale_id: string | null
          status: string
          subtotal: number
          token: string
          token_active: boolean
          total: number | null
          updated_at: string
        }
        Insert: {
          advance_amount?: number
          cargo_company?: string | null
          cargo_region?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          delivery_address?: string
          delivery_fee?: number
          delivery_fee_payer?: string
          discount?: number
          driver_name?: string | null
          driver_phone?: string | null
          fulfillment_status?: string
          fulfillment_type?: string
          id?: string
          last_accessed_at?: string | null
          order_no: string
          paid_amount?: number
          sale_id?: string | null
          status?: string
          subtotal?: number
          token?: string
          token_active?: boolean
          total?: number | null
          updated_at?: string
        }
        Update: {
          advance_amount?: number
          cargo_company?: string | null
          cargo_region?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          delivery_address?: string
          delivery_fee?: number
          delivery_fee_payer?: string
          discount?: number
          driver_name?: string | null
          driver_phone?: string | null
          fulfillment_status?: string
          fulfillment_type?: string
          id?: string
          last_accessed_at?: string | null
          order_no?: string
          paid_amount?: number
          sale_id?: string | null
          status?: string
          subtotal?: number
          token?: string
          token_active?: boolean
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "portal_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          created_at: string
          email: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_complete_order: { Args: { p_order_id: string }; Returns: Json }
      admin_regenerate_token: { Args: { p_order_id: string }; Returns: Json }
      admin_reject_payment: {
        Args: { p_attempt_id: string; p_reason: string }
        Returns: Json
      }
      admin_set_order_status: {
        Args: {
          p_driver_name?: string
          p_driver_phone?: string
          p_order_id: string
          p_status: string
        }
        Returns: Json
      }
      admin_verify_payment: { Args: { p_attempt_id: string }; Returns: Json }
      claim_first_owner: { Args: never; Returns: Json }
      is_staff: { Args: { _uid: string }; Returns: boolean }
      owner_add_staff: { Args: { p_email: string }; Returns: Json }
      owner_remove_staff: { Args: { p_user: string }; Returns: Json }
      portal_amount_due: {
        Args: {
          p_mode: string
          p_order: Database["public"]["Tables"]["portal_orders"]["Row"]
        }
        Returns: number
      }
      portal_confirm_payment: {
        Args: { p_attempt_id: string; p_reference: string; p_token: string }
        Returns: Json
      }
      portal_get_order: { Args: { p_token: string }; Returns: Json }
      portal_new_code: { Args: never; Returns: string }
      portal_order_payload: {
        Args: { p_order: Database["public"]["Tables"]["portal_orders"]["Row"] }
        Returns: Json
      }
      portal_publish_order: { Args: { p_payload: Json }; Returns: Json }
      portal_rate_ok: {
        Args: {
          p_action: string
          p_limit: number
          p_token: string
          p_window: string
        }
        Returns: boolean
      }
      portal_start_payment: {
        Args: {
          p_client_key: string
          p_method: string
          p_mode: string
          p_token: string
        }
        Returns: Json
      }
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
    Enums: {},
  },
} as const
