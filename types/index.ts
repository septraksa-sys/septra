// Updated TypeScript interfaces for RFQ-central architecture

export interface User {
  id: string;
  email: string;
  role: 'pharmacy' | 'supplier' | 'admin';
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

// Simplified SeptraOrder - now mainly for demand aggregation and high-level tracking
export interface SeptraOrder {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'rfq_created' | 'bidding_complete' | 'orders_placed' | 'in_delivery' | 'completed' | 'cancelled';
  totalValue?: number;
  createdAt: Date;
  updatedAt: Date;
}

// RFQ is now the central entity for bidding process
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
  lines: RFQLine[]; // Include lines for easier data handling
  createdAt: Date;
  updatedAt: Date;
}

// RFQ Lines replace SeptraOrderLines
export interface RFQLine {
  id: string;
  rfqId: string;
  skuId: string;
  totalQuantity: number;
  demandBreakdown: {
    pharmacyId: string;
    quantity: number;
  }[];
  awardedBid?: AwardedBid; // Include awarded bid info for easier access
  createdAt: Date;
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
}

// New entity to track awarded bids
export interface AwardedBid {
  id: string;
  bidId: string;
  rfqLineId: string;
  awardedPrice: number;
  awardedQuantity: number;
  awardedAt: Date;
  bid?: Bid; // Include bid details for easier access
}

// Updated to reference RFQ instead of SeptraOrder
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

// Updated to reference RFQ instead of SeptraOrder
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

// Updated to reference RFQ instead of SeptraOrder
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

// Updated to reference RFQ instead of SeptraOrder
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

// Legacy interfaces for backward compatibility (deprecated)
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

// Helper types for the new RFQ-central workflow
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