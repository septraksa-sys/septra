// Main Types Export - Maintains backward compatibility
// This file exports frontend types by default for existing components

// Export all frontend types (UI-optimized) as the default
export * from './frontend';

// Also export database types for services that need them
export * as DatabaseTypes from './database';

// Export transformation utilities
export * from '../lib/transformers';

// Legacy exports for backward compatibility
export type { User, SKU, PharmacyDemand, SeptraOrder, RFQ, RFQLine, Bid, AwardedBid } from './frontend';
export type { 
  PharmacyOrder, 
  PharmacyOrderLine, 
  SupplierOrder, 
  SupplierOrderLine, 
  Escrow, 
  LogisticsEntry,
  Pharmacy,
  Supplier,
  Analytics
} from './frontend';

// Enhanced types with relationships
export type {
  RFQWithDetails,
  BidWithDetails,
  PharmacyOrderWithDetails,
  SupplierOrderWithDetails
} from './frontend';