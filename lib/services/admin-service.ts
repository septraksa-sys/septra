import { supabase } from '@/lib/supabase-client';
import { SeptraOrder, PharmacyDemand, RFQ, Bid, AwardedBid } from '@/types';

export class AdminService {
  // Create Septra Order from pharmacy demands
  static async createSeptraOrderFromDemands(
    demandIds: string[],
    orderData: {
      title: string;
      description?: string;
    }
  ): Promise<SeptraOrder | null> {
    try {
      // Create septra order
      const { data, error } = await supabase
        .from('septra_orders')
        .insert({
          title: orderData.title,
          description: orderData.description,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      // Mark demands as processed (you might want to add a processed_in_order_id field)
      // For now, we'll leave them as submitted for tracking

      return {
        id: data.id,
        title: data.title,
        description: data.description || undefined,
        status: data.status as any,
        totalValue: data.total_value || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error creating septra order:', error);
      return null;
    }
  }

  // Get all bids for admin review
  static async getAllBids(): Promise<Bid[]> {
    try {
      const { data, error } = await supabase
        .from('bids')
        .select('*')
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
      console.error('Error fetching all bids:', error);
      return [];
    }
  }

  // Get awarded bids
  static async getAwardedBids(): Promise<AwardedBid[]> {
    try {
      const { data, error } = await supabase
        .from('awarded_bids')
        .select(`
          *,
          bids (*)
        `)
        .order('awarded_at', { ascending: false });

      if (error) throw error;

      return data.map(award => ({
        id: award.id,
        bidId: award.bid_id,
        rfqLineId: award.rfq_line_id,
        awardedPrice: award.awarded_price,
        awardedQuantity: award.awarded_quantity,
        awardedAt: new Date(award.awarded_at),
        bid: award.bids ? {
          id: award.bids.id,
          rfqId: award.bids.rfq_id,
          supplierId: award.bids.supplier_id,
          skuId: award.bids.sku_id,
          unitPrice: award.bids.unit_price,
          quantity: award.bids.quantity,
          minQuantity: award.bids.min_quantity || undefined,
          leadTimeDays: award.bids.lead_time_days,
          notes: award.bids.notes || undefined,
          status: award.bids.status as 'submitted' | 'awarded' | 'rejected',
          submittedAt: new Date(award.bids.submitted_at)
        } : undefined
      }));
    } catch (error) {
      console.error('Error fetching awarded bids:', error);
      return [];
    }
  }

  // Get submitted pharmacy demands for aggregation
  static async getSubmittedDemands(): Promise<PharmacyDemand[]> {
    try {
      const { data, error } = await supabase
        .from('pharmacy_demands')
        .select('*')
        .eq('status', 'submitted')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(demand => ({
        id: demand.id,
        pharmacyId: demand.pharmacy_id,
        skuId: demand.sku_id,
        quantity: demand.quantity,
        maxUnitPrice: demand.max_unit_price || undefined,
        notes: demand.notes || undefined,
        status: demand.status as 'draft' | 'submitted',
        createdAt: new Date(demand.created_at),
        updatedAt: new Date(demand.updated_at)
      }));
    } catch (error) {
      console.error('Error fetching submitted demands:', error);
      return [];
    }
  }

  // Get septra orders
  static async getSeptraOrders(): Promise<SeptraOrder[]> {
    try {
      const { data, error } = await supabase
        .from('septra_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(order => ({
        id: order.id,
        title: order.title,
        description: order.description || undefined,
        status: order.status as any,
        totalValue: order.total_value || undefined,
        createdAt: new Date(order.created_at),
        updatedAt: new Date(order.updated_at)
      }));
    } catch (error) {
      console.error('Error fetching septra orders:', error);
      return [];
    }
  }

  // Update septra order status
  static async updateSeptraOrderStatus(
    orderId: string,
    status: 'draft' | 'rfq_created' | 'bidding_complete' | 'orders_placed' | 'in_delivery' | 'completed' | 'cancelled'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('septra_orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating septra order status:', error);
      return false;
    }
  }
}