import { supabase } from '@/lib/supabase-client';
import { RFQ, RFQLine, Bid, AwardedBid, PharmacyDemand, SeptraOrder } from '@/types/frontend';
import { 
  DatabaseRFQ, 
  DatabaseRFQLine, 
  DatabaseRFQWithRelations,
  DatabaseBid,
  DatabaseAwardedBid 
} from '@/types/database';
import { TransformerFactory } from '@/lib/transformers/rfq-transformer';

export class RFQService {
  private static rfqTransformer = TransformerFactory.getRFQTransformer();
  private static rfqLineTransformer = TransformerFactory.getRFQLineTransformer();
  private static bidTransformer = TransformerFactory.getBidTransformer();
  private static awardedBidTransformer = TransformerFactory.getAwardedBidTransformer();

  // Create RFQ from SeptraOrder demands
  static async createRFQFromSeptraOrder(
    septraOrderId: string,
    rfqData: {
      title: string;
      description?: string;
      biddingDeadline: Date;
      deliveryRequirement?: Date;
      terms?: string;
    }
  ): Promise<{ rfq: RFQ; lines: RFQLine[] } | null> {
    try {
      // Get pharmacy demands for this septra order
      const { data: demands, error: demandsError } = await supabase
        .from('pharmacy_demands')
        .select('*')
        .eq('status', 'submitted');

      if (demandsError) throw demandsError;

      // Group demands by SKU
      const skuGroups: { [skuId: string]: any[] } = {};
      demands?.forEach(demand => {
        if (!skuGroups[demand.sku_id]) {
          skuGroups[demand.sku_id] = [];
        }
        skuGroups[demand.sku_id].push(demand);
      });

      // Create RFQ in database
      const databaseRFQ: Omit<DatabaseRFQ, 'id' | 'created_at' | 'updated_at'> = {
        septra_order_id: septraOrderId,
        title: rfqData.title,
        description: rfqData.description || null,
        published_at: new Date().toISOString(),
        bidding_deadline: rfqData.biddingDeadline.toISOString(),
        delivery_requirement: rfqData.deliveryRequirement?.toISOString() || null,
        terms: rfqData.terms || null,
        status: 'open',
        estimated_value: null
      };

      const { data: createdRFQ, error: rfqError } = await supabase
        .from('rfqs')
        .insert(databaseRFQ)
        .select()
        .single();

      if (rfqError) throw rfqError;

      // Create RFQ lines
      const rfqLines = Object.entries(skuGroups).map(([skuId, demands]) => ({
        rfq_id: createdRFQ.id,
        sku_id: skuId,
        total_quantity: demands.reduce((sum: number, d: any) => sum + d.quantity, 0),
        demand_breakdown: demands.map((d: any) => ({
          pharmacyId: d.pharmacy_id,
          quantity: d.quantity
        }))
      }));

      const { data: linesData, error: linesError } = await supabase
        .from('rfq_lines')
        .insert(rfqLines)
        .select();

      if (linesError) throw linesError;

      // Update septra order status
      await supabase
        .from('septra_orders')
        .update({ status: 'rfq_created' })
        .eq('id', septraOrderId);

      // Transform to frontend types
      const frontendRFQ = this.rfqTransformer.toFrontend(createdRFQ);
      const frontendLines = linesData.map(line => this.rfqLineTransformer.toFrontend(line));

      return { rfq: frontendRFQ, lines: frontendLines };
    } catch (error) {
      console.error('Error creating RFQ:', error);
      return null;
    }
  }

