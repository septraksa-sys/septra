// Database Types - Schema-Aligned
// These types mirror the actual database structure exactly

export interface DatabaseUser {
  id: string;
  email: string;
  role: 'admin' | 'pharmacy' | 'supplier';
  name: string | null;
  address: string | null;
  phone: string | null;
  license_number: string | null;
  rating: number | null;
  categories: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseSKU {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  strength: string | null;
  unit: string;
  metadata: Record<string, any>;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DatabasePharmacyDemand {
  id: string;
  pharmacy_id: string;
  sku_id: string;
  quantity: number;
  max_unit_price: number | null;
  notes: string | null;
  status: 'draft' | 'submitted';
  created_at: string;
  updated_at: string;
}

export interface DatabaseSeptraOrder {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'rfq_created' | 'bidding_complete' | 'orders_placed' | 'in_delivery' | 'completed' | 'cancelled';
  total_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseRFQ {
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
}

export interface DatabaseRFQLine {
  id: string;
  rfq_id: string;
  sku_id: string;
  total_quantity: number;
  demand_breakdown: Array<{ pharmacyId: string; quantity: number }>;
  created_at: string;
}

export interface DatabaseBid {
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
}

export interface DatabaseAwardedBid {
  id: string;
  bid_id: string;
  rfq_line_id: string;
  awarded_price: number;
  awarded_quantity: number;
  awarded_at: string;
}

export interface DatabasePharmacyOrder {
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
}

export interface DatabasePharmacyOrderLine {
  id: string;
  pharmacy_order_id: string;
  sku_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'declined';
}

export interface DatabaseSupplierOrder {
  id: string;
  rfq_id: string;
  supplier_id: string;
  total_value: number;
  status: 'assigned' | 'in_fulfillment' | 'shipped' | 'delivered' | 'invoiced';
  assigned_at: string;
  expected_delivery: string | null;
  shipping_info: string | null;
}

export interface DatabaseSupplierOrderLine {
  id: string;
  supplier_order_id: string;
  sku_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  pharmacy_breakdown: Array<{ pharmacyId: string; quantity: number }>;
}

export interface DatabaseEscrow {
  id: string;
  rfq_id: string;
  pharmacy_id: string;
  amount: number;
  status: 'not_funded' | 'funded' | 'released' | 'refunded';
  funded_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
  reason: string | null;
}

export interface DatabaseLogisticsEntry {
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
}

// Database query result types (with joins)
export interface DatabaseRFQWithRelations {
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
  septra_orders: DatabaseSeptraOrder;
  rfq_lines: Array<DatabaseRFQLine & {
    skus: DatabaseSKU;
    awarded_bids: Array<DatabaseAwardedBid & {
      bids: DatabaseBid;
    }>;
  }>;
}

export interface DatabaseBidWithRelations {
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
  rfqs: DatabaseRFQ;
  skus: DatabaseSKU;
  users: DatabaseUser;
}