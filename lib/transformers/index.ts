// Transformer Index - Central export for all transformers
// This provides a single import point for all transformation utilities

import { BaseTransformer } from './base-transformer';
import { TransformerFactory } from './rfq-transformer';
import { SKUTransformerFactory } from './sku-transformer';

export { BaseTransformer, TransformationError, createTransformationResult } from './base-transformer';
export { 
  RFQTransformer, 
  RFQLineTransformer, 
  BidTransformer, 
  AwardedBidTransformer,
  TransformerFactory 
} from './rfq-transformer';
export { 
  SKUTransformer,
  SKUTransformerFactory 
} from './sku-transformer';
export { 
  EntityTransformerTemplate, 
  createEntityTransformer 
} from './entity-transformer-template';

// Re-export all transformer instances for easy access
export const Transformers = {
  RFQ: TransformerFactory.getRFQTransformer(),
  RFQLine: TransformerFactory.getRFQLineTransformer(),
  Bid: TransformerFactory.getBidTransformer(),
  AwardedBid: TransformerFactory.getAwardedBidTransformer(),
  SKU: SKUTransformerFactory.getInstance()
};

// Utility functions for common transformation patterns
export const transformDateArray = (dates: (Date | string)[]): string[] => {
  return dates.map(date => 
    typeof date === 'string' ? date : date.toISOString()
  );
};

export const parseDateArray = (dateStrings: string[]): Date[] => {
  return dateStrings.map(dateString => new Date(dateString));
};

export const transformOptionalDate = (date?: Date | null): string | null => {
  return date ? date.toISOString() : null;
};

export const parseOptionalDate = (dateString?: string | null): Date | undefined => {
  return dateString ? new Date(dateString) : undefined;
};

// Batch transformation utilities
export const batchTransformToDatabase = <F, D>(
  items: F[],
  transformer: BaseTransformer<F, D>
): D[] => {
  return items.map(item => transformer.toDatabase(item));
};

export const batchTransformToFrontend = <F, D>(
  items: D[],
  transformer: BaseTransformer<F, D>
): F[] => {
  return items.map(item => transformer.toFrontend(item));
};

// Type-safe transformation with error handling
export const safeTransform = <F, D>(
  item: F,
  transformer: BaseTransformer<F, D>
): { success: boolean; data?: D; error?: string } => {
  try {
    const data = transformer.toDatabase(item);
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown transformation error' 
    };
  }
};