  // Get RFQs with their lines (using transformers)
  static async getRFQsWithLines(): Promise<RFQ[]> {
    try {
      const { data: rfqs, error: rfqsError } = await supabase
        .from('rfqs')
        .select(`
          *,
          septra_orders (*),
          rfq_lines (
            *,
            skus (*),
            awarded_bids (
              *,
              bids (*)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (rfqsError) throw rfqsError;

      return rfqs.map(rfq => this.rfqTransformer.toFrontendWithRelations(rfq as DatabaseRFQWithRelations));
    } catch (error) {
      console.error('Error fetching RFQs:', error);
      return [];
    }
  }

  // Award bid to RFQ line (using transformers)
  static async awardBid(bidId: string, rfqLineId: string): Promise<boolean> {
    try {
      // Get the bid details
      const { data: bid, error: bidError } = await supabase
        .from('bids')
        .select('*')
        .eq('id', bidId)
        .single();

      if (bidError) throw bidError;

      // Create awarded bid record
      const awardedBidData: Omit<DatabaseAwardedBid, 'id' | 'awarded_at'> = {
        bid_id: bidId,
        rfq_line_id: rfqLineId,
        awarded_price: bid.unit_price,
        awarded_quantity: bid.quantity
      };

      const { error: awardError } = await supabase
        .from('awarded_bids')
        .insert(awardedBidData);

      if (awardError) throw awardError;

      // Update bid status to awarded
      await supabase
        .from('bids')
        .update({ status: 'awarded' })
        .eq('id', bidId);

      // Reject other bids for the same RFQ line
      await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('rfq_id', bid.rfq_id)
        .eq('sku_id', bid.sku_id)
        .neq('id', bidId);

      return true;
    } catch (error) {
      console.error('Error awarding bid:', error);
      return false;
    }
  }

  // Close RFQ bidding
  static async closeRFQBidding(rfqId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rfqs')
        .update({ status: 'closed' })
        .eq('id', rfqId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error closing RFQ bidding:', error);
      return false;
    }
  }

  // Get open RFQs for suppliers (with transformations)
  static async getOpenRFQsForSupplier(supplierId: string): Promise<RFQ[]> {
    try {
      // Get supplier categories
      const { data: supplier, error: supplierError } = await supabase
        .from('users')
        .select('categories')
        .eq('id', supplierId)
        .single();

      if (supplierError) throw supplierError;

      const categories = supplier.categories || [];

      // Get open RFQs with lines that match supplier categories
      const { data: rfqs, error: rfqsError } = await supabase
        .from('rfqs')
        .select(`
          *,
          septra_orders (*),
          rfq_lines (
            *,
            skus (*)
          )
        `)
        .eq('status', 'open')
        .gt('bidding_deadline', new Date().toISOString());

      if (rfqsError) throw rfqsError;

      // Filter RFQs that have SKUs matching supplier categories
      const relevantRFQs = rfqs.filter(rfq => 
        rfq.rfq_lines.some((line: any) => 
          categories.includes('ALL') || 
          categories.includes(line.skus.category)
        )
      );

      return relevantRFQs.map(rfq => this.rfqTransformer.toFrontendWithRelations(rfq as DatabaseRFQWithRelations));
    } catch (error) {
      console.error('Error fetching open RFQs for supplier:', error);
      return [];
    }
  }

  // Submit bid on RFQ (using transformers)
  static async submitBid(bidData: {
    rfqId: string;
    supplierId: string;
    skuId: string;
    unitPrice: number;
    quantity: number;
    minQuantity?: number;
    leadTimeDays: number;
    notes?: string;
  }): Promise<Bid | null> {
    try {
      const databaseBidData: Omit<DatabaseBid, 'id' | 'submitted_at'> = {
        rfq_id: bidData.rfqId,
        supplier_id: bidData.supplierId,
        sku_id: bidData.skuId,
        unit_price: bidData.unitPrice,
        quantity: bidData.quantity,
        min_quantity: bidData.minQuantity || null,
        lead_time_days: bidData.leadTimeDays,
        notes: bidData.notes || null,
        status: 'submitted'
      };

      const { data, error } = await supabase
        .from('bids')
        .insert(databaseBidData)
        .select()
        .single();

      if (error) throw error;

      return this.bidTransformer.toFrontend(data);
    } catch (error) {
      console.error('Error submitting bid:', error);
      return null;
    }
  }

  // Get bids for supplier (with transformations)
  static async getBidsForSupplier(supplierId: string): Promise<Bid[]> {
    try {
      const { data, error } = await supabase
        .from('bids')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      return data.map(bid => this.bidTransformer.toFrontend(bid));
    } catch (error) {
      console.error('Error fetching supplier bids:', error);
      return [];
    }
  }

  // Generate pharmacy orders from awarded RFQ
  static async generatePharmacyOrdersFromRFQ(rfqId: string): Promise<boolean> {
    try {
      // Get RFQ with awarded lines
      const { data: rfq, error: rfqError } = await supabase
        .from('rfqs')
        .select(`
          *,
          rfq_lines (
            *,
            awarded_bids (
              *,
              bids (*)
            )
          )
        `)
        .eq('id', rfqId)
        .single();

      if (rfqError) throw rfqError;

      // Get awarded lines only
      const awardedLines = rfq.rfq_lines.filter((line: any) => line.awarded_bids.length > 0);

      if (awardedLines.length === 0) {
        throw new Error('No awarded lines found for RFQ');
      }

      // Group by pharmacy
      const pharmacyGroups: { [pharmacyId: string]: any[] } = {};
      awardedLines.forEach((line: any) => {
        line.demand_breakdown.forEach((breakdown: any) => {
          if (!pharmacyGroups[breakdown.pharmacyId]) {
            pharmacyGroups[breakdown.pharmacyId] = [];
          }
          pharmacyGroups[breakdown.pharmacyId].push({
            ...line,
            pharmacyQuantity: breakdown.quantity
          });
        });
      });

      // Create pharmacy orders
      for (const [pharmacyId, lines] of Object.entries(pharmacyGroups)) {
        const totalValue = lines.reduce((sum, line) => 
          sum + (line.pharmacyQuantity * line.awarded_bids[0].awarded_price), 0
        );

        // Create pharmacy order
        const { data: pharmacyOrder, error: orderError } = await supabase
          .from('pharmacy_orders')
          .insert({
            rfq_id: rfqId,
            pharmacy_id: pharmacyId,
            total_value: totalValue,
            status: 'pending'
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create pharmacy order lines
        const orderLines = lines.map((line: any) => ({
          pharmacy_order_id: pharmacyOrder.id,
          sku_id: line.sku_id,
          quantity: line.pharmacyQuantity,
          unit_price: line.awarded_bids[0].awarded_price,
          status: 'pending'
        }));

        const { error: linesError } = await supabase
          .from('pharmacy_order_lines')
          .insert(orderLines);

        if (linesError) throw linesError;
      }

      // Update RFQ status
      await supabase
        .from('rfqs')
        .update({ status: 'awarded' })
        .eq('id', rfqId);

      return true;
    } catch (error) {
      console.error('Error generating pharmacy orders:', error);
      return false;
    }
  }

  // Generate supplier orders from awarded RFQ
  static async generateSupplierOrdersFromRFQ(rfqId: string): Promise<boolean> {
    try {
      // Get awarded bids grouped by supplier
      const { data: awardedBids, error } = await supabase
        .from('awarded_bids')
        .select(`
          *,
          bids (*),
          rfq_lines (*)
        `)
        .eq('rfq_lines.rfq_id', rfqId);

      if (error) throw error;

      // Group by supplier
      const supplierGroups: { [supplierId: string]: any[] } = {};
      awardedBids?.forEach(awardedBid => {
        const supplierId = awardedBid.bids.supplier_id;
        if (!supplierGroups[supplierId]) {
          supplierGroups[supplierId] = [];
        }
        supplierGroups[supplierId].push(awardedBid);
      });

      // Create supplier orders
      for (const [supplierId, awards] of Object.entries(supplierGroups)) {
        const totalValue = awards.reduce((sum, award) => 
          sum + (award.awarded_quantity * award.awarded_price), 0
        );

        // Create supplier order
        const { data: supplierOrder, error: orderError } = await supabase
          .from('supplier_orders')
          .insert({
            rfq_id: rfqId,
            supplier_id: supplierId,
            total_value: totalValue,
            status: 'assigned'
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create supplier order lines
        const orderLines = awards.map((award: any) => ({
          supplier_order_id: supplierOrder.id,
          sku_id: award.rfq_lines.sku_id,
          quantity: award.awarded_quantity,
          unit_price: award.awarded_price,
          pharmacy_breakdown: award.rfq_lines.demand_breakdown
        }));

        const { error: linesError } = await supabase
          .from('supplier_order_lines')
          .insert(orderLines);

        if (linesError) throw linesError;
      }

      return true;
    } catch (error) {
      console.error('Error generating supplier orders:', error);
      return false;
    }
  }

  // Get all RFQs (admin view)
  static async getAllRFQs(): Promise<RFQ[]> {
    try {
      const { data: rfqs, error } = await supabase
        .from('rfqs')
        .select(`
          *,
          septra_orders (*),
          rfq_lines (
            *,
            skus (*),
            awarded_bids (
              *,
              bids (*)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return rfqs.map(rfq => this.rfqTransformer.toFrontendWithRelations(rfq as DatabaseRFQWithRelations));
    } catch (error) {
      console.error('Error fetching all RFQs:', error);
      return [];
    }
  }

  // Update RFQ
  static async updateRFQ(rfqId: string, updates: Partial<RFQ>): Promise<boolean> {
    try {
      // Transform frontend updates to database format
      const databaseUpdates: Partial<DatabaseRFQ> = {};
      
      if (updates.title) databaseUpdates.title = updates.title;
      if (updates.description !== undefined) databaseUpdates.description = updates.description || null;
      if (updates.biddingDeadline) databaseUpdates.bidding_deadline = updates.biddingDeadline.toISOString();
      if (updates.deliveryRequirement !== undefined) {
        databaseUpdates.delivery_requirement = updates.deliveryRequirement?.toISOString() || null;
      }
      if (updates.terms !== undefined) databaseUpdates.terms = updates.terms || null;
      if (updates.status) databaseUpdates.status = updates.status;
      if (updates.estimatedValue !== undefined) databaseUpdates.estimated_value = updates.estimatedValue || null;

      const { error } = await supabase
        .from('rfqs')
        .update(databaseUpdates)
        .eq('id', rfqId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating RFQ:', error);
      return false;
    }
  }

  // Delete RFQ
  static async deleteRFQ(rfqId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rfqs')
        .delete()
        .eq('id', rfqId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting RFQ:', error);
      return false;
    }
  }

  // Get RFQ by ID with full details
  static async getRFQById(rfqId: string): Promise<RFQ | null> {
    try {
      const { data: rfq, error } = await supabase
        .from('rfqs')
        .select(`
          *,
          septra_orders (*),
          rfq_lines (
            *,
            skus (*),
            awarded_bids (
              *,
              bids (*)
            )
          )
        `)
        .eq('id', rfqId)
        .single();

      if (error) throw error;

      return this.rfqTransformer.toFrontendWithRelations(rfq as DatabaseRFQWithRelations);
    } catch (error) {
      console.error('Error fetching RFQ by ID:', error);
      return null;
    }
  }
}