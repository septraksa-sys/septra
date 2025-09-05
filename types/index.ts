// RFQ-Central Architecture - Updated TypeScript interfaces
// This schema reflects the migration from SeptraOrder-central to RFQ-central design

export interface User {
  id: string;
  email: string;
  role: 'pharmacy' | 'supplier' | 'admin';
  profileId?: string; // For backward compatibility
  name?: string;
  address?: string;
  phone?: string;
  licenseNumber?: string;
  rating?: number;
  categories?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Core SKU entity - remains unchanged but enhanced
export interface SKU {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  strength: string;
  unit: string;
  metadata: {
    dosageForm?: string;
    packSize?: string;
    manufacturer?: string;
    requiresExpiry?: boolean;
    storageConditions?: string;
    therapeuticClass?: string;
    [key: string]: any;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Individual pharmacy demands - input to the aggregation process
export interface PharmacyDemand {
  id: string;
  pharmacyId: string;
  skuId: string;
  quantity: number;
  maxUnitPrice?: number;
  notes?: string;
  status: 'draft' | 'submitted';
  createdAt: Date;
  updatedAt: Date;
}

// SeptraOrder - Now simplified for demand aggregation and high-level tracking only
// The core business logic has moved to RFQ
export interface SeptraOrder {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'rfq_created' | 'bidding_complete' | 'orders_placed' | 'in_delivery' | 'completed' | 'cancelled';
  totalValue?: number;
  createdAt: Date;
  updatedAt: Date;
}

// RFQ - THE CENTRAL ENTITY for the bidding process
// This is where the main business logic now resides
// All other entities reference RFQ instead of SeptraOrder
export interface RFQ {
  id: string;
  septraOrderId: string;
  title: string;
  description?: string;
  publishedAt: Date;
  biddingDeadline: Date;
  deliveryRequirement?: Date;
  terms?: string;
  status: 'open' | 'closed' | 'awarded';
  estimatedValue?: number;
  lines: RFQLine[]; // Embedded for easier data handling
  createdAt: Date;
  updatedAt: Date;
}

// RFQLine - Replaces the old SeptraOrderLine
// Now linked to RFQ instead of SeptraOrder
export interface RFQLine {
  id: string;
  rfqId: string;
  skuId: string;
  totalQuantity: number;
  demandBreakdown: {
    pharmacyId: string;
    quantity: number;
  }[];
  awardedBid?: AwardedBid; // Embedded for easier access
  createdAt: Date;
}

// Bid entity - now references RFQ directly
export interface Bid {
  id: string;
  rfqId: string;
  supplierId: string;
  skuId: string;
  unitPrice: number;
  quantity: number;
  minQuantity?: number;
  leadTimeDays: number;
  notes?: string;
  status: 'submitted' | 'awarded' | 'rejected';
  submittedAt: Date;
}

// AwardedBid - New entity to track which bids were selected
export interface AwardedBid {
  id: string;
  bidId: string;
  rfqLineId: string;
  awardedPrice: number;
  awardedQuantity: number;
  awardedAt: Date;
  bid?: Bid; // Embedded for easier access
}

// PharmacyOrder - Now references RFQ instead of SeptraOrder
// Generated after bids are awarded
export interface PharmacyOrder {
  id: string;
  rfqId: string; // Changed from septraOrderId
  pharmacyId: string;
  lines: PharmacyOrderLine[];
  totalValue: number;
  status: 'pending' | 'confirmed' | 'declined';
  paymentTerms?: 30 | 60 | 90;
  deliveryAddress?: string;
  confirmedAt?: Date;
  declinedAt?: Date;
  createdAt: Date;
}

export interface PharmacyOrderLine {
  id: string;
  pharmacyOrderId: string;
  skuId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'declined';
}

// SupplierOrder - Now references RFQ instead of SeptraOrder
// Generated for awarded suppliers
export interface SupplierOrder {
  id: string;
  rfqId: string; // Changed from septraOrderId
  supplierId: string;
  lines: SupplierOrderLine[];
  totalValue: number;
  status: 'assigned' | 'in_fulfillment' | 'shipped' | 'delivered' | 'invoiced';
  assignedAt: Date;
  expectedDelivery?: Date;
  shippingInfo?: string;
}

export interface SupplierOrderLine {
  id: string;
  supplierOrderId: string;
  skuId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  pharmacyBreakdown: {
    pharmacyId: string;
    quantity: number;
  }[];
}

// Escrow - Now references RFQ instead of SeptraOrder
// Manages secure payments
export interface Escrow {
  id: string;
  rfqId: string; // Changed from septraOrderId
  pharmacyId: string;
  amount: number;
  status: 'not_funded' | 'funded' | 'released' | 'refunded';
  fundedAt?: Date;
  releasedAt?: Date;
  refundedAt?: Date;
  reason?: string;
}

// LogisticsEntry - Now references RFQ instead of SeptraOrder
// Tracks delivery and shipment
export interface LogisticsEntry {
  id: string;
  rfqId: string; // Changed from septraOrderId
  supplierId: string;
  pharmacyId?: string;
  trackingNumber?: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered';
  shipmentDate?: Date;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  notes?: string;
}

// Legacy interfaces - Maintained for backward compatibility
// These will be phased out in future versions
export interface Pharmacy {
  id: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  licenseNumber: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  rating: number;
  categories: string[];
}

// Analytics interface - Updated to work with RFQ-central model
export interface Analytics {
  totalOrders: number;
  totalValue: number;
  avgSavings: number;
  supplierPerformance: {
    supplierId: string;
    name: string;
    onTimeDelivery: number;
    qualityScore: number;
    responseTime: number;
    totalBids: number;
    awardedBids: number;
    winRate: number;
  }[];
  pharmacyParticipation: {
    pharmacyId: string;
    name: string;
    totalOrders: number;
    totalValue: number;
  }[];
}

// Helper types for RFQ-central workflow
// These provide enriched data for UI components
export interface RFQWithDetails extends RFQ {
  septraOrder: SeptraOrder;
  lines: (RFQLine & {
    sku: SKU;
    bids: Bid[];
    awardedBid?: AwardedBid & { bid: Bid };
  })[];
}

export interface BidWithDetails extends Bid {
  rfq: RFQ;
  sku: SKU;
  supplier: User;
}

export interface PharmacyOrderWithDetails extends PharmacyOrder {
  rfq: RFQ;
  pharmacy: User;
  lines: (PharmacyOrderLine & { sku: SKU })[];
}

export interface SupplierOrderWithDetails extends SupplierOrder {
  rfq: RFQ;
  supplier: User;
  lines: (SupplierOrderLine & { sku: SKU })[];
}

// Schema validation helpers
export interface SchemaValidationError {
  field: string;
  message: string;
  code: string;
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: SchemaValidationError[];
}

// Type guards for runtime validation
export const isRFQ = (obj: any): obj is RFQ => {
  return obj && typeof obj.id === 'string' && typeof obj.septraOrderId === 'string';
};

export const isPharmacyOrder = (obj: any): obj is PharmacyOrder => {
  return obj && typeof obj.id === 'string' && typeof obj.rfqId === 'string';
};