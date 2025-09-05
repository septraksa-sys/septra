'use client';

import { useState, useEffect } from 'react';
import { User, SeptraOrder, PharmacyOrder, SupplierOrder, SKU, Pharmacy, Supplier, RFQ } from '@/types';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingCart, Package, Users, ArrowRight, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface AdminOrdersProps {
  user: User;
}

export function AdminOrders({ user }: AdminOrdersProps) {
  const [septraOrders, setSeptraOrders] = useState<SeptraOrder[]>([]);
  const [pharmacyOrders, setPharmacyOrders] = useState<PharmacyOrder[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([]);
  const [rfqs, setRFQs] = useState<RFQ[]>([]);
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SeptraOrder | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setSeptraOrders(storage.getSeptraOrders());
    setPharmacyOrders(storage.getPharmacyOrders());
    setSupplierOrders(storage.getSupplierOrders());
    setRFQs(storage.getRFQs());
    setSKUs(storage.getSKUs());
    setPharmacies(storage.getPharmacies());
    setSuppliers(storage.getSuppliers());
  };

  const getSKUName = (skuId: string) => {
    const sku = skus.find(s => s.id === skuId);
    return sku ? `${sku.name} (${sku.code})` : skuId;
  };

  const getPharmacyName = (pharmacyId: string) => {
    const pharmacy = pharmacies.find(p => p.id === pharmacyId);
    return pharmacy?.name || pharmacyId;
  };

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || supplierId;
  };

  const getOrderStatusColor = (status: SeptraOrder['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_delivery':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-purple-100 text-purple-800';
      case 'awaiting_confirmations':
        return 'bg-orange-100 text-orange-800';
      case 'awarded':
        return 'bg-yellow-100 text-yellow-800';
      case 'bidding_closed':
        return 'bg-red-100 text-red-800';
      case 'rfq_open':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrderProgress = (status: SeptraOrder['status']) => {
    const statusOrder = [
      'draft', 'rfq_open', 'bidding_closed', 'awarded', 
      'awaiting_confirmations', 'scheduled', 'in_delivery', 'completed'
    ];
    const currentIndex = statusOrder.indexOf(status);
    return currentIndex >= 0 ? (currentIndex / (statusOrder.length - 1)) * 100 : 0;
  };

  const generatePharmacyOrders = (septraOrderId: string) => {
    const septraOrder = septraOrders.find(o => o.id === septraOrderId);
    if (!septraOrder) return;

    // Get all unique pharmacy IDs from the order
    const pharmacyIds = new Set(
      septraOrder.lines.flatMap(line => line.demandBreakdown.map(d => d.pharmacyId))
    );

    const newPharmacyOrders: PharmacyOrder[] = Array.from(pharmacyIds).map(pharmacyId => {
      // Find all lines for this pharmacy
      const pharmacyLines = septraOrder.lines
        .filter(line => line.demandBreakdown.some(d => d.pharmacyId === pharmacyId))
        .map(line => {
          const breakdown = line.demandBreakdown.find(d => d.pharmacyId === pharmacyId);
          return {
            id: `pharmacy_line_${Date.now()}_${Math.random()}`,
            skuId: line.skuId,
            quantity: breakdown?.quantity || 0,
            unitPrice: line.awardedPrice || 0,
            totalPrice: (breakdown?.quantity || 0) * (line.awardedPrice || 0),
            status: 'pending' as const
          };
        });

      const totalValue = pharmacyLines.reduce((sum, line) => sum + line.totalPrice, 0);

      return {
        id: `pharmacy_order_${Date.now()}_${pharmacyId}`,
        septraOrderId: septraOrder.id,
        pharmacyId,
        lines: pharmacyLines,
        totalValue,
        status: 'pending' as const
      };
    });

    // Save pharmacy orders
    const existingOrders = storage.getPharmacyOrders();
    storage.setPharmacyOrders([...existingOrders, ...newPharmacyOrders]);

    // Update Septra Order status
    const updatedOrders = septraOrders.map(o => 
      o.id === septraOrderId 
        ? { ...o, status: 'awaiting_confirmations' as const, updatedAt: new Date() }
        : o
    );
    storage.setSeptraOrders(updatedOrders);

    loadData();
    toast.success('Pharmacy orders generated successfully');
  };

  const advanceOrderStatus = (orderId: string, newStatus: SeptraOrder['status']) => {
    const updatedOrders = septraOrders.map(o => 
      o.id === orderId 
        ? { ...o, status: newStatus, updatedAt: new Date() }
        : o
    );
    storage.setSeptraOrders(updatedOrders);
    loadData();
    toast.success(`Order status updated to ${newStatus.replace('_', ' ')}`);
  };

  const getOrdersByStatus = (status: SeptraOrder['status']) => {
    return septraOrders.filter(o => o.status === status);
  };

  const getPharmacyOrdersForSeptraOrder = (septraOrderId: string): PharmacyOrder[] => {
    // Find RFQs associated with this Septra Order
    const associatedRFQs = rfqs.filter(rfq => rfq.septraOrderId === septraOrderId);
    const rfqIds = associatedRFQs.map(rfq => rfq.id);
    
    // Find pharmacy orders for these RFQs
    return pharmacyOrders.filter(po => rfqIds.includes(po.rfqId));
  };

  const getSupplierOrdersForSeptraOrder = (septraOrderId: string): SupplierOrder[] => {
    // Find RFQs associated with this Septra Order
    const associatedRFQs = rfqs.filter(rfq => rfq.septraOrderId === septraOrderId);
    const rfqIds = associatedRFQs.map(rfq => rfq.id);
    
    // Find supplier orders for these RFQs
    return supplierOrders.filter(so => rfqIds.includes(so.rfqId));
  };

  const getRFQsForSeptraOrder = (septraOrderId: string): RFQ[] => {
    return rfqs.filter(rfq => rfq.septraOrderId === septraOrderId);
  };

  const canGeneratePharmacyOrders = (order: SeptraOrder) => {
    return false; // Pharmacy orders are now auto-generated after bid awards
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
        <p className="text-gray-600 mt-1">
          Track and manage the complete order lifecycle
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{septraOrders.length}</div>
            <p className="text-sm text-gray-600">
              all Septra orders
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {septraOrders.filter(o => !['completed', 'cancelled'].includes(o.status)).length}
            </div>
            <p className="text-sm text-gray-600">
              active orders
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getOrdersByStatus('completed').length}
            </div>
            <p className="text-sm text-gray-600">
              delivered orders
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${septraOrders.reduce((sum, o) => sum + (o.totalValue || 0), 0).toLocaleString()}
            </div>
            <p className="text-sm text-gray-600">
              order value
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lifecycle" className="space-y-6">
        <TabsList>
          <TabsTrigger value="lifecycle">Lifecycle View</TabsTrigger>
          <TabsTrigger value="details">Order Details</TabsTrigger>
          <TabsTrigger value="pharmacy">Pharmacy Orders</TabsTrigger>
          <TabsTrigger value="supplier">Supplier Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="lifecycle">
          <div className="grid gap-6">
            {septraOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders created</h3>
                    <p className="text-gray-600">
                      Create your first Septra Order from submitted demands
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              septraOrders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{order.title}</CardTitle>
                        <CardDescription>
                          {order.lines.length} SKU lines • Created {new Date(order.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="text-right space-y-2">
                        <Badge className={getOrderStatusColor(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                        <div>
                          <p className="text-lg font-semibold">
                            ${(order.totalValue || 0).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">Total Value</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Order Progress</span>
                        <span>{Math.round(getOrderProgress(order.status))}%</span>
                      </div>
                      <Progress value={getOrderProgress(order.status)} className="h-2" />
                    </div>

                    {/* Order Lines Summary */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">
                        Order Lines ({getRFQsForSeptraOrder(order.id).length} RFQs)
                      </h4>
                      <div className="space-y-2">
                        {order.lines.map((line) => (
                          <div key={line.id} className="flex items-center justify-between text-sm">
                            <span>{getSKUName(line.skuId)}</span>
                            <div className="text-right">
                              <span className="font-medium">{line.totalQuantity} units</span>
                              {line.awardedSupplierId && (
                                <div className="text-xs text-gray-500">
                                  ${line.awardedPrice?.toFixed(2)}/unit • {getSupplierName(line.awardedSupplierId)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Show RFQ information */}
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-500">
                            Associated RFQs: {getRFQsForSeptraOrder(order.id).map(rfq => rfq.title).join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" onClick={() => setSelectedOrder(order)}>
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[800px]">
                          <DialogHeader>
                            <DialogTitle>{order.title}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>SKU</TableHead>
                                  <TableHead>Quantity</TableHead>
                                  <TableHead>Awarded Supplier</TableHead>
                                  <TableHead>Price</TableHead>
                                  <TableHead>Pharmacies</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {order.lines.map((line) => (
                                  <TableRow key={line.id}>
                                    <TableCell>{getSKUName(line.skuId)}</TableCell>
                                    <TableCell>{line.totalQuantity}</TableCell>
                                    <TableCell>
                                      {line.awardedSupplierId ? 
                                        getSupplierName(line.awardedSupplierId) : 
                                        'Not awarded'
                                      }
                                    </TableCell>
                                    <TableCell>
                                      {line.awardedPrice ? 
                                        `$${line.awardedPrice.toFixed(2)}` : 
                                        '-'
                                      }
                                    </TableCell>
                                    <TableCell>
                                      <div className="space-y-1">
                                        {line.demandBreakdown.map((breakdown, idx) => (
                                          <div key={idx} className="text-sm">
                                            {getPharmacyName(breakdown.pharmacyId)}: {breakdown.quantity}
                                          </div>
                                        ))}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {canGeneratePharmacyOrders(order) && (
                        <Button onClick={() => generatePharmacyOrders(order.id)}>
                          Generate Pharmacy Orders
                        </Button>
                      )}
                      
                      {order.status === 'scheduled' && (
                        <Button onClick={() => advanceOrderStatus(order.id, 'scheduled')}>
                          Start Pickup Coordination
                        </Button>
                      )}
                      
                      {order.status === 'awaiting_confirmations' && (
                        <Badge variant="outline" className="text-orange-600">
                          Awaiting Pharmacy Confirmations
                        </Badge>
                      )}
                      
                      {order.status === 'in_delivery' && (
                        <Button onClick={() => advanceOrderStatus(order.id, 'completed')}>
                          Mark as Completed
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
              <CardDescription>
                Detailed view of all Septra Orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lines</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {septraOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-medium">{order.title}</div>
                        <div className="text-sm text-gray-500">{order.description}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getOrderStatusColor(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.lines.length} SKUs</TableCell>
                      <TableCell>${(order.totalValue || 0).toLocaleString()}</TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="w-20">
                          <Progress value={getOrderProgress(order.status)} className="h-2" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pharmacy">
          <Card>
            <CardHeader>
              <CardTitle>Pharmacy Orders</CardTitle>
              <CardDescription>
                Individual pharmacy orders generated from Septra Orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pharmacyOrders.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p>No pharmacy orders generated yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pharmacy</TableHead>
                      <TableHead>Septra Order</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Confirmed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pharmacyOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="font-medium">
                            {getPharmacyName(order.pharmacyId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {septraOrders.find(so => so.id === order.septraOrderId)?.title}
                        </TableCell>
                        <TableCell>{order.lines.length} items</TableCell>
                        <TableCell>${order.totalValue.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            order.status === 'confirmed' ? 'default' : 
                            order.status === 'declined' ? 'destructive' : 
                            'secondary'
                          }>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.confirmedAt && new Date(order.confirmedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supplier">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Orders</CardTitle>
              <CardDescription>
                Orders assigned to suppliers for fulfillment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {supplierOrders.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2" />
                  <p>No supplier orders assigned yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Septra Order</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="font-medium">
                            {getSupplierName(order.supplierId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {septraOrders.find(so => so.id === order.septraOrderId)?.title}
                        </TableCell>
                        <TableCell>{order.lines.length} items</TableCell>
                        <TableCell>${order.totalValue.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            order.status === 'delivered' ? 'default' : 
                            order.status === 'shipped' ? 'secondary' : 
                            'outline'
                          }>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(order.assignedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}