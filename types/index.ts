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
    [key: string]: any; // Flexible metadata system
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // Admin user ID
}

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
  status: 'draft' | 'rfq_open' | 'bidding_closed' | 'awarded' | 'awaiting_confirmations' | 'scheduled' | 'in_delivery' | 'completed' | 'cancelled';
  lines: SeptraOrderLine[];
  totalValue?: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  biddingDeadline?: Date;
  deliveryDeadline?: Date;
}

export interface SeptraOrderLine {
  id: string;
  skuId: string;
  totalQuantity: number;
  awardedSupplierId?: string;
  awardedPrice?: number;
  awardedQuantity?: number;
  demandBreakdown: {
    pharmacyId: string;
    quantity: number;
  }[];
}

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

export interface PharmacyOrder {
  id: string;
  septraOrderId: string;
  pharmacyId: string;
  lines: PharmacyOrderLine[];
  totalValue: number;
  status: 'pending' | 'confirmed' | 'declined';
  paymentTerms?: 30 | 60 | 90;
  deliveryAddress?: string;
  confirmedAt?: Date;
  declinedAt?: Date;
}

export interface PharmacyOrderLine {
  id: string;
  skuId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'declined';
}

export interface SupplierOrder {
  id: string;
  septraOrderId: string;
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
  skuId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  pharmacyBreakdown: {
    pharmacyId: string;
    quantity: number;
  }[];
}

export interface Escrow {
  id: string;
  septraOrderId: string;
  pharmacyId: string;
  amount: number;
  status: 'not_funded' | 'funded' | 'released' | 'refunded';
  fundedAt?: Date;
  releasedAt?: Date;
  refundedAt?: Date;
  reason?: string;
}

export interface LogisticsEntry {
  id: string;
  septraOrderId: string;
  supplierId: string;
  pharmacyId?: string;
  trackingNumber?: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered';
  shipmentDate?: Date;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  notes?: string;
}

export interface User {
  id: string;
  email: string;
  role: 'pharmacy' | 'supplier' | 'admin';
  profileId: string;
  name?: string;
  address?: string;
  phone?: string;
  licenseNumber?: string;
  rating?: number;
  categories?: string[];
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