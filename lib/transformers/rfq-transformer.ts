// RFQ Transformer - Complete Implementation Example
// This demonstrates the full pattern for all entities

import { BaseTransformer, TransformationResult, createTransformationResult } from './base-transformer';
import { RFQ, RFQLine, AwardedBid, Bid } from '@/types/frontend';
import { 
  DatabaseRFQ, 
  DatabaseRFQLine, 
  DatabaseAwardedBid, 
  DatabaseBid,
  DatabaseRFQWithRelations 
} from '@/types/database';

export class RFQTransformer extends BaseTransformer<RFQ, DatabaseRFQ> {
  // Transform Frontend RFQ to Database RFQ
  toDatabase(frontend: RFQ): DatabaseRFQ {
    return {
      id: frontend.id,
      septra_order_id: frontend.septraOrderId,
      title: frontend.title,
      description: frontend.description || null,
      published_at: this.transformDate(frontend.publishedAt)!,
      bidding_deadline: this.transformDate(frontend.biddingDeadline)!,
      delivery_requirement: this.transformDate(frontend.deliveryRequirement),
      terms: frontend.terms || null,
      status: frontend.status,
      estimated_value: frontend.estimatedValue || null,
      created_at: this.transformDate(frontend.createdAt)!,
      updated_at: this.transformDate(frontend.updatedAt)!
    };
  }

  // Transform Database RFQ to Frontend RFQ
  toFrontend(database: DatabaseRFQ): RFQ {
    return {
      id: database.id,
      septraOrderId: database.septra_order_id,
      title: database.title,
      description: database.description || undefined,
      publishedAt: new Date(database.published_at),
      biddingDeadline: new Date(database.bidding_deadline),
      deliveryRequirement: this.parseDate(database.delivery_requirement),
      terms: database.terms || undefined,
      status: database.status,
      estimatedValue: database.estimated_value || undefined,
      lines: [], // Will be populated separately or through relations
      createdAt: new Date(database.created_at),
      updatedAt: new Date(database.updated_at)
    };
  }

  // Transform Database RFQ with relations to Frontend RFQ with embedded data
  toFrontendWithRelations(database: DatabaseRFQWithRelations): RFQ {
    const baseRFQ = this.toFrontend(database);
    
    return {
      ...baseRFQ,
      lines: database.rfq_lines.map(line => ({
        id: line.id,
        rfqId: line.rfq_id,
        skuId: line.sku_id,
        totalQuantity: line.total_quantity,
        demandBreakdown: line.demand_breakdown,
        createdAt: new Date(line.created_at),
        sku: line.skus ? {
          id: line.skus.id,
          code: line.skus.code,
          name: line.skus.name,
          description: line.skus.description || undefined,
          category: line.skus.category,
          strength: line.skus.strength || '',
          unit: line.skus.unit,
          metadata: line.skus.metadata || {},
          isActive: line.skus.is_active,
          createdAt: new Date(line.skus.created_at),
          updatedAt: new Date(line.skus.updated_at),
          createdBy: line.skus.created_by
        } : undefined,
        awardedBid: line.awarded_bids[0] ? {
          id: line.awarded_bids[0].id,
          bidId: line.awarded_bids[0].bid_id,
          rfqLineId: line.awarded_bids[0].rfq_line_id,
          awardedPrice: line.awarded_bids[0].awarded_price,
          awardedQuantity: line.awarded_bids[0].awarded_quantity,
          awardedAt: new Date(line.awarded_bids[0].awarded_at),
          bid: line.awarded_bids[0].bids ? {
            id: line.awarded_bids[0].bids.id,
            rfqId: line.awarded_bids[0].bids.rfq_id,
            supplierId: line.awarded_bids[0].bids.supplier_id,
            skuId: line.awarded_bids[0].bids.sku_id,
            unitPrice: line.awarded_bids[0].bids.unit_price,
            quantity: line.awarded_bids[0].bids.quantity,
            minQuantity: line.awarded_bids[0].bids.min_quantity || undefined,
            leadTimeDays: line.awarded_bids[0].bids.lead_time_days,
            notes: line.awarded_bids[0].bids.notes || undefined,
            status: line.awarded_bids[0].bids.status,
            submittedAt: new Date(line.awarded_bids[0].bids.submitted_at)
          } : undefined
        } : undefined
      })),
      septraOrder: database.septra_orders ? {
        id: database.septra_orders.id,
        title: database.septra_orders.title,
        description: database.septra_orders.description || undefined,
        status: database.septra_orders.status,
        totalValue: database.septra_orders.total_value || undefined,
        createdAt: new Date(database.septra_orders.created_at),
        updatedAt: new Date(database.septra_orders.updated_at)
      } : undefined
    };
  }

