// Generated TypeScript types for Supabase database schema

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: 'admin' | 'pharmacy' | 'supplier';
          name: string | null;
          address: string | null;
          phone: string | null;
          license_number: string | null;
          rating: number | null;
          categories: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role: 'admin' | 'pharmacy' | 'supplier';
          name?: string | null;
          address?: string | null;
          phone?: string | null;
          license_number?: string | null;
          rating?: number | null;
          categories?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'admin' | 'pharmacy' | 'supplier';
          name?: string | null;
          address?: string | null;
          phone?: string | null;
          license_number?: string | null;
          rating?: number | null;
          categories?: any | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      skus: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          category: string;
          strength: string | null;
          unit: string;
          metadata: any;
          is_active: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          category: string;
          strength?: string | null;
          unit: string;
          metadata?: any;
          is_active?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          category?: string;
          strength?: string | null;
          unit?: string;
          metadata?: any;
          is_active?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      pharmacy_demands: {
        Row: {
          id: string;
          pharmacy_id: string;
          sku_id: string;
          quantity: number;
          max_unit_price: number | null;
          notes: string | null;
          status: 'draft' | 'submitted';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pharmacy_id: string;
          sku_id: string;
          quantity: number;
          max_unit_price?: number | null;
          notes?: string | null;
          status?: 'draft' | 'submitted';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pharmacy_id?: string;
          sku_id?: string;
          quantity?: number;
          max_unit_price?: number | null;
          notes?: string | null;
          status?: 'draft' | 'submitted';
          created_at?: string;
          updated_at?: string;
        };
      };
      septra_orders: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: 'draft' | 'rfq_created' | 'bidding_complete' | 'orders_placed' | 'in_delivery' | 'completed' | 'cancelled';
          total_value: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: 'draft' | 'rfq_created' | 'bidding_complete' | 'orders_placed' | 'in_delivery' | 'completed' | 'cancelled';
          total_value?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          status?: 'draft' | 'rfq_created' | 'bidding_complete' | 'orders_placed' | 'in_delivery' | 'completed' | 'cancelled';
          total_value?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      rfqs: {
        Row: {
          id: string;
          septra_order_id: string;
          title: string;
          description: string | null;
          published_at: string;
          bidding_deadline: string;
          delivery_requirement: string | null;
          terms: string | null;
          status: 'open' | 'closed' | 'awarded';
          estimated_value: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          septra_order_id: string;
          title: string;
          description?: string | null;
          published_at: string;
          bidding_deadline: string;
          delivery_requirement?: string | null;
          terms?: string | null;
          status?: 'open' | 'closed' | 'awarded';
          estimated_value?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          septra_order_id?: string;
          title?: string;
          description?: string | null;
          published_at?: string;
          bidding_deadline?: string;
          delivery_requirement?: string | null;
          terms?: string | null;
          status?: 'open' | 'closed' | 'awarded';
          estimated_value?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      rfq_lines: {
        Row: {
          id: string;
          rfq_id: string;
          sku_id: string;
          total_quantity: number;
          demand_breakdown: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          rfq_id: string;
          sku_id: string;
          total_quantity: number;
          demand_breakdown: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          rfq_id?: string;
          sku_id?: string;
          total_quantity?: number;
          demand_breakdown?: any;
          created_at?: string;
        };
      };
      bids: {
        Row: {
          id: string;
          rfq_id: string;
          supplier_id: string;
          sku_id: string;
          unit_price: number;
          quantity: number;
          min_quantity: number | null;
          lead_time_days: number;
          notes: string | null;
          status: 'submitted' | 'awarded' | 'rejected';
          submitted_at: string;
        };
        Insert: {
          id?: string;
          rfq_id: string;
          supplier_id: string;
          sku_id: string;
          unit_price: number;
          quantity: number;
          min_quantity?: number | null;
          lead_time_days: number;
          notes?: string | null;
          status?: 'submitted' | 'awarded' | 'rejected';
          submitted_at?: string;
        };
        Update: {
          id?: string;
          rfq_id?: string;
          supplier_id?: string;
          sku_id?: string;
          unit_price?: number;
          quantity?: number;
          min_quantity?: number | null;
          lead_time_days?: number;
          notes?: string | null;
          status?: 'submitted' | 'awarded' | 'rejected';
          submitted_at?: string;
        };
      };
      awarded_bids: {
        Row: {
          id: string;
          bid_id: string;
          rfq_line_id: string;
          awarded_price: number;
          awarded_quantity: number;
          awarded_at: string;
        };
        Insert: {
          id?: string;
          bid_id: string;
          rfq_line_id: string;
          awarded_price: number;
          awarded_quantity: number;
          awarded_at?: string;
        };
        Update: {
          id?: string;
          bid_id?: string;
          rfq_line_id?: string;
          awarded_price?: number;
          awarded_quantity?: number;
          awarded_at?: string;
        };
      };
      pharmacy_orders: {
        Row: {
          id: string;
          rfq_id: string;
          pharmacy_id: string;
          total_value: number;
          status: 'pending' | 'confirmed' | 'declined';
          payment_terms: number | null;
          delivery_address: string | null;
          confirmed_at: string | null;
          declined_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rfq_id: string;
          pharmacy_id: string;
          total_value?: number;
          status?: 'pending' | 'confirmed' | 'declined';
          payment_terms?: number | null;
          delivery_address?: string | null;
          confirmed_at?: string | null;
          declined_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          rfq_id?: string;
          pharmacy_id?: string;
          total_value?: number;
          status?: 'pending' | 'confirmed' | 'declined';
          payment_terms?: number | null;
          delivery_address?: string | null;
          confirmed_at?: string | null;
          declined_at?: string | null;
          created_at?: string;
        };
      };
      pharmacy_order_lines: {
        Row: {
          id: string;
          pharmacy_order_id: string;
          sku_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          status: 'pending' | 'confirmed' | 'declined';
        };
        Insert: {
          id?: string;
          pharmacy_order_id: string;
          sku_id: string;
          quantity: number;
          unit_price: number;
          status?: 'pending' | 'confirmed' | 'declined';
        };
        Update: {
          id?: string;
          pharmacy_order_id?: string;
          sku_id?: string;
          quantity?: number;
          unit_price?: number;
          status?: 'pending' | 'confirmed' | 'declined';
        };
      };
      supplier_orders: {
        Row: {
          id: string;
          rfq_id: string;
          supplier_id: string;
          total_value: number;
          status: 'assigned' | 'in_fulfillment' | 'shipped' | 'delivered' | 'invoiced';
          assigned_at: string;
          expected_delivery: string | null;
          shipping_info: string | null;
        };
        Insert: {
          id?: string;
          rfq_id: string;
          supplier_id: string;
          total_value?: number;
          status?: 'assigned' | 'in_fulfillment' | 'shipped' | 'delivered' | 'invoiced';
          assigned_at?: string;
          expected_delivery?: string | null;
          shipping_info?: string | null;
        };
        Update: {
          id?: string;
          rfq_id?: string;
          supplier_id?: string;
          total_value?: number;
          status?: 'assigned' | 'in_fulfillment' | 'shipped' | 'delivered' | 'invoiced';
          assigned_at?: string;
          expected_delivery?: string | null;
          shipping_info?: string | null;
        };
      };
      supplier_order_lines: {
        Row: {
          id: string;
          supplier_order_id: string;
          sku_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          pharmacy_breakdown: any;
        };
        Insert: {
          id?: string;
          supplier_order_id: string;
          sku_id: string;
          quantity: number;
          unit_price: number;
          pharmacy_breakdown: any;
        };
        Update: {
          id?: string;
          supplier_order_id?: string;
          sku_id?: string;
          quantity?: number;
          unit_price?: number;
          pharmacy_breakdown?: any;
        };
      };
      escrows: {
        Row: {
          id: string;
          rfq_id: string;
          pharmacy_id: string;
          amount: number;
          status: 'not_funded' | 'funded' | 'released' | 'refunded';
          funded_at: string | null;
          released_at: string | null;
          refunded_at: string | null;
          reason: string | null;
        };
        Insert: {
          id?: string;
          rfq_id: string;
          pharmacy_id: string;
          amount: number;
          status?: 'not_funded' | 'funded' | 'released' | 'refunded';
          funded_at?: string | null;
          released_at?: string | null;
          refunded_at?: string | null;
          reason?: string | null;
        };
        Update: {
          id?: string;
          rfq_id?: string;
          pharmacy_id?: string;
          amount?: number;
          status?: 'not_funded' | 'funded' | 'released' | 'refunded';
          funded_at?: string | null;
          released_at?: string | null;
          refunded_at?: string | null;
          reason?: string | null;
        };
      };
      logistics_entries: {
        Row: {
          id: string;
          rfq_id: string;
          supplier_id: string;
          pharmacy_id: string | null;
          tracking_number: string | null;
          status: 'pending' | 'picked_up' | 'in_transit' | 'delivered';
          shipment_date: string | null;
          estimated_delivery: string | null;
          actual_delivery: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          rfq_id: string;
          supplier_id: string;
          pharmacy_id?: string | null;
          tracking_number?: string | null;
          status?: 'pending' | 'picked_up' | 'in_transit' | 'delivered';
          shipment_date?: string | null;
          estimated_delivery?: string | null;
          actual_delivery?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          rfq_id?: string;
          supplier_id?: string;
          pharmacy_id?: string | null;
          tracking_number?: string | null;
          status?: 'pending' | 'picked_up' | 'in_transit' | 'delivered';
          shipment_date?: string | null;
          estimated_delivery?: string | null;
          actual_delivery?: string | null;
          notes?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}