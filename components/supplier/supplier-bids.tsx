'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, Bid, RFQ, SKU, SeptraOrder } from '@/types';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, TrendingUp, Award, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface SupplierBidsProps {
  user: User;
}

export function SupplierBids({ user }: SupplierBidsProps) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [rfqs, setRFQs] = useState<RFQ[]>([]);
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [septraOrders, setSeptraOrders] = useState<SeptraOrder[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRFQ, setSelectedRFQ] = useState<RFQ | null>(null);
  const [selectedSKU, setSelectedSKU] = useState<string>('');
  const [bidForm, setBidForm] = useState({
    unitPrice: '',
    quantity: '',
    minQuantity: '',
    leadTimeDays: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
    
    // Listen for SKU updates from the SKU Engine
    const handleSKUUpdate = () => {
      loadData();
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('skuUpdate', handleSKUUpdate);
    return () => window.removeEventListener('skuUpdate', handleSKUUpdate);
  }, [user.profileId]);

  const loadData = useCallback(() => {
    const allBids = storage.getBids();
    const myBids = allBids.filter(b => b.supplierId === user.profileId);
    setBids(myBids);
    
    // Get all RFQs and convert date strings to Date objects
    const allRFQs = storage.getRFQs().map(rfq => ({
      ...rfq,
      publishedAt: new Date(rfq.publishedAt),
      biddingDeadline: new Date(rfq.biddingDeadline),
      deliveryRequirement: rfq.deliveryRequirement ? new Date(rfq.deliveryRequirement) : undefined
    }));
    
    // Filter for open RFQs that haven't expired
    const openRFQs = allRFQs.filter(rfq => {
      const now = new Date();
      return rfq.status === 'open' && rfq.biddingDeadline > now;
    });
    
    setRFQs(openRFQs);
    
    // Load all active SKUs for supplier interface
    const allSKUs = storage.getSKUs();
    const activeSKUs = allSKUs.filter(sku => sku.isActive);
    setSKUs(activeSKUs);
    setSeptraOrders(storage.getSeptraOrders());
    
    console.log('📦 Supplier Bids - SKUs loaded:', activeSKUs.length, 'active SKUs');
  }, [user.profileId]);

  const getSKUName = (skuId: string) => {
    const sku = skus.find(s => s.id === skuId);
    return sku ? `${sku.name} (${sku.code})` : skuId;
  };

  const getRFQTitle = (rfqId: string) => {
    const rfq = rfqs.find(r => r.id === rfqId);
    return rfq ? rfq.title : rfqId;
  };

  const getAvailableSKUs = (rfqId: string) => {
    const rfq = rfqs.find(r => r.id === rfqId);
    if (!rfq) return [];

    const septraOrder = septraOrders.find(o => o.id === rfq.septraOrderId);
    if (!septraOrder) return [];

    // Get current supplier data
    const suppliers = storage.getSuppliers();
    const supplier = suppliers.find(s => s.id === user.profileId);
    if (!supplier) {
      return [];
    }

    console.log('🔍 DEBUG - Available SKUs Check:');
    console.log('- RFQ ID:', rfqId);
    console.log('- Septra Order:', septraOrder.title);
    console.log('- Order Lines:', septraOrder.lines.length);
    console.log('- Supplier Categories:', supplier.categories);
    console.log('- All SKUs:', skus.length);

    // Filter order lines that this supplier can bid on
    const availableLines = septraOrder.lines.filter(line => {
      const sku = skus.find(s => s.id === line.skuId);
      if (!sku) {
        console.log('❌ SKU not found for line:', line.skuId);
        return false;
      }
      
      const alreadyBid = bids.some(b => b.rfqId === rfqId && b.skuId === line.skuId && b.supplierId === user.profileId);
      
      // Enhanced category matching
      const categoryMatch = supplier.categories.includes('ALL') || 
                           supplier.categories.includes(sku.category) ||
                           supplier.categories.some(cat => 
                             cat.toLowerCase() === sku.category.toLowerCase() ||
                             cat.toLowerCase() === 'all'
                           );
      
      const notAwarded = !line.awardedSupplierId;
      
      console.log(`📦 SKU: ${sku.name} (${sku.category})`);
      console.log(`  - Already bid: ${alreadyBid}`);
      console.log(`  - Category match: ${categoryMatch}`);
      console.log(`  - Not awarded: ${notAwarded}`);
      console.log(`  - Available: ${categoryMatch && !alreadyBid && notAwarded}`);
      
      return categoryMatch && !alreadyBid && notAwarded;
    });
    
    console.log('✅ Available lines for bidding:', availableLines.length);
    return availableLines;
  };

  const resetForm = () => {
    setBidForm({
      unitPrice: '',
      quantity: '',
      minQuantity: '',
      leadTimeDays: '',
      notes: ''
    });
    setSelectedRFQ(null);
    setSelectedSKU('');
  };

  const handleSubmitBid = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRFQ || !selectedSKU || !bidForm.unitPrice || !bidForm.quantity || !bidForm.leadTimeDays) {
      toast.error('Please fill in all required fields');
      return;
    }

    const septraOrder = septraOrders.find(o => o.id === selectedRFQ.septraOrderId);
    const orderLine = septraOrder?.lines.find(l => l.skuId === selectedSKU);
    
    if (!orderLine) {
      toast.error('Invalid SKU selection');
      return;
    }

    const quantity = parseInt(bidForm.quantity);
    const minQuantity = bidForm.minQuantity ? parseInt(bidForm.minQuantity) : 0;

    if (quantity > orderLine.totalQuantity) {
      toast.error('Bid quantity cannot exceed total required quantity');
      return;
    }

    if (minQuantity > orderLine.totalQuantity) {
      toast.error('Minimum quantity cannot exceed total required quantity');
      return;
    }

    const newBid: Bid = {
      id: `bid_${Date.now()}`,
      rfqId: selectedRFQ.id,
      supplierId: user.profileId,
      skuId: selectedSKU,
      unitPrice: parseFloat(bidForm.unitPrice),
      quantity: quantity,
      minQuantity: minQuantity || undefined,
      leadTimeDays: parseInt(bidForm.leadTimeDays),
      notes: bidForm.notes || undefined,
      status: 'submitted',
      submittedAt: new Date()
    };

    const allBids = storage.getBids();
    storage.setBids([...allBids, newBid]);
    loadData();
    resetForm();
    toast.success('Bid submitted successfully');
  };

  const getStatusColor = (status: Bid['status']) => {
    switch (status) {
      case 'awarded':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusIcon = (status: Bid['status']) => {
    switch (status) {
      case 'awarded':
        return <Award className="h-3 w-3" />;
      case 'rejected':
        return <Clock className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  // RFQs are already filtered to be open and non-expired in loadData
  const openRFQs = rfqs;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Bids</h2>
          <p className="text-gray-600 mt-1">
            View and manage your submitted bids
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button disabled={openRFQs.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Submit New Bid
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Submit New Bid</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitBid} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select RFQ</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={selectedRFQ?.id || ''}
                    onChange={(e) => {
                      const rfq = rfqs.find(r => r.id === e.target.value);
                      setSelectedRFQ(rfq || null);
                      setSelectedSKU('');
                    }}
                    required
                  >
                    <option value="">Select RFQ</option>
                    {openRFQs.map((rfq) => (
                      <option key={rfq.id} value={rfq.id}>
                        {rfq.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Select SKU</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={selectedSKU}
                    onChange={(e) => setSelectedSKU(e.target.value)}
                    required
                    disabled={!selectedRFQ}
                  >
                    <option value="">Select SKU</option>
                    {selectedRFQ && getAvailableSKUs(selectedRFQ.id).map((line) => {
                      const sku = skus.find(s => s.id === line.skuId);
                      return (
                      <option key={line.id} value={line.skuId}>
                        {sku ? `${sku.name} (${sku.code})` : line.skuId} - Qty: {line.totalQuantity}
                      </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bidForm.unitPrice}
                    onChange={(e) => setBidForm(prev => ({ ...prev, unitPrice: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={bidForm.quantity}
                    onChange={(e) => setBidForm(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="Quantity you can supply"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum Quantity (Optional)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={bidForm.minQuantity}
                    onChange={(e) => setBidForm(prev => ({ ...prev, minQuantity: e.target.value }))}
                    placeholder="Minimum order quantity"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Lead Time (Days)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={bidForm.leadTimeDays}
                    onChange={(e) => setBidForm(prev => ({ ...prev, leadTimeDays: e.target.value }))}
                    placeholder="Delivery lead time"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={bidForm.notes}
                  onChange={(e) => setBidForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional information about your bid"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  Submit Bid
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {bids.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bids submitted</h3>
              <p className="text-gray-600">
                Submit your first bid on an open RFQ to start competing for orders
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Submitted Bids</CardTitle>
            <CardDescription>
              Track the status of your submitted bids
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RFQ</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Lead Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bids.map((bid) => (
                  <TableRow key={bid.id}>
                    <TableCell>
                      <div className="font-medium">
                        {getRFQTitle(bid.rfqId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{getSKUName(bid.skuId)}</p>
                        {bid.notes && (
                          <p className="text-sm text-gray-500 mt-1">{bid.notes}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>${bid.unitPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <div>
                        <p>{bid.quantity}</p>
                        {bid.minQuantity && (
                          <p className="text-xs text-gray-500">Min: {bid.minQuantity}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{bid.leadTimeDays} days</TableCell>
                    <TableCell>
                      <Badge className={`flex items-center space-x-1 w-fit ${getStatusColor(bid.status)}`}>
                        {getStatusIcon(bid.status)}
                        <span className="capitalize">{bid.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(bid.submittedAt).toLocaleDateString()}
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