  // Validate RFQ data before transformation
  validateForDatabase(frontend: RFQ): TransformationResult<DatabaseRFQ> {
    const errors: string[] = [];
    
    // Required field validation
    errors.push(...this.validateRequired(frontend, ['id', 'septraOrderId', 'title', 'publishedAt', 'biddingDeadline']));
    
    // Business logic validation
    if (frontend.biddingDeadline <= frontend.publishedAt) {
      errors.push('Bidding deadline must be after published date');
    }
    
    if (frontend.deliveryRequirement && frontend.deliveryRequirement <= frontend.biddingDeadline) {
      errors.push('Delivery requirement must be after bidding deadline');
    }
    
    // Foreign key validation
    errors.push(...this.validateForeignKey(frontend.septraOrderId, 'SeptraOrder'));
    
    if (errors.length > 0) {
      return createTransformationResult<DatabaseRFQ>(undefined, errors);
    }
    
    return createTransformationResult(this.toDatabase(frontend));
  }

  // Create RFQ with lines in a single transaction
  async createRFQWithLines(
    rfqData: Omit<RFQ, 'id' | 'createdAt' | 'updatedAt'>,
    lines: Omit<RFQLine, 'id' | 'rfqId' | 'createdAt'>[]
  ): Promise<TransformationResult<RFQ>> {
    try {
      // Validate RFQ data
      const tempRFQ: RFQ = {
        ...rfqData,
        id: 'temp',
        lines: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const validation = this.validateForDatabase(tempRFQ);
      if (!validation.success) {
        return validation as TransformationResult<RFQ>;
      }

      // This would be implemented in the actual service layer
      // For now, return a mock successful result
      const createdRFQ: RFQ = {
        ...tempRFQ,
        id: `rfq_${Date.now()}`,
        lines: lines.map((line, index) => ({
          ...line,
          id: `line_${Date.now()}_${index}`,
          rfqId: `rfq_${Date.now()}`,
          createdAt: new Date()
        }))
      };

      return createTransformationResult(createdRFQ);
    } catch (error) {
      return createTransformationResult<RFQ>(undefined, [`Failed to create RFQ: ${error}`]);
    }
  }
}

// RFQ Line Transformer
export class RFQLineTransformer extends BaseTransformer<RFQLine, DatabaseRFQLine> {
  toDatabase(frontend: RFQLine): DatabaseRFQLine {
    return {
      id: frontend.id,
      rfq_id: frontend.rfqId,
      sku_id: frontend.skuId,
      total_quantity: frontend.totalQuantity,
      demand_breakdown: frontend.demandBreakdown,
      created_at: this.transformDate(frontend.createdAt)!
    };
  }

  toFrontend(database: DatabaseRFQLine): RFQLine {
    return {
      id: database.id,
      rfqId: database.rfq_id,
      skuId: database.sku_id,
      totalQuantity: database.total_quantity,
      demandBreakdown: database.demand_breakdown,
      createdAt: new Date(database.created_at)
    };
  }
}

// Bid Transformer
export class BidTransformer extends BaseTransformer<Bid, DatabaseBid> {
  toDatabase(frontend: Bid): DatabaseBid {
    return {
      id: frontend.id,
      rfq_id: frontend.rfqId,
      supplier_id: frontend.supplierId,
      sku_id: frontend.skuId,
      unit_price: frontend.unitPrice,
      quantity: frontend.quantity,
      min_quantity: frontend.minQuantity || null,
      lead_time_days: frontend.leadTimeDays,
      notes: frontend.notes || null,
      status: frontend.status,
      submitted_at: this.transformDate(frontend.submittedAt)!
    };
  }

  toFrontend(database: DatabaseBid): Bid {
    return {
      id: database.id,
      rfqId: database.rfq_id,
      supplierId: database.supplier_id,
      skuId: database.sku_id,
      unitPrice: database.unit_price,
      quantity: database.quantity,
      minQuantity: database.min_quantity || undefined,
      leadTimeDays: database.lead_time_days,
      notes: database.notes || undefined,
      status: database.status,
      submittedAt: new Date(database.submitted_at)
    };
  }
}

// Awarded Bid Transformer
export class AwardedBidTransformer extends BaseTransformer<AwardedBid, DatabaseAwardedBid> {
  toDatabase(frontend: AwardedBid): DatabaseAwardedBid {
    return {
      id: frontend.id,
      bid_id: frontend.bidId,
      rfq_line_id: frontend.rfqLineId,
      awarded_price: frontend.awardedPrice,
      awarded_quantity: frontend.awardedQuantity,
      awarded_at: this.transformDate(frontend.awardedAt)!
    };
  }

  toFrontend(database: DatabaseAwardedBid): AwardedBid {
    return {
      id: database.id,
      bidId: database.bid_id,
      rfqLineId: database.rfq_line_id,
      awardedPrice: database.awarded_price,
      awardedQuantity: database.awarded_quantity,
      awardedAt: new Date(database.awarded_at)
    };
  }
}

// Transformer factory for creating instances
export class TransformerFactory {
  private static rfqTransformer = new RFQTransformer();
  private static rfqLineTransformer = new RFQLineTransformer();
  private static bidTransformer = new BidTransformer();
  private static awardedBidTransformer = new AwardedBidTransformer();

  static getRFQTransformer(): RFQTransformer {
    return this.rfqTransformer;
  }

  static getRFQLineTransformer(): RFQLineTransformer {
    return this.rfqLineTransformer;
  }

  static getBidTransformer(): BidTransformer {
    return this.bidTransformer;
  }

  static getAwardedBidTransformer(): AwardedBidTransformer {
    return this.awardedBidTransformer;
  }
}