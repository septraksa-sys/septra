import { supabase } from '@/lib/supabase-client';
import { RFQ, RFQLine, Bid, AwardedBid, PharmacyDemand, SeptraOrder } from '@/types';

export class RFQService {
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
      const skuGroups: { [skuId: string]: PharmacyDemand[] } = {};
      demands?.forEach(demand => {
        if (!skuGroups[demand.sku_id]) {
          skuGroups[demand.sku_id] = [];
        }
        skuGroups[demand.sku_id].push({
          id: demand.id,
          pharmacyId: demand.pharmacy_id,
          skuId: demand.sku_id,
          quantity: demand.quantity,
          maxUnitPrice: demand.max_unit_price || undefined,
          notes: demand.notes || undefined,
          status: demand.status as 'draft' | 'submitted',
          createdAt: new Date(demand.created_at),
          updatedAt: new Date(demand.updated_at)
        });
      });

      // Create RFQ
      const { data: rfqData, error: rfqError } = await supabase
        .from('rfqs')
        .insert({
          septra_order_id: septraOrderId,
          title: rfqData.title,
          description: rfqData.description,
          published_at: new Date().toISOString(),
          bidding_deadline: rfqData.biddingDeadline.toISOString(),
          delivery_requirement: rfqData.deliveryRequirement?.toISOString(),
          terms: rfqData.terms,
          status: 'open'
        })
        .select()
        .single();

      if (rfqError) throw rfqError;

