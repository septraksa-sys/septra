'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { User, LogisticsEntry, SupplierOrder, SeptraOrder, Pharmacy, Supplier } from '@/types';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Truck, Package, MapPin, Calendar, Plus } from 'lucide-react';

interface AdminLogisticsProps {
  user: User;
}

export function AdminLogistics({ user }: AdminLogisticsProps) {
  const [logistics, setLogistics] = useState<LogisticsEntry[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([]);
  const [septraOrders, setSeptraOrders] = useState<SeptraOrder[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);
  const [logisticsForm, setLogisticsForm] = useState({
    pharmacyId: '',
    trackingNumber: '',
    estimatedDelivery: '',
    notes: ''
  });

  useEffect(() => {
    console.log('🚚 AdminLogistics component mounted');
    loadData();
    loadData();
    initializeLogistics();
  }, []);

  const loadData = () => {
    setLogistics(storage.getLogisticsEntries());
    setSupplierOrders(storage.getSupplierOrders());
    setSeptraOrders(storage.getSeptraOrders());
    setPharmacies(storage.getPharmacies());
    setSuppliers(storage.getSuppliers());
  };

  const initializeLogistics = () => {
    console.log('🔄 Initializing logistics entries...');
    
    // Auto-create logistics entries for confirmed pharmacy orders
    const confirmedPharmacyOrders = storage.getPharmacyOrders().filter(po => po.status === 'confirmed');
    console.log('Found', confirmedPharmacyOrders.length, 'confirmed pharmacy orders');
    
    // Create logistics entries for supplier orders that don't have them yet
    const supplierOrders = storage.getSupplierOrders().filter(so => so.status !== 'assigned');
    const existingLogistics = storage.getLogisticsEntries();
    
    const newLogistics: LogisticsEntry[] = [];
    supplierOrders.forEach(order => {
      // Get unique pharmacy IDs from order lines
      const pharmacyIds = new Set(
        order.lines.flatMap(line => line.pharmacyBreakdown.map(b => b.pharmacyId))
      );
      
      pharmacyIds.forEach(pharmacyId => {
        const hasLogistics = existingLogistics.some(l => 
          l.septraOrderId === order.septraOrderId && 
          l.supplierId === order.supplierId &&
          l.pharmacyId === pharmacyId
        );
        
        if (!hasLogistics) {
          const newEntry: LogisticsEntry = {
            id: `logistics_${Date.now()}_${order.supplierId}_${pharmacyId}`,
            septraOrderId: order.septraOrderId,
            supplierId: order.supplierId,
            pharmacyId: pharmacyId,
            status: order.status === 'in_fulfillment' ? 'pending' : 
                    order.status === 'shipped' ? 'picked_up' : 
                    order.status === 'delivered' ? 'delivered' : 'pending',
            shipmentDate: order.status === 'shipped' ? new Date() : undefined,
            estimatedDelivery: order.expectedDelivery,
            actualDelivery: order.status === 'delivered' ? new Date() : undefined
          };
          newLogistics.push(newEntry);
        }
      });
    });
    
    if (newLogistics.length > 0) {
      storage.setLogisticsEntries([...existingLogistics, ...newLogistics]);
      console.log('✅ Created', newLogistics.length, 'new logistics entries');
      loadData();
    }
  };

  const getPharmacyName = (pharmacyId: string) => {
    const pharmacy = pharmacies.find(p => p.id === pharmacyId);
    return pharmacy?.name || pharmacyId;
  };

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || supplierId;
  };

  const getSeptraOrderTitle = (septraOrderId: string) => {
    const order = septraOrders.find(o => o.id === septraOrderId);
    return order?.title || `Order ${septraOrderId.slice(-8)}`;
  };

  const getStatusColor = (status: LogisticsEntry['status']) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800';
      case 'picked_up':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusProgress = (status: LogisticsEntry['status']) => {
    switch (status) {
      case 'pending':
        return 0;
      case 'picked_up':
        return 33;
      case 'in_transit':
        return 66;
      case 'delivered':
        return 100;
      default:
        return 0;
    }
  };

  const assignLogistics = () => {
    if (!selectedOrder || !logisticsForm.pharmacyId) {
      toast.error('Please select a pharmacy');
      return;
    }

    const newLogistics: LogisticsEntry = {
      id: `logistics_${Date.now()}`,
      septraOrderId: selectedOrder.septraOrderId,
      supplierId: selectedOrder.supplierId,
      pharmacyId: logisticsForm.pharmacyId,
      trackingNumber: logisticsForm.trackingNumber || undefined,
      status: 'pending',
      estimatedDelivery: logisticsForm.estimatedDelivery ? new Date(logisticsForm.estimatedDelivery) : undefined,
      notes: logisticsForm.notes || undefined
    };

    const allLogistics = storage.getLogisticsEntries();
    storage.setLogisticsEntries([...allLogistics, newLogistics]);
    
    loadData();
    setSelectedOrder(null);
    
    // Send notifications
    toast.success('Logistics entry assigned successfully');
    toast.info('Courier has been notified of pickup assignment');
    
    setLogisticsForm({
      pharmacyId: '',
      trackingNumber: '',
      estimatedDelivery: '',
      notes: ''
    });
    
  };

  const updateLogisticsStatus = (logisticsId: string, newStatus: LogisticsEntry['status']) => {
    const updatedLogistics = logistics.map(l => {
      if (l.id === logisticsId) {
        const updates: Partial<LogisticsEntry> = { status: newStatus };
        
        if (newStatus === 'picked_up' && !l.shipmentDate) {
          updates.shipmentDate = new Date();
        } else if (newStatus === 'delivered' && !l.actualDelivery) {
          updates.actualDelivery = new Date();
        }
        
        return { ...l, ...updates };
      }
      return l;
    });
    
    storage.setLogisticsEntries(updatedLogistics);
    loadData();
    
    // Send appropriate notifications based on status
    if (newStatus === 'picked_up') {
      toast.info('Pharmacy has been notified that shipment is in transit');
    } else if (newStatus === 'delivered') {
      toast.info('Escrow payment can now be released to supplier');
    }
    
    toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
  };

  const getUnassignedOrders = () => {
    return supplierOrders.filter(so => {
      const pharmacyIds = new Set(
        so.lines.flatMap(line => line.pharmacyBreakdown.map(b => b.pharmacyId))
      );
      
      return Array.from(pharmacyIds).some(pharmacyId => {
        return !logistics.some(l => 
          l.septraOrderId === so.septraOrderId && 
          l.supplierId === so.supplierId &&
          l.pharmacyId === pharmacyId
        );
      });
    });
  };

  const getAvailablePharmacies = (supplierOrder: SupplierOrder) => {
    const allPharmacyIds = new Set(
      supplierOrder.lines.flatMap(line => line.pharmacyBreakdown.map(b => b.pharmacyId))
    );
    
    const assignedPharmacyIds = new Set(
      logistics
        .filter(l => l.septraOrderId === supplierOrder.septraOrderId && l.supplierId === supplierOrder.supplierId)
        .map(l => l.pharmacyId)
        .filter(Boolean)
    );
    
    return Array.from(allPharmacyIds).filter(id => !assignedPharmacyIds.has(id));
  };

  const unassignedOrders = getUnassignedOrders();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Logistics Management</h2>
          <p className="text-gray-600 mt-1">
            Track and manage deliveries from suppliers to pharmacies
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button disabled={unassignedOrders.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Logistics
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Logistics Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Supplier Order</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedOrder?.id || ''}
                  onChange={(e) => {
                    const order = supplierOrders.find(so => so.id === e.target.value);
                    setSelectedOrder(order || null);
                    setLogisticsForm(prev => ({ ...prev, pharmacyId: '' }));
                  }}
                >
                  <option value="">Select supplier order</option>
                  {unassignedOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {getSupplierName(order.supplierId)} - {getSeptraOrderTitle(order.septraOrderId)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedOrder && (
                <div className="space-y-2">
                  <Label>Pharmacy</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={logisticsForm.pharmacyId}
                    onChange={(e) => setLogisticsForm(prev => ({ ...prev, pharmacyId: e.target.value }))}
                  >
                    <option value="">Select pharmacy</option>
                    {getAvailablePharmacies(selectedOrder).map((pharmacyId) => (
                      <option key={pharmacyId} value={pharmacyId}>
                        {getPharmacyName(pharmacyId)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tracking Number</Label>
                <Input
                  value={logisticsForm.trackingNumber}
                  onChange={(e) => setLogisticsForm(prev => ({ ...prev, trackingNumber: e.target.value }))}
                  placeholder="Enter tracking number"
                />
              </div>

              <div className="space-y-2">
                <Label>Estimated Delivery</Label>
                <Input
                  type="date"
                  value={logisticsForm.estimatedDelivery}
                  onChange={(e) => setLogisticsForm(prev => ({ ...prev, estimatedDelivery: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={logisticsForm.notes}
                  onChange={(e) => setLogisticsForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional logistics notes"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                  Cancel
                </Button>
                <Button onClick={assignLogistics}>
                  Assign
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Total Shipments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logistics.length}</div>
            <p className="text-sm text-gray-600">
              all logistics entries
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Truck className="h-4 w-4 mr-2" />
              In Transit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logistics.filter(l => ['picked_up', 'in_transit'].includes(l.status)).length}
            </div>
            <p className="text-sm text-gray-600">
              active deliveries
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              Delivered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logistics.filter(l => l.status === 'delivered').length}
            </div>
            <p className="text-sm text-gray-600">
              completed deliveries
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logistics.filter(l => l.status === 'pending').length}
            </div>
            <p className="text-sm text-gray-600">
              awaiting pickup
            </p>
          </CardContent>
        </Card>
      </div>

      {logistics.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No logistics entries</h3>
              <p className="text-gray-600">
                Logistics entries will be created when supplier orders are assigned
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Logistics Tracking</CardTitle>
            <CardDescription>
              Track all deliveries from suppliers to pharmacies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Pharmacy</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Estimated Delivery</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logistics.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="font-medium">
                        {getSeptraOrderTitle(entry.septraOrderId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {getSupplierName(entry.supplierId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {entry.pharmacyId ? getPharmacyName(entry.pharmacyId) : 'Multiple'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {entry.trackingNumber ? (
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {entry.trackingNumber}
                          </code>
                        ) : (
                          <span className="text-gray-400">No tracking</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`flex items-center space-x-1 w-fit ${getStatusColor(entry.status)}`}>
                        <span className="capitalize">{entry.status.replace('_', ' ')}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="w-20">
                        <Progress value={getStatusProgress(entry.status)} className="h-2" />
                        <div className="text-xs text-gray-500 mt-1">
                          {getStatusProgress(entry.status)}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {entry.estimatedDelivery ? (
                          <div>
                            {new Date(entry.estimatedDelivery).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-gray-400">TBD</span>
                        )}
                        {entry.actualDelivery && (
                          <div className="text-green-600 text-xs">
                            Delivered: {new Date(entry.actualDelivery).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {entry.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateLogisticsStatus(entry.id, 'picked_up')}
                          >
                            Pickup
                          </Button>
                        )}
                        {entry.status === 'picked_up' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateLogisticsStatus(entry.id, 'in_transit')}
                          >
                            In Transit
                          </Button>
                        )}
                        {entry.status === 'in_transit' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateLogisticsStatus(entry.id, 'delivered')}
                          >
                            Delivered
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}