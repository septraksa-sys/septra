import { supabase } from '@/lib/supabase-client';
import { SupplierOrder, SupplierOrderLine } from '@/types';

export class SupplierService {
  // Get supplier orders (now linked to RFQ)
  static async getSupplierOrders(supplierId: string): Promise<SupplierOrder[]> {
    try {
      const { data, error } = await supabase
        .from('supplier_orders')
        .select(`
          *,
          supplier_order_lines (*)
        `)
        .eq('supplier_id', supplierId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      return data.map(order => ({
        id: order.id,
        rfqId: order.rfq_id,
        supplierId: order.supplier_id,
        lines: order.supplier_order_lines.map((line: any) => ({
          id: line.id,
          supplierOrderId: line.supplier_order_id,
          skuId: line.sku_id,
          quantity: line.quantity,
          unitPrice: line.unit_price,
          totalPrice: line.total_price,
          pharmacyBreakdown: line.pharmacy_breakdown
        })),
        totalValue: order.total_value,
        status: order.status as 'assigned' | 'in_fulfillment' | 'shipped' | 'delivered' | 'invoiced',
        assignedAt: new Date(order.assigned_at),
        expectedDelivery: order.expected_delivery ? new Date(order.expected_delivery) : undefined,
        shippingInfo: order.shipping_info || undefined
      }));
    } catch (error) {
      console.error('Error fetching supplier orders:', error);
      return [];
    }
  }

  // Update supplier order status
  static async updateOrderStatus(
    orderId: string,
    status: 'assigned' | 'in_fulfillment' | 'shipped' | 'delivered' | 'invoiced',
    additionalData?: {
      expectedDelivery?: Date;
      shippingInfo?: string;
    }
  ): Promise<boolean> {
    try {
      const updateData: any = { status };
      
      if (additionalData?.expectedDelivery) {
        updateData.expected_delivery = additionalData.expectedDelivery.toISOString();
      }
      
      if (additionalData?.shippingInfo) {
        updateData.shipping_info = additionalData.shippingInfo;
      }

      const { error } = await supabase
        .from('supplier_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating supplier order status:', error);
      return false;
    }
  }
}