      // Create RFQ lines
      const rfqLines = Object.entries(skuGroups).map(([skuId, demands]) => ({
        rfq_id: rfqData.id,
        sku_id: skuId,
        total_quantity: demands.reduce((sum, d) => sum + d.quantity, 0),
        demand_breakdown: demands.map(d => ({
          pharmacyId: d.pharmacyId,
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

      const rfq: RFQ = {
        id: rfqData.id,
        septraOrderId: rfqData.septra_order_id,
        title: rfqData.title,
        description: rfqData.description || undefined,
        publishedAt: new Date(rfqData.published_at),
        biddingDeadline: new Date(rfqData.bidding_deadline),
        deliveryRequirement: rfqData.delivery_requirement ? new Date(rfqData.delivery_requirement) : undefined,
        terms: rfqData.terms || undefined,
        status: rfqData.status as 'open' | 'closed' | 'awarded',
        estimatedValue: rfqData.estimated_value || undefined,
        lines: [],
        createdAt: new Date(rfqData.created_at),
        updatedAt: new Date(rfqData.updated_at)
      };

      const lines: RFQLine[] = linesData.map(line => ({
        id: line.id,
        rfqId: line.rfq_id,
        skuId: line.sku_id,
        totalQuantity: line.total_quantity,
        demandBreakdown: line.demand_breakdown,
        createdAt: new Date(line.created_at)
      }));

      return { rfq, lines };
    } catch (error) {
      console.error('Error creating RFQ:', error);
      return null;
    }
  }

  // Get RFQs with their lines
  static async getRFQsWithLines(): Promise<RFQ[]> {
    try {
      const { data: rfqs, error: rfqsError } = await supabase
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
        .order('created_at', { ascending: false });

      if (rfqsError) throw rfqsError;

      return rfqs.map(rfq => ({
        id: rfq.id,
        septraOrderId: rfq.septra_order_id,
        title: rfq.title,
        description: rfq.description || undefined,
        publishedAt: new Date(rfq.published_at),
        biddingDeadline: new Date(rfq.bidding_deadline),
        deliveryRequirement: rfq.delivery_requirement ? new Date(rfq.delivery_requirement) : undefined,
        terms: rfq.terms || undefined,
        status: rfq.status as 'open' | 'closed' | 'awarded',
        estimatedValue: rfq.estimated_value || undefined,
        lines: rfq.rfq_lines.map((line: any) => ({
          id: line.id,
          rfqId: line.rfq_id,
          skuId: line.sku_id,
          totalQuantity: line.total_quantity,
          demandBreakdown: line.demand_breakdown,
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
              status: line.awarded_bids[0].bids.status as 'submitted' | 'awarded' | 'rejected',
              submittedAt: new Date(line.awarded_bids[0].bids.submitted_at)
            } : undefined
          } : undefined,
          createdAt: new Date(line.created_at)
        })),
        createdAt: new Date(rfq.created_at),
        updatedAt: new Date(rfq.updated_at)
      }));
    } catch (error) {
      console.error('Error fetching RFQs:', error);
      return [];
    }
  }

  // Award bid to RFQ line
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
      const { error: awardError } = await supabase
        .from('awarded_bids')
        .insert({
          bid_id: bidId,
          rfq_line_id: rfqLineId,
          awarded_price: bid.unit_price,
          awarded_quantity: bid.quantity
        });

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

  // Get open RFQs for suppliers
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
          rfq_lines (
            *,
            skus (category)
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

      return relevantRFQs.map(rfq => ({
        id: rfq.id,
        septraOrderId: rfq.septra_order_id,
        title: rfq.title,
        description: rfq.description || undefined,
        publishedAt: new Date(rfq.published_at),
        biddingDeadline: new Date(rfq.bidding_deadline),
        deliveryRequirement: rfq.delivery_requirement ? new Date(rfq.delivery_requirement) : undefined,
        terms: rfq.terms || undefined,
        status: rfq.status as 'open' | 'closed' | 'awarded',
        estimatedValue: rfq.estimated_value || undefined,
        lines: rfq.rfq_lines.map((line: any) => ({
          id: line.id,
          rfqId: line.rfq_id,
          skuId: line.sku_id,
          totalQuantity: line.total_quantity,
          demandBreakdown: line.demand_breakdown,
          createdAt: new Date(line.created_at)
        })),
        createdAt: new Date(rfq.created_at),
        updatedAt: new Date(rfq.updated_at)
      }));
    } catch (error) {
      console.error('Error fetching open RFQs for supplier:', error);
      return [];
    }
  }

  // Submit bid on RFQ
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
      const { data, error } = await supabase
        .from('bids')
        .insert({
          rfq_id: bidData.rfqId,
          supplier_id: bidData.supplierId,
          sku_id: bidData.skuId,
          unit_price: bidData.unitPrice,
          quantity: bidData.quantity,
          min_quantity: bidData.minQuantity,
          lead_time_days: bidData.leadTimeDays,
          notes: bidData.notes,
          status: 'submitted'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        rfqId: data.rfq_id,
        supplierId: data.supplier_id,
        skuId: data.sku_id,
        unitPrice: data.unit_price,
        quantity: data.quantity,
        minQuantity: data.min_quantity || undefined,
        leadTimeDays: data.lead_time_days,
        notes: data.notes || undefined,
        status: data.status as 'submitted' | 'awarded' | 'rejected',
        submittedAt: new Date(data.submitted_at)
      };
    } catch (error) {
      console.error('Error submitting bid:', error);
      return null;
    }
  }

  // Get bids for supplier
  static async getBidsForSupplier(supplierId: string): Promise<Bid[]> {
    try {
      const { data, error } = await supabase
        .from('bids')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      return data.map(bid => ({
        id: bid.id,
        rfqId: bid.rfq_id,
        supplierId: bid.supplier_id,
        skuId: bid.sku_id,
        unitPrice: bid.unit_price,
        quantity: bid.quantity,
        minQuantity: bid.min_quantity || undefined,
        leadTimeDays: bid.lead_time_days,
        notes: bid.notes || undefined,
        status: bid.status as 'submitted' | 'awarded' | 'rejected',
        submittedAt: new Date(bid.submitted_at)
      }));
    } catch (error) {
      console.error('Error fetching supplier bids:', error);
      return [];
    }
  }
}