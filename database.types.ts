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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      awarded_bids: {
        Row: {
          awarded_at: string | null
          awarded_price: number
          awarded_quantity: number
          bid_id: string
          id: string
          rfq_line_id: string
        }
        Insert: {
          awarded_at?: string | null
          awarded_price: number
          awarded_quantity: number
          bid_id: string
          id?: string
          rfq_line_id: string
        }
        Update: {
          awarded_at?: string | null
          awarded_price?: number
          awarded_quantity?: number
          bid_id?: string
          id?: string
          rfq_line_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awarded_bids_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awarded_bids_rfq_line_id_fkey"
            columns: ["rfq_line_id"]
            isOneToOne: true
            referencedRelation: "rfq_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          id: string
          lead_time_days: number
          min_quantity: number | null
          notes: string | null
          quantity: number
          rfq_id: string
          sku_id: string
          status: string
          submitted_at: string | null
          supplier_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          lead_time_days: number
          min_quantity?: number | null
          notes?: string | null
          quantity: number
          rfq_id: string
          sku_id: string
          status?: string
          submitted_at?: string | null
          supplier_id: string
          unit_price: number
        }
        Update: {
          id?: string
          lead_time_days?: number
          min_quantity?: number | null
          notes?: string | null
          quantity?: number
          rfq_id?: string
          sku_id?: string
          status?: string
          submitted_at?: string | null
          supplier_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bids_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      escrows: {
        Row: {
          amount: number
          funded_at: string | null
          id: string
          pharmacy_id: string
          reason: string | null
          refunded_at: string | null
          released_at: string | null
          rfq_id: string
          status: string
        }
        Insert: {
          amount: number
          funded_at?: string | null
          id?: string
          pharmacy_id: string
          reason?: string | null
          refunded_at?: string | null
          released_at?: string | null
          rfq_id: string
          status?: string
        }
        Update: {
          amount?: number
          funded_at?: string | null
          id?: string
          pharmacy_id?: string
          reason?: string | null
          refunded_at?: string | null
          released_at?: string | null
          rfq_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrows_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrows_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_entries: {
        Row: {
          actual_delivery: string | null
          estimated_delivery: string | null
          id: string
          notes: string | null
          pharmacy_id: string | null
          rfq_id: string
          shipment_date: string | null
          status: string
          supplier_id: string
          tracking_number: string | null
        }
        Insert: {
          actual_delivery?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          pharmacy_id?: string | null
          rfq_id: string
          shipment_date?: string | null
          status?: string
          supplier_id: string
          tracking_number?: string | null
        }
        Update: {
          actual_delivery?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          pharmacy_id?: string | null
          rfq_id?: string
          shipment_date?: string | null
          status?: string
          supplier_id?: string
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistics_entries_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_entries_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_demands: {
        Row: {
          created_at: string | null
          id: string
          max_unit_price: number | null
          notes: string | null
          pharmacy_id: string
          quantity: number
          sku_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_unit_price?: number | null
          notes?: string | null
          pharmacy_id: string
          quantity: number
          sku_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_unit_price?: number | null
          notes?: string | null
          pharmacy_id?: string
          quantity?: number
          sku_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_demands_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_demands_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_order_lines: {
        Row: {
          id: string
          pharmacy_order_id: string
          quantity: number
          sku_id: string
          status: string
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          pharmacy_order_id: string
          quantity: number
          sku_id: string
          status?: string
          total_price?: number
          unit_price: number
        }
        Update: {
          id?: string
          pharmacy_order_id?: string
          quantity?: number
          sku_id?: string
          status?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_order_lines_pharmacy_order_id_fkey"
            columns: ["pharmacy_order_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_order_lines_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_orders: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          declined_at: string | null
          delivery_address: string | null
          id: string
          payment_terms: number | null
          pharmacy_id: string
          rfq_id: string
          status: string
          total_value: number
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          declined_at?: string | null
          delivery_address?: string | null
          id?: string
          payment_terms?: number | null
          pharmacy_id: string
          rfq_id: string
          status?: string
          total_value?: number
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          declined_at?: string | null
          delivery_address?: string | null
          id?: string
          payment_terms?: number | null
          pharmacy_id?: string
          rfq_id?: string
          status?: string
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_orders_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_orders_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          categories: string[] | null
          created_at: string | null
          email: string
          id: string
          license_number: string | null
          name: string | null
          phone: string | null
          rating: number | null
          role: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          categories?: string[] | null
          created_at?: string | null
          email: string
          id: string
          license_number?: string | null
          name?: string | null
          phone?: string | null
          rating?: number | null
          role: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          categories?: string[] | null
          created_at?: string | null
          email?: string
          id?: string
          license_number?: string | null
          name?: string | null
          phone?: string | null
          rating?: number | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rfq_lines: {
        Row: {
          created_at: string | null
          demand_breakdown: Json
          id: string
          rfq_id: string
          sku_id: string
          total_quantity: number
        }
        Insert: {
          created_at?: string | null
          demand_breakdown?: Json
          id?: string
          rfq_id: string
          sku_id: string
          total_quantity: number
        }
        Update: {
          created_at?: string | null
          demand_breakdown?: Json
          id?: string
          rfq_id?: string
          sku_id?: string
          total_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "rfq_lines_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_lines_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          bidding_deadline: string
          created_at: string | null
          delivery_requirement: string | null
          description: string | null
          estimated_value: number | null
          id: string
          published_at: string
          septra_order_id: string
          status: string
          terms: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          bidding_deadline: string
          created_at?: string | null
          delivery_requirement?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          published_at: string
          septra_order_id: string
          status?: string
          terms?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          bidding_deadline?: string
          created_at?: string | null
          delivery_requirement?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          published_at?: string
          septra_order_id?: string
          status?: string
          terms?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_septra_order_id_fkey"
            columns: ["septra_order_id"]
            isOneToOne: false
            referencedRelation: "septra_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      septra_orders: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          status: string
          title: string
          total_value: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string
          title: string
          total_value?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string
          title?: string
          total_value?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      skus: {
        Row: {
          category: string
          code: string
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          metadata: Json
          name: string
          strength: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json
          name: string
          strength?: string | null
          unit: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json
          name?: string
          strength?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skus_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_order_lines: {
        Row: {
          id: string
          pharmacy_breakdown: Json
          quantity: number
          sku_id: string
          supplier_order_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          pharmacy_breakdown?: Json
          quantity: number
          sku_id: string
          supplier_order_id: string
          total_price?: number
          unit_price: number
        }
        Update: {
          id?: string
          pharmacy_breakdown?: Json
          quantity?: number
          sku_id?: string
          supplier_order_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_order_lines_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_order_lines_supplier_order_id_fkey"
            columns: ["supplier_order_id"]
            isOneToOne: false
            referencedRelation: "supplier_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_orders: {
        Row: {
          assigned_at: string | null
          expected_delivery: string | null
          id: string
          rfq_id: string
          shipping_info: string | null
          status: string
          supplier_id: string
          total_value: number
        }
        Insert: {
          assigned_at?: string | null
          expected_delivery?: string | null
          id?: string
          rfq_id: string
          shipping_info?: string | null
          status?: string
          supplier_id: string
          total_value?: number
        }
        Update: {
          assigned_at?: string | null
          expected_delivery?: string | null
          id?: string
          rfq_id?: string
          shipping_info?: string | null
          status?: string
          supplier_id?: string
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_orders_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          categories: Json | null
          created_at: string | null
          email: string
          id: string
          license_number: string | null
          name: string | null
          phone: string | null
          rating: number | null
          role: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          categories?: Json | null
          created_at?: string | null
          email: string
          id?: string
          license_number?: string | null
          name?: string | null
          phone?: string | null
          rating?: number | null
          role: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          categories?: Json | null
          created_at?: string | null
          email?: string
          id?: string
          license_number?: string | null
          name?: string | null
          phone?: string | null
          rating?: number | null
          role?: string
          updated_at?: string | null
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
