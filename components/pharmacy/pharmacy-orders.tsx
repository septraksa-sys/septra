'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { User, PharmacyOrder, SeptraOrder, SKU, Pharmacy, Escrow, RFQ } from '@/types';
import { storage } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingCart, Check, X, Clock, CheckCircle } from 'lucide-react';

interface PharmacyOrdersProps {
  user: User;
}

export function PharmacyOrders({ user }: PharmacyOrdersProps) {
  const [pharmacyOrders, setPharmacyOrders] = useState<PharmacyOrder[]>([]);
  const [septraOrders, setSeptraOrders] = useState<SeptraOrder[]>([]);
  const [rfqs, setRFQs] = useState<RFQ[]>([]);
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PharmacyOrder | null>(null);
  const [confirmationData, setConfirmationData] = useState({
    paymentTerms: '' as '30' | '60' | '90' | '',
    deliveryAddress: ''
  });

  useEffect(() => {
    console.log('🏥 PharmacyOrders component mounted for user:', user.profileId);
    loadData();
    loadData();
  }, [user.profileId]);

  const loadData = () => {
    console.log('--- Loading Pharmacy Orders for user:', user.profileId, '---');
    const allPharmacyOrders = storage.getPharmacyOrders();
    console.log('All pharmacy orders from storage:', allPharmacyOrders);
    const myOrders = allPharmacyOrders.filter(o => o.pharmacyId === user.profileId);
    setPharmacyOrders(myOrders);
    setSeptraOrders(storage.getSeptraOrders());
    setRFQs(storage.getRFQs());
    setSKUs(storage.getSKUs());
    
    console.log('📊 Pharmacy Orders Data Loaded:');
    console.log('- All pharmacy orders:', allPharmacyOrders.length);
    console.log('- My orders:', myOrders.length);
    console.log('- My orders details:', myOrders);
    
    // Show notification if there are new pending orders
    const pendingOrders = myOrders.filter(o => o.status === 'pending');
    if (pendingOrders.length > 0) {
      console.log('🔔 Found', pendingOrders.length, 'pending orders for confirmation');
    }
    console.log('Filtered pharmacy orders for current user:', myOrders);
    console.log('--- Finished loading Pharmacy Orders ---');
  };

  const getSKUName = (skuId: string) => {
    const sku = skus.find(s => s.id === skuId);
    return sku ? `${sku.name} (${sku.code})` : skuId;
  };

  const getRFQ = (rfqId: string): RFQ | undefined => {
    return rfqs.find(r => r.id === rfqId);
  };

  const getSeptraOrderFromRFQ = (rfqId: string): SeptraOrder | undefined => {
    const rfq = getRFQ(rfqId);
    if (!rfq) return undefined;
    return septraOrders.find(o => o.id === rfq.septraOrderId);
  };

  const handleConfirmOrder = () => {
    if (!selectedOrder || !confirmationData.paymentTerms || !confirmationData.deliveryAddress) {
      toast.error('Please fill in all required fields');
      return;
    }

    const allOrders = storage.getPharmacyOrders();
    const updatedOrders = allOrders.map(o => 
      o.id === selectedOrder.id 
        ? {
            ...o,
            status: 'confirmed' as const,
            paymentTerms: parseInt(confirmationData.paymentTerms) as 30 | 60 | 90,
            deliveryAddress: confirmationData.deliveryAddress,
            confirmedAt: new Date(),
            lines: o.lines.map(line => ({ ...line, status: 'confirmed' as const }))
          }
        : o
    );

    storage.setPharmacyOrders(updatedOrders);

    // Create escrow entry for this pharmacy order
    createEscrowEntry(selectedOrder);

    // Send confirmation notifications
    toast.success('Order confirmed and payment processed to escrow');
    toast.info('Septra has been notified of your confirmation');

    // Check if all pharmacy orders for this Septra order are confirmed
    checkAndUpdateSeptraOrderStatus(selectedOrder.rfqId);

    loadData();
    setSelectedOrder(null);
    setConfirmationData({ paymentTerms: '', deliveryAddress: '' });
    toast.success('Order confirmed successfully');
  };

  const createEscrowEntry = (pharmacyOrder: PharmacyOrder) => {
    const existingEscrows = storage.getEscrows();
    
    // Check if escrow already exists
    const existingEscrow = existingEscrows.find(
      e => e.rfqId === pharmacyOrder.rfqId && e.pharmacyId === pharmacyOrder.pharmacyId
    );
    
    if (!existingEscrow) {
      const newEscrow: Escrow = {
        id: `escrow_${Date.now()}_${pharmacyOrder.pharmacyId}`,
        rfqId: pharmacyOrder.rfqId,
        pharmacyId: pharmacyOrder.pharmacyId,
        amount: pharmacyOrder.totalValue,
        status: 'funded', // Simulate automatic funding
        fundedAt: new Date()
      };
      
      storage.setEscrows([...existingEscrows, newEscrow]);
      toast.success('Payment processed to escrow wallet');
      console.log('💰 Escrow created:', newEscrow);
    }
  };

  const checkAndUpdateSeptraOrderStatus = (rfqId: string) => {
    // Get all pharmacy orders for this RFQ
    const allPharmacyOrders = storage.getPharmacyOrders();
    const ordersForRFQ = allPharmacyOrders.filter(po => po.rfqId === rfqId);
    
    // Check if all pharmacy orders are confirmed
    const allConfirmed = ordersForRFQ.every(po => po.status === 'confirmed');
    
    if (allConfirmed && ordersForRFQ.length > 0) {
      // Get the associated Septra Order and update its status
      const rfq = getRFQ(rfqId);
      if (!rfq) return;
      
      const allSeptraOrders = storage.getSeptraOrders();
      const updatedSeptraOrders = allSeptraOrders.map(so => 
        so.id === rfq.septraOrderId 
          ? { ...so, status: 'scheduled' as const, updatedAt: new Date() }
          : so
      );
      storage.setSeptraOrders(updatedSeptraOrders);
      
      // Notify admin that order is ready for pickup
      console.log('🚚 All pharmacies confirmed - Order ready for logistics');
      toast.info('Order forwarded to logistics for courier assignment');
      toast.success('All pharmacies confirmed - Order ready for pickup coordination');
    }
  };

  const handleDeclineOrder = (orderId: string) => {
    const allOrders = storage.getPharmacyOrders();
    const updatedOrders = allOrders.map(o => 
      o.id === orderId 
        ? {
            ...o,
            status: 'declined' as const,
            declinedAt: new Date(),
            lines: o.lines.map(line => ({ ...line, status: 'declined' as const }))
          }
        : o
    );

    storage.setPharmacyOrders(updatedOrders);
    loadData();
    toast.success('Order declined');
  };

  const getStatusIcon = (status: PharmacyOrder['status']) => {
    switch (status) {
      case 'confirmed':
        return <Check className="h-4 w-4" />;
      case 'declined':
        return <X className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: PharmacyOrder['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
        <p className="text-gray-600 mt-1">
          Review and confirm your participation in Septra Orders
        </p>
      </div>

      {pharmacyOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders available</h3>
              <p className="text-gray-600">
                Orders will appear here once your demands are included in aggregated Septra Orders
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pharmacyOrders.map((order) => {
            const rfq = getRFQ(order.rfqId);
            const septraOrder = getSeptraOrderFromRFQ(order.rfqId);
            return (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {rfq?.title || septraOrder?.title || `Order ${order.id.slice(-8)}`}
                      </CardTitle>
                      <CardDescription>
                        {rfq?.description || septraOrder?.description}
                        {rfq && (
                          <span className="text-xs text-gray-500 block mt-1">
                            RFQ: {rfq.title}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={`flex items-center space-x-1 ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="capitalize">{order.status}</span>
                      </Badge>
                      <div className="text-right">
                        <p className="text-lg font-semibold">
                          ${order.totalValue.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">Total Value</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {order.status === 'pending' && (
                    <div className="mt-6 flex justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => handleDeclineOrder(order.id)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button onClick={() => setSelectedOrder(order)}>
                            <Check className="h-4 w-4 mr-2" />
                            Confirm Order & Pay to Escrow
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirm Order & Payment</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                              <h4 className="font-medium text-blue-900 mb-2">Order Summary</h4>
                              <div className="text-sm text-blue-700 space-y-1">
                                <p><span className="font-medium">Total Amount:</span> ${selectedOrder?.totalValue.toFixed(2)}</p>
                                <p><span className="font-medium">Payment Method:</span> Escrow Wallet</p>
                                <p><span className="font-medium">Awarded Suppliers:</span> Best prices selected by Septra</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Payment Terms</Label>
                              <Select
                                value={confirmationData.paymentTerms}
                                onValueChange={(value) => 
                                  setConfirmationData(prev => ({ 
                                    ...prev, 
                                    paymentTerms: value as '30' | '60' | '90' 
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment terms" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="30">30 days</SelectItem>
                                  <SelectItem value="60">60 days</SelectItem>
                                  <SelectItem value="90">90 days</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Delivery Address</Label>
                              <Input
                                value={confirmationData.deliveryAddress}
                                onChange={(e) => 
                                  setConfirmationData(prev => ({ 
                                    ...prev, 
                                    deliveryAddress: e.target.value 
                                  }))
                                }
                                placeholder="Enter delivery address"
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                                Cancel
                              </Button>
                              <Button onClick={handleConfirmOrder} className="bg-green-600 hover:bg-green-700">
                                Confirm & Pay to Escrow
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}

                  {order.status === 'confirmed' && (
                    <div className="mt-6 p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-800">Order Confirmed & Payment Processed</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-green-800">Payment Terms:</span>
                          <span className="ml-2 text-green-600">{order.paymentTerms} days</span>
                        </div>
                        <div>
                          <span className="font-medium text-green-800">Payment Status:</span>
                          <span className="ml-2 text-green-600">Paid to Escrow</span>
                        </div>
                        <div>
                          <span className="font-medium text-green-800">Delivery Address:</span>
                          <span className="ml-2 text-green-600">{order.deliveryAddress}</span>
                        </div>
                        <div>
                          <span className="font-medium text-green-800">Confirmed:</span>
                          <span className="ml-2 text-green-600">
                            ${order.totalValue.toFixed(2)} <span className="text-sm text-gray-500">(Septra Price)</span>
                            {order.confirmedAt && ` - ${new Date(order.confirmedAt).toLocaleDateString()}`}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-white rounded border-l-4 border-green-500">
                        <p className="text-sm text-gray-700">
                          <strong>Next Steps:</strong> Septra has been notified of your confirmation. 
                          Your order is now scheduled for pickup coordination and delivery.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}