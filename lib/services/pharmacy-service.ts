import { supabase } from '@/lib/supabase-client';
import { PharmacyOrder, PharmacyOrderLine, PharmacyDemand } from '@/types';

export class PharmacyService {
  // Get pharmacy orders (now linked to RFQ)
  static async getPharmacyOrders(pharmacyId: string): Promise<PharmacyOrder[]> {
    try {
      const { data, error } = await supabase
        .from('pharmacy_orders')
        .select(`
          *,
          pharmacy_order_lines (*)
        `)
        .eq('pharmacy_id', pharmacyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(order => ({
        id: order.id,
        rfqId: order.rfq_id,
        pharmacyId: order.pharmacy_id,
        lines: order.pharmacy_order_lines.map((line: any) => ({
          id: line.id,
          pharmacyOrderId: line.pharmacy_order_id,
          skuId: line.sku_id,
          quantity: line.quantity,
          unitPrice: line.unit_price,
          totalPrice: line.total_price,
          status: line.status as 'pending' | 'confirmed' | 'declined'
        })),
        totalValue: order.total_value,
        status: order.status as 'pending' | 'confirmed' | 'declined',
        paymentTerms: order.payment_terms as 30 | 60 | 90 | undefined,
        deliveryAddress: order.delivery_address || undefined,
        confirmedAt: order.confirmed_at ? new Date(order.confirmed_at) : undefined,
        declinedAt: order.declined_at ? new Date(order.declined_at) : undefined,
        createdAt: new Date(order.created_at)
      }));
    } catch (error) {
      console.error('Error fetching pharmacy orders:', error);
      return [];
    }
  }

  // Confirm pharmacy order
  static async confirmPharmacyOrder(
    orderId: string,
    paymentTerms: 30 | 60 | 90,
    deliveryAddress: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pharmacy_orders')
        .update({
          status: 'confirmed',
          payment_terms: paymentTerms,
          delivery_address: deliveryAddress,
          confirmed_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Update all order lines to confirmed
      await supabase
        .from('pharmacy_order_lines')
        .update({ status: 'confirmed' })
        .eq('pharmacy_order_id', orderId);

      return true;
    } catch (error) {
      console.error('Error confirming pharmacy order:', error);
      return false;
    }
  }

  // Decline pharmacy order
  static async declinePharmacyOrder(orderId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pharmacy_orders')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Update all order lines to declined
      await supabase
        .from('pharmacy_order_lines')
        .update({ status: 'declined' })
        .eq('pharmacy_order_id', orderId);

      return true;
    } catch (error) {
      console.error('Error declining pharmacy order:', error);
      return false;
    }
  }

  // Submit pharmacy demand
  static async submitPharmacyDemand(demandData: {
    pharmacyId: string;
    skuId: string;
    quantity: number;
    maxUnitPrice?: number;
    notes?: string;
  }): Promise<PharmacyDemand | null> {
    try {
      const { data, error } = await supabase
        .from('pharmacy_demands')
        .insert({
          pharmacy_id: demandData.pharmacyId,
          sku_id: demandData.skuId,
          quantity: demandData.quantity,
          max_unit_price: demandData.maxUnitPrice,
          notes: demandData.notes,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        pharmacyId: data.pharmacy_id,
        skuId: data.sku_id,
        quantity: data.quantity,
        maxUnitPrice: data.max_unit_price || undefined,
        notes: data.notes || undefined,
        status: data.status as 'draft' | 'submitted',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error submitting pharmacy demand:', error);
      return null;
    }
  }

  // Update pharmacy demand status
  static async updateDemandStatus(demandId: string, status: 'draft' | 'submitted'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pharmacy_demands')
        .update({ status })
        .eq('id', demandId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating demand status:', error);
      return false;
    }
  }

  // Get pharmacy demands
  static async getPharmacyDemands(pharmacyId: string): Promise<PharmacyDemand[]> {
    try {
      const { data, error } = await supabase
        .from('pharmacy_demands')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
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
      console.error('Error fetching pharmacy demands:', error);
      return [];
    }
  }
}