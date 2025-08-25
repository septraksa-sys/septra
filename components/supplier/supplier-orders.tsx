'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { User, SupplierOrder, SKU, SeptraOrder } from '@/types';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck, Package, Calendar, MapPin } from 'lucide-react';

interface SupplierOrdersProps {
  user: User;
}

export function SupplierOrders({ user }: SupplierOrdersProps) {
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([]);
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [septraOrders, setSeptraOrders] = useState<SeptraOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);
  const [shippingForm, setShippingForm] = useState({
    trackingNumber: '',
    shippingInfo: '',
    expectedDelivery: ''
  });

  useEffect(() => {
    console.log('📦 SupplierOrders component mounted for user:', user.profileId);
    loadData();
    loadData();
  }, [user.profileId]);

  const loadData = () => {
    const allSupplierOrders = storage.getSupplierOrders();
    const myOrders = allSupplierOrders.filter(o => o.supplierId === user.profileId);
    setSupplierOrders(myOrders);
    setSKUs(storage.getSKUs());
    setSeptraOrders(storage.getSeptraOrders());
    
    console.log('📊 Supplier Orders Data Loaded:');
    console.log('- All supplier orders:', allSupplierOrders.length);
    console.log('- My orders:', myOrders.length);
    console.log('- My orders details:', myOrders);
    
    // Show notification if there are new assigned orders
    const assignedOrders = myOrders.filter(o => o.status === 'assigned');
    if (assignedOrders.length > 0) {
      console.log('🔔 Found', assignedOrders.length, 'new orders assigned for fulfillment');
    }
  };

  const getSKUName = (skuId: string) => {
    const sku = skus.find(s => s.id === skuId);
    return sku ? `${sku.name} (${sku.code})` : skuId;
  };

  const getSeptraOrderTitle = (septraOrderId: string) => {
    const order = septraOrders.find(o => o.id === septraOrderId);
    return order?.title || `Order ${septraOrderId.slice(-8)}`;
  };

  const getStatusColor = (status: SupplierOrder['status']) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'in_fulfillment':
        return 'bg-orange-100 text-orange-800';
      case 'invoiced':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const updateOrderStatus = (orderId: string, newStatus: SupplierOrder['status'], additionalData?: any) => {
    const allOrders = storage.getSupplierOrders();
    const updatedOrders = allOrders.map(o => 
      o.id === orderId 
        ? { ...o, status: newStatus, ...additionalData }
        : o
    );
    storage.setSupplierOrders(updatedOrders);
    
    // Also update logistics entries
    const logistics = storage.getLogisticsEntries();
    const updatedLogistics = logistics.map(l => {
      if (l.septraOrderId === selectedOrder?.septraOrderId && l.supplierId === user.profileId) {
        const logisticsStatus = newStatus === 'shipped' ? 'picked_up' : 
                              newStatus === 'delivered' ? 'delivered' : l.status;
        return {
          ...l,
          status: logisticsStatus as any,
          trackingNumber: additionalData?.shippingInfo ? shippingForm.trackingNumber : l.trackingNumber,
          shipmentDate: newStatus === 'shipped' ? new Date() : l.shipmentDate,
          estimatedDelivery: additionalData?.expectedDelivery ? new Date(additionalData.expectedDelivery) : l.estimatedDelivery,
          actualDelivery: newStatus === 'delivered' ? new Date() : l.actualDelivery,
          notes: additionalData?.shippingInfo || l.notes
        };
      }
      return l;
    });
    storage.setLogisticsEntries(updatedLogistics);
    
    loadData();
    setSelectedOrder(null);
    setShippingForm({ trackingNumber: '', shippingInfo: '', expectedDelivery: '' });
  };

  const handleStartFulfillment = (orderId: string) => {
    updateOrderStatus(orderId, 'in_fulfillment');
    toast.info('Septra has been notified that fulfillment has started');
    toast.success('Order fulfillment started');
  };

  const handleMarkAsShipped = () => {
    if (!selectedOrder || !shippingForm.trackingNumber) {
      toast.error('Please provide tracking information');
      return;
    }

    updateOrderStatus(selectedOrder.id, 'shipped', {
      shippingInfo: shippingForm.shippingInfo,
      expectedDelivery: shippingForm.expectedDelivery
    });
    toast.info('Courier has been notified for pickup');
    toast.success('Order marked as shipped');
  };

  const handleMarkAsDelivered = (orderId: string) => {
    updateOrderStatus(orderId, 'delivered');
    toast.success('Order marked as delivered');
  };

  const handleMarkAsInvoiced = (orderId: string) => {
    updateOrderStatus(orderId, 'invoiced');
    toast.info('Septra has been notified to release escrow payment');
    toast.success('Order marked as invoiced');
  };

  const canAdvanceStatus = (status: SupplierOrder['status']) => {
    return status !== 'invoiced';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
        <p className="text-gray-600 mt-1">
          Manage your awarded orders and fulfillment status
        </p>
      </div>

      {supplierOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders assigned</h3>
              <p className="text-gray-600">
                Orders will appear here when your bids are awarded
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {supplierOrders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {getSeptraOrderTitle(order.septraOrderId)}
                    </CardTitle>
                    <CardDescription>
                      Assigned: {new Date(order.assignedAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                    <div>
                      <p className="text-lg font-semibold">
                        ${order.totalValue.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">Total Value</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Order Lines */}
                <div>
                  <h4 className="font-medium mb-3">Order Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Pharmacies</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <div className="font-medium">{getSKUName(line.skuId)}</div>
                          </TableCell>
                          <TableCell>{line.quantity}</TableCell>
                          <TableCell>${line.unitPrice.toFixed(2)}</TableCell>
                          <TableCell>${line.totalPrice.toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {line.pharmacyBreakdown.map((breakdown, idx) => (
                                <div key={idx} className="text-sm">
                                  Qty: {breakdown.quantity}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Expected Delivery */}
                {order.expectedDelivery && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Expected Delivery: {new Date(order.expectedDelivery).toLocaleDateString()}</span>
                  </div>
                )}

                {/* Shipping Info */}
                {order.shippingInfo && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900">Shipping Information</span>
                    </div>
                    <p className="text-sm text-blue-700">{order.shippingInfo}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  {order.status === 'assigned' && (
                    <Button onClick={() => handleStartFulfillment(order.id)}>
                      Start Fulfillment
                    </Button>
                  )}
                  
                  {order.status === 'in_fulfillment' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button onClick={() => setSelectedOrder(order)}>
                          <Truck className="h-4 w-4 mr-2" />
                          Mark as Shipped
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Shipping Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Tracking Number *</Label>
                            <Input
                              value={shippingForm.trackingNumber}
                              onChange={(e) => setShippingForm(prev => ({ 
                                ...prev, 
                                trackingNumber: e.target.value 
                              }))}
                              placeholder="Enter tracking number"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Expected Delivery</Label>
                            <Input
                              type="date"
                              value={shippingForm.expectedDelivery}
                              onChange={(e) => setShippingForm(prev => ({ 
                                ...prev, 
                                expectedDelivery: e.target.value 
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Shipping Notes</Label>
                            <Input
                              value={shippingForm.shippingInfo}
                              onChange={(e) => setShippingForm(prev => ({ 
                                ...prev, 
                                shippingInfo: e.target.value 
                              }))}
                              placeholder="Additional shipping information"
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                              Cancel
                            </Button>
                            <Button onClick={handleMarkAsShipped}>
                              Mark as Shipped
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  
                  {order.status === 'shipped' && (
                    <Button onClick={() => handleMarkAsDelivered(order.id)}>
                      Mark as Delivered
                    </Button>
                  )}
                  
                  {order.status === 'delivered' && (
                    <Button onClick={() => handleMarkAsInvoiced(order.id)}>
                      Mark as Invoiced
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}