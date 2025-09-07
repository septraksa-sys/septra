// Frontend Types - UI-Optimized
// These types include embedded relationships for easier UI consumption
// Keep all existing frontend interfaces unchanged for backward compatibility

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

export interface SeptraOrder {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'rfq_created' | 'bidding_complete' | 'orders_placed' | 'in_delivery' | 'completed' | 'cancelled';
  totalValue?: number;
  createdAt: Date;
  updatedAt: Date;
  // Legacy fields for backward compatibility
  lines?: SeptraOrderLine[];
  biddingDeadline?: Date;
  deliveryDeadline?: Date;
}

export interface SeptraOrderLine {
  id: string;
  skuId: string;
  totalQuantity: number;
  demandBreakdown: {
    pharmacyId: string;
    quantity: number;
  }[];
  awardedSupplierId?: string;
  awardedPrice?: number;
  awardedQuantity?: number;
}

// RFQ - Frontend type with embedded relationships
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
  lines: RFQLine[]; // Embedded for easier UI access
  createdAt: Date;
  updatedAt: Date;
  // Computed fields for UI
  septraOrder?: SeptraOrder;
  totalBids?: number;
  timeLeft?: string;
}

export interface RFQLine {
  id: string;
  rfqId: string;
  skuId: string;
  totalQuantity: number;
  demandBreakdown: {
    pharmacyId: string;
    quantity: number;
  }[];
  awardedBid?: AwardedBid;
  createdAt: Date;
  // Embedded for UI
  sku?: SKU;
  bids?: Bid[];
}

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
  // Embedded for UI
  rfq?: RFQ;
  sku?: SKU;
  supplier?: User;
}

export interface AwardedBid {
  id: string;
  bidId: string;
  rfqLineId: string;
  awardedPrice: number;
  awardedQuantity: number;
  awardedAt: Date;
  bid?: Bid; // Embedded for easier access
}

export interface PharmacyOrder {
  id: string;
  rfqId: string;
  pharmacyId: string;
  lines: PharmacyOrderLine[];
  totalValue: number;
  status: 'pending' | 'confirmed' | 'declined';
  paymentTerms?: 30 | 60 | 90;
  deliveryAddress?: string;
  confirmedAt?: Date;
  declinedAt?: Date;
  createdAt: Date;
  // Embedded for UI
  rfq?: RFQ;
  pharmacy?: User;
}

export interface PharmacyOrderLine {
  id: string;
  pharmacyOrderId: string;
  skuId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'declined';
  // Embedded for UI
  sku?: SKU;
}

export interface SupplierOrder {
  id: string;
  rfqId: string;
  supplierId: string;
  lines: SupplierOrderLine[];
  totalValue: number;
  status: 'assigned' | 'in_fulfillment' | 'shipped' | 'delivered' | 'invoiced';
  assignedAt: Date;
  expectedDelivery?: Date;
  shippingInfo?: string;
  // Embedded for UI
  rfq?: RFQ;
  supplier?: User;
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
  // Embedded for UI
  sku?: SKU;
}

export interface Escrow {
  id: string;
  rfqId: string;
  pharmacyId: string;
  amount: number;
  status: 'not_funded' | 'funded' | 'released' | 'refunded';
  fundedAt?: Date;
  releasedAt?: Date;
  refundedAt?: Date;
  reason?: string;
  // Embedded for UI
  rfq?: RFQ;
  pharmacy?: User;
}

export interface LogisticsEntry {
  id: string;
  rfqId: string;
  supplierId: string;
  pharmacyId?: string;
  trackingNumber?: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered';
  shipmentDate?: Date;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  notes?: string;
  // Embedded for UI
  rfq?: RFQ;
  supplier?: User;
  pharmacy?: User;
}

// Legacy interfaces for backward compatibility
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

// Enhanced types with embedded relationships for complex UI scenarios
export interface RFQWithDetails extends RFQ {
  septraOrder: SeptraOrder;
  lines: (RFQLine & {
    sku: SKU;
    bids: Bid[];
    awardedBid?: AwardedBid & { bid: Bid };
  })[];
  totalBids: number;
  uniqueSuppliers: number;
  averageBidPrice: number;
}

export interface BidWithDetails extends Bid {
  rfq: RFQ;
  sku: SKU;
  supplier: User;
  rank?: number;
  competitiveness?: 'high' | 'medium' | 'low';
}

export interface PharmacyOrderWithDetails extends PharmacyOrder {
  rfq: RFQ;
  pharmacy: User;
  lines: (PharmacyOrderLine & { sku: SKU })[];
  escrow?: Escrow;
  logistics?: LogisticsEntry[];
}

export interface SupplierOrderWithDetails extends SupplierOrder {
  rfq: RFQ;
  supplier: User;
  lines: (SupplierOrderLine & { sku: SKU })[];
  logistics?: LogisticsEntry[];
}

// Analytics and reporting types
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

// Type guards for runtime validation
export const isRFQ = (obj: any): obj is RFQ => {
  return obj && typeof obj.id === 'string' && typeof obj.septraOrderId === 'string';
};

export const isPharmacyOrder = (obj: any): obj is PharmacyOrder => {
  return obj && typeof obj.id === 'string' && typeof obj.rfqId === 'string';
};

export const isBid = (obj: any): obj is Bid => {
  return obj && typeof obj.id === 'string' && typeof obj.rfqId === 'string' && typeof obj.supplierId === 'string';
};