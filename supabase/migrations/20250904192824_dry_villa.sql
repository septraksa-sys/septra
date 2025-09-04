/*
  # Refactor to RFQ-Central Schema for Septra Platform

  This migration refactors the database to make RFQ the central entity for the bidding process
  instead of SeptraOrder. SeptraOrder becomes primarily for demand aggregation and high-level tracking.

  ## Key Changes:
  1. Remove septra_order_lines (replaced by rfq_lines)
  2. Create rfq_lines table linked to rfqs
  3. Create awarded_bids table to track awarded bids per RFQ line
  4. Change all foreign keys from septra_order_id to rfq_id in related tables
  5. Update septra_orders table with simplified statuses

  ## New Schema Structure:
  - users: User profiles and authentication
  - skus: Product catalog
  - pharmacy_demands: Individual pharmacy demands
  - septra_orders: Demand aggregation and high-level tracking
  - rfqs: Central entity for bidding process
  - rfq_lines: Product lines within RFQs (replaces septra_order_lines)
  - bids: Supplier bids on RFQ items
  - awarded_bids: Tracks which bids were awarded for which RFQ lines
  - pharmacy_orders: Individual pharmacy orders (linked to RFQ)
  - pharmacy_order_lines: Line items for pharmacy orders
  - supplier_orders: Supplier fulfillment orders (linked to RFQ)
  - supplier_order_lines: Line items for supplier orders
  - escrows: Payment escrow management (linked to RFQ)
  - logistics_entries: Delivery tracking (linked to RFQ)
*/

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'pharmacy', 'supplier')),
    name VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    license_number VARCHAR(100),
    rating DECIMAL(3, 2) DEFAULT 4.0,
    categories JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SKUs table
CREATE TABLE IF NOT EXISTS skus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    strength VARCHAR(100),
    unit VARCHAR(50) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pharmacy Demands table
CREATE TABLE IF NOT EXISTS pharmacy_demands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    max_unit_price DECIMAL(12, 2),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Septra Orders table (Now mainly for aggregation and tracking)
CREATE TABLE IF NOT EXISTS septra_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (
        status IN (
            'draft', 'rfq_created', 'bidding_complete', 
            'orders_placed', 'in_delivery', 'completed', 'cancelled'
        )
    ),
    total_value DECIMAL(14, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RFQs table (Now the central entity for bidding)
CREATE TABLE IF NOT EXISTS rfqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    septra_order_id UUID NOT NULL REFERENCES septra_orders(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    published_at TIMESTAMPTZ NOT NULL,
    bidding_deadline TIMESTAMPTZ NOT NULL,
    delivery_requirement TIMESTAMPTZ,
    terms TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded')),
    estimated_value DECIMAL(14, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RFQ Lines table (Replaces Septra Order Lines)
CREATE TABLE IF NOT EXISTS rfq_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
    demand_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bids table (Linked to RFQ, not Septra Order)
CREATE TABLE IF NOT EXISTS bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    min_quantity INTEGER CHECK (min_quantity > 0),
    lead_time_days INTEGER NOT NULL CHECK (lead_time_days >= 0),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'awarded', 'rejected')),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (min_quantity <= quantity)
);

-- Awarded Bids table (Tracks which bids were awarded for which RFQ lines)
CREATE TABLE IF NOT EXISTS awarded_bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
    rfq_line_id UUID NOT NULL REFERENCES rfq_lines(id) ON DELETE CASCADE,
    awarded_price DECIMAL(12, 2) NOT NULL CHECK (awarded_price >= 0),
    awarded_quantity INTEGER NOT NULL CHECK (awarded_quantity > 0),
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(rfq_line_id) -- Only one awarded bid per RFQ line
);

-- Pharmacy Orders table (Linked to RFQ)
CREATE TABLE IF NOT EXISTS pharmacy_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_value DECIMAL(14, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
    payment_terms INTEGER CHECK (payment_terms IN (30, 60, 90)),
    delivery_address TEXT,
    confirmed_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pharmacy Order Lines table
CREATE TABLE IF NOT EXISTS pharmacy_order_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_order_id UUID NOT NULL REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(12, 2) NOT NULL GENERATED ALWAYS AS (unit_price * quantity) STORED,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined'))
);

-- Supplier Orders table (Linked to RFQ)
CREATE TABLE IF NOT EXISTS supplier_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_value DECIMAL(14, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_fulfillment', 'shipped', 'delivered', 'invoiced')),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    expected_delivery TIMESTAMPTZ,
    shipping_info TEXT
);

-- Supplier Order Lines table
CREATE TABLE IF NOT EXISTS supplier_order_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_order_id UUID NOT NULL REFERENCES supplier_orders(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(12, 2) NOT NULL GENERATED ALWAYS AS (unit_price * quantity) STORED,
    pharmacy_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Escrow table (Linked to RFQ)
CREATE TABLE IF NOT EXISTS escrows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(14, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'not_funded' CHECK (status IN ('not_funded', 'funded', 'released', 'refunded')),
    funded_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    reason TEXT
);

-- Logistics table (Linked to RFQ)
CREATE TABLE IF NOT EXISTS logistics_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pharmacy_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tracking_number VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up', 'in_transit', 'delivered')),
    shipment_date TIMESTAMPTZ,
    estimated_delivery TIMESTAMPTZ,
    actual_delivery TIMESTAMPTZ,
    notes TEXT
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE septra_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE awarded_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view own profile" ON users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- RLS Policies for skus (admin can manage, others can read active SKUs)
CREATE POLICY "Anyone can view active SKUs" ON skus FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage SKUs" ON skus FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for pharmacy_demands
CREATE POLICY "Pharmacies can manage own demands" ON pharmacy_demands FOR ALL TO authenticated USING (
    pharmacy_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for septra_orders (admin only)
CREATE POLICY "Admins can manage septra orders" ON septra_orders FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for rfqs
CREATE POLICY "Anyone can view open RFQs" ON rfqs FOR SELECT TO authenticated USING (status = 'open');
CREATE POLICY "Admins can manage RFQs" ON rfqs FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for rfq_lines
CREATE POLICY "Anyone can view RFQ lines for open RFQs" ON rfq_lines FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM rfqs WHERE id = rfq_id AND status = 'open')
);
CREATE POLICY "Admins can manage RFQ lines" ON rfq_lines FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for bids
CREATE POLICY "Suppliers can manage own bids" ON bids FOR ALL TO authenticated USING (
    supplier_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for awarded_bids
CREATE POLICY "Anyone can view awarded bids" ON awarded_bids FOR SELECT TO authenticated;
CREATE POLICY "Admins can manage awarded bids" ON awarded_bids FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for pharmacy_orders
CREATE POLICY "Pharmacies can manage own orders" ON pharmacy_orders FOR ALL TO authenticated USING (
    pharmacy_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for pharmacy_order_lines
CREATE POLICY "Pharmacies can view own order lines" ON pharmacy_order_lines FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM pharmacy_orders WHERE id = pharmacy_order_id AND pharmacy_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for supplier_orders
CREATE POLICY "Suppliers can manage own orders" ON supplier_orders FOR ALL TO authenticated USING (
    supplier_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for supplier_order_lines
CREATE POLICY "Suppliers can view own order lines" ON supplier_order_lines FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM supplier_orders WHERE id = supplier_order_id AND supplier_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for escrows
CREATE POLICY "Pharmacies can view own escrows" ON escrows FOR SELECT TO authenticated USING (
    pharmacy_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage escrows" ON escrows FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for logistics_entries
CREATE POLICY "Users can view relevant logistics" ON logistics_entries FOR SELECT TO authenticated USING (
    supplier_id = auth.uid() OR 
    pharmacy_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage logistics" ON logistics_entries FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_skus_code ON skus(code);
CREATE INDEX IF NOT EXISTS idx_skus_category ON skus(category);
CREATE INDEX IF NOT EXISTS idx_skus_is_active ON skus(is_active);
CREATE INDEX IF NOT EXISTS idx_pharmacy_demands_pharmacy_id ON pharmacy_demands(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_demands_sku_id ON pharmacy_demands(sku_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_demands_status ON pharmacy_demands(status);
CREATE INDEX IF NOT EXISTS idx_septra_orders_status ON septra_orders(status);
CREATE INDEX IF NOT EXISTS idx_rfqs_septra_order_id ON rfqs(septra_order_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON rfqs(status);
CREATE INDEX IF NOT EXISTS idx_rfqs_bidding_deadline ON rfqs(bidding_deadline);
CREATE INDEX IF NOT EXISTS idx_rfq_lines_rfq_id ON rfq_lines(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_lines_sku_id ON rfq_lines(sku_id);
CREATE INDEX IF NOT EXISTS idx_bids_rfq_id ON bids(rfq_id);
CREATE INDEX IF NOT EXISTS idx_bids_supplier_id ON bids(supplier_id);
CREATE INDEX IF NOT EXISTS idx_bids_sku_id ON bids(sku_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
CREATE INDEX IF NOT EXISTS idx_awarded_bids_bid_id ON awarded_bids(bid_id);
CREATE INDEX IF NOT EXISTS idx_awarded_bids_rfq_line_id ON awarded_bids(rfq_line_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_rfq_id ON pharmacy_orders(rfq_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_pharmacy_id ON pharmacy_orders(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_status ON pharmacy_orders(status);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_rfq_id ON supplier_orders(rfq_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_supplier_id ON supplier_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_status ON supplier_orders(status);
CREATE INDEX IF NOT EXISTS idx_escrows_rfq_id ON escrows(rfq_id);
CREATE INDEX IF NOT EXISTS idx_escrows_pharmacy_id ON escrows(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_escrows_status ON escrows(status);
CREATE INDEX IF NOT EXISTS idx_logistics_rfq_id ON logistics_entries(rfq_id);
CREATE INDEX IF NOT EXISTS idx_logistics_supplier_id ON logistics_entries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_logistics_pharmacy_id ON logistics_entries(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_logistics_status ON logistics_entries(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skus_updated_at BEFORE UPDATE ON skus FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pharmacy_demands_updated_at BEFORE UPDATE ON pharmacy_demands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_septra_orders_updated_at BEFORE UPDATE ON septra_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rfqs_updated_at BEFORE UPDATE ON rfqs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();