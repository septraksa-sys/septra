'use client';

import { useState, useEffect } from 'react';
import { User, PharmacyDemand, SKU, Pharmacy, SeptraOrder, SeptraOrderLine } from '@/types';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Plus, Users, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface AdminDemandsProps {
  user: User;
}

export function AdminDemands({ user }: AdminDemandsProps) {
  const [demands, setDemands] = useState<PharmacyDemand[]>([]);
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedDemands, setSelectedDemands] = useState<string[]>([]);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderForm, setOrderForm] = useState({
    title: '',
    description: '',
    biddingDeadline: '',
    deliveryDeadline: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allDemands = storage.getPharmacyDemands();
    const submittedDemands = allDemands.filter(d => d.status === 'submitted');
    setDemands(submittedDemands);
    setSKUs(storage.getSKUs());
    setPharmacies(storage.getPharmacies());
  };

  const getSKUName = (skuId: string) => {
    const sku = skus.find(s => s.id === skuId);
    return sku ? `${sku.name} (${sku.code})` : skuId;
  };

  const getPharmacyName = (pharmacyId: string) => {
    const pharmacy = pharmacies.find(p => p.id === pharmacyId);
    return pharmacy?.name || pharmacyId;
  };

  const toggleDemandSelection = (demandId: string) => {
    setSelectedDemands(prev => 
      prev.includes(demandId) 
        ? prev.filter(id => id !== demandId)
        : [...prev, demandId]
    );
  };

  const selectAllDemands = () => {
    if (selectedDemands.length === demands.length) {
      setSelectedDemands([]);
    } else {
      setSelectedDemands(demands.map(d => d.id));
    }
  };

  const aggregateSelectedDemands = () => {
    const selected = demands.filter(d => selectedDemands.includes(d.id));
    
    // Group by SKU
    const skuGroups: { [skuId: string]: PharmacyDemand[] } = {};
    selected.forEach(demand => {
      if (!skuGroups[demand.skuId]) {
        skuGroups[demand.skuId] = [];
      }
      skuGroups[demand.skuId].push(demand);
    });

    return Object.entries(skuGroups).map(([skuId, demands]) => ({
      skuId,
      totalQuantity: demands.reduce((sum, d) => sum + d.quantity, 0),
      pharmacyCount: demands.length,
      demands
    }));
  };

  const createSeptraOrder = () => {
    if (!orderForm.title || selectedDemands.length === 0) {
      toast.error('Please provide a title and select demands');
      return;
    }

    const selected = demands.filter(d => selectedDemands.includes(d.id));
    const aggregated = aggregateSelectedDemands();

    // Create order lines
    const orderLines: SeptraOrderLine[] = aggregated.map((group, index) => ({
      id: `line_${Date.now()}_${index}`,
      skuId: group.skuId,
      totalQuantity: group.totalQuantity,
      demandBreakdown: group.demands.map(d => ({
        pharmacyId: d.pharmacyId,
        quantity: d.quantity
      }))
    }));

    const newOrder: SeptraOrder = {
      id: `septra_${Date.now()}`,
      title: orderForm.title,
      description: orderForm.description,
      status: 'draft',
      lines: orderLines,
      createdAt: new Date(),
      updatedAt: new Date(),
      biddingDeadline: orderForm.biddingDeadline ? new Date(orderForm.biddingDeadline) : undefined,
      deliveryDeadline: orderForm.deliveryDeadline ? new Date(orderForm.deliveryDeadline) : undefined
    };

    // Save the order
    const allOrders = storage.getSeptraOrders();
    storage.setSeptraOrders([...allOrders, newOrder]);

    // Mark selected demands as processed (or remove them)
    const remainingDemands = storage.getPharmacyDemands().filter(
      d => !selectedDemands.includes(d.id)
    );
    storage.setPharmacyDemands(remainingDemands);

    loadData();
    setSelectedDemands([]);
    setIsCreatingOrder(false);
    setOrderForm({
      title: '',
      description: '',
      biddingDeadline: '',
      deliveryDeadline: ''
    });

    toast.success(`Septra Order created successfully with ${orderLines.length} SKU lines`);
  };

  const groupedDemands = demands.reduce((groups: { [skuId: string]: PharmacyDemand[] }, demand) => {
    if (!groups[demand.skuId]) {
      groups[demand.skuId] = [];
    }
    groups[demand.skuId].push(demand);
    return groups;
  }, {});

  const aggregatedData = aggregateSelectedDemands();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Aggregate Demands</h2>
          <p className="text-gray-600 mt-1">
            Combine pharmacy demands into Septra Orders for efficient procurement
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">
            {selectedDemands.length} selected
          </span>
          <Dialog open={isCreatingOrder} onOpenChange={setIsCreatingOrder}>
            <DialogTrigger asChild>
              <Button disabled={selectedDemands.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Create Septra Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Septra Order</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Order Details Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Order Title *</Label>
                    <Input
                      value={orderForm.title}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter order title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={orderForm.description}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter order description"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Bidding Deadline</Label>
                      <Input
                        type="datetime-local"
                        value={orderForm.biddingDeadline}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, biddingDeadline: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Delivery Deadline</Label>
                      <Input
                        type="datetime-local"
                        value={orderForm.deliveryDeadline}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, deliveryDeadline: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Aggregated Summary */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">Order Summary</h4>
                  <div className="space-y-2">
                    {aggregatedData.map((group) => (
                      <div key={group.skuId} className="flex justify-between text-sm">
                        <span>{getSKUName(group.skuId)}</span>
                        <span className="font-medium">
                          {group.totalQuantity} units from {group.pharmacyCount} pharmacies
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreatingOrder(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createSeptraOrder}>
                    Create Order
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {demands.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No submitted demands</h3>
              <p className="text-gray-600">
                Pharmacy demands will appear here once they are submitted
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Demands</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{demands.length}</div>
                <p className="text-sm text-gray-600">
                  from {new Set(demands.map(d => d.pharmacyId)).size} pharmacies
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Unique SKUs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(groupedDemands).length}</div>
                <p className="text-sm text-gray-600">
                  different products requested
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selected for Order</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedDemands.length}</div>
                <p className="text-sm text-gray-600">
                  demands ready to aggregate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Demands Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Submitted Demands</CardTitle>
                  <CardDescription>
                    Select demands to aggregate into a new Septra Order
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={selectAllDemands}>
                  {selectedDemands.length === demands.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedDemands.length === demands.length}
                        onCheckedChange={selectAllDemands}
                      />
                    </TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Pharmacy</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Max Price</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demands.map((demand) => (
                    <TableRow key={demand.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedDemands.includes(demand.id)}
                          onCheckedChange={() => toggleDemandSelection(demand.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{getSKUName(demand.skuId)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{getPharmacyName(demand.pharmacyId)}</div>
                      </TableCell>
                      <TableCell>{demand.quantity}</TableCell>
                      <TableCell>
                        {demand.maxUnitPrice ? `$${demand.maxUnitPrice.toFixed(2)}` : 'No limit'}
                      </TableCell>
                      <TableCell>
                        {new Date(demand.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm text-gray-600">
                          {demand.notes || '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Aggregation Preview */}
          {selectedDemands.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Aggregation Preview
                </CardTitle>
                <CardDescription>
                  Preview of how selected demands will be aggregated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Total Quantity</TableHead>
                      <TableHead>Pharmacies</TableHead>
                      <TableHead>Breakdown</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aggregatedData.map((group) => (
                      <TableRow key={group.skuId}>
                        <TableCell>
                          <div className="font-medium">{getSKUName(group.skuId)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-lg font-semibold">{group.totalQuantity}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            {group.pharmacyCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {group.demands.map((demand) => (
                              <div key={demand.id} className="flex justify-between">
                                <span>{getPharmacyName(demand.pharmacyId)}</span>
                                <span className="font-medium">{demand.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}