'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { User, Bid, RFQ, SKU, Supplier, SeptraOrder, SupplierOrder, SupplierOrderLine } from '@/types';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Award, Eye, Star } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AdminBidsProps {
  user: User;
}

export function AdminBids({ user }: AdminBidsProps) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [rfqs, setRFQs] = useState<RFQ[]>([]);
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [septraOrders, setSeptraOrders] = useState<SeptraOrder[]>([]);
  const [selectedRFQ, setSelectedRFQ] = useState<RFQ | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setBids(storage.getBids());
    setRFQs(storage.getRFQs());
    setSKUs(storage.getSKUs());
    setSuppliers(storage.getSuppliers());
    setSeptraOrders(storage.getSeptraOrders());
  };

  const getSKUName = (skuId: string) => {
    const sku = skus.find(s => s.id === skuId);
    return sku ? `${sku.name} (${sku.code})` : skuId;
  };

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || supplierId;
  };

  const getSupplierRating = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.rating || 0;
  };

  const getRFQTitle = (rfqId: string) => {
    const rfq = rfqs.find(r => r.id === rfqId);
    return rfq?.title || rfqId;
  };

  const getSeptraOrder = (rfqId: string) => {
    const rfq = rfqs.find(r => r.id === rfqId);
    return rfq ? septraOrders.find(o => o.id === rfq.septraOrderId) : null;
  };

  const getBidsForRFQ = (rfqId: string) => {
    return bids.filter(b => b.rfqId === rfqId);
  };

  const getBidsByStatus = (status: Bid['status']) => {
    return bids.filter(b => b.status === status);
  };

  const groupBidsBySKU = (rfqId: string) => {
    const rfqBids = getBidsForRFQ(rfqId);
    const groups: { [skuId: string]: Bid[] } = {};
    
    rfqBids.forEach(bid => {
      if (!groups[bid.skuId]) {
        groups[bid.skuId] = [];
      }
      groups[bid.skuId].push(bid);
    });
    
    return groups;
  };

  const rankBids = (bidsForSKU: Bid[]) => {
    return bidsForSKU
      .filter(bid => bid.status === 'submitted')
      .sort((a, b) => {
        // Primary: lowest price
        if (a.unitPrice !== b.unitPrice) {
          return a.unitPrice - b.unitPrice;
        }
        // Secondary: shortest lead time
        if (a.leadTimeDays !== b.leadTimeDays) {
          return a.leadTimeDays - b.leadTimeDays;
        }
        // Tertiary: highest supplier rating
        const ratingA = getSupplierRating(a.supplierId);
        const ratingB = getSupplierRating(b.supplierId);
        return ratingB - ratingA;
      });
  };

  const awardBid = (bidId: string) => {
    const bid = bids.find(b => b.id === bidId);
    if (!bid) return;

    // Update bid status
    const updatedBids = bids.map(b => 
      b.id === bidId 
        ? { ...b, status: 'awarded' as const }
        : b.rfqId === bid.rfqId && b.skuId === bid.skuId 
          ? { ...b, status: 'rejected' as const }
          : b
    );
    storage.setBids(updatedBids);

    // Update Septra Order with awarded supplier
    console.log('🏆 BID AWARDED - Starting automated workflow');
    console.log('Awarded bid:', bid);
    console.log('Updating Septra Order with awarded supplier...');
    
    // Phase 1: Update Septra Order with award details
    console.log('Attempting to update Septra Order after bid award for bidId:', bidId);
    const rfq = rfqs.find(r => r.id === bid.rfqId);
    if (rfq) {
      const septraOrder = septraOrders.find(o => o.id === rfq.septraOrderId);
      if (septraOrder) {
        const updatedOrders = septraOrders.map(o => 
          o.id === septraOrder.id 
            ? {
                ...o,
                lines: o.lines.map(line => 
                  line.skuId === bid.skuId 
                    ? {
                        ...line,
                        awardedSupplierId: bid.supplierId,
                        awardedPrice: bid.unitPrice,
                        awardedQuantity: Math.min(bid.quantity, line.totalQuantity)
                      }
                    : line
                ),
                updatedAt: new Date()
              }
            : o
        );
        storage.setSeptraOrders(updatedOrders);
        setSeptraOrders(updatedOrders); // Update local state for immediate reflection
        console.log('Septra Order updated with awarded bid. Current Septra Orders in storage:', storage.getSeptraOrders());
        console.log('✅ Septra Order updated with awarded supplier');

        // Phase 2: Create supplier order for fulfillment
        console.log('📦 Creating supplier order for fulfillment...');
        // Create or update supplier order
        console.log('Checking if supplier order needs to be created/updated...');
        const updatedSeptraOrder = updatedOrders.find(o => o.id === septraOrder.id);
        if (updatedSeptraOrder) {
          createSupplierOrder(bid, updatedSeptraOrder);
          
          // Phase 3: Check if ready for pharmacy order generation
          checkAndGeneratePharmacyOrders(updatedSeptraOrder);
        }
      }
    }

    // Phase 4: Send notifications
    console.log('🔔 Sending notifications to pharmacy and supplier...');
    toast.success(`Bid awarded to ${getSupplierName(bid.supplierId)}`);
    toast.info('Pharmacy and supplier have been notified');

    loadData();
    toast.success('Bid awarded successfully');
  };

  const createSupplierOrder = (awardedBid: Bid, septraOrder: SeptraOrder) => {
    const existingSupplierOrders = storage.getSupplierOrders();
    console.log('Creating supplier order for:', awardedBid.supplierId);
    const existingOrder = existingSupplierOrders.find(
      o => o.septraOrderId === septraOrder.id && o.supplierId === awardedBid.supplierId
    );

    const orderLine: SupplierOrderLine = {
      id: `line_${Date.now()}`,
      skuId: awardedBid.skuId,
      quantity: Math.min(awardedBid.quantity, septraOrder.lines.find(l => l.skuId === awardedBid.skuId)?.totalQuantity || 0),
      unitPrice: awardedBid.unitPrice,
      totalPrice: 0, // Will be calculated
      pharmacyBreakdown: septraOrder.lines.find(l => l.skuId === awardedBid.skuId)?.demandBreakdown || []
    };
    orderLine.totalPrice = orderLine.quantity * orderLine.unitPrice;

    if (existingOrder) {
      // Add line to existing supplier order
      const updatedOrders = existingSupplierOrders.map(o => 
        o.id === existingOrder.id 
          ? {
              ...o,
              lines: [...o.lines, orderLine],
              totalValue: o.totalValue + orderLine.totalPrice
            }
          : o
      );
      storage.setSupplierOrders(updatedOrders);
    } else {
      // Create new supplier order
      const newSupplierOrder: SupplierOrder = {
        id: `supplier_order_${Date.now()}`,
        septraOrderId: septraOrder.id,
        supplierId: awardedBid.supplierId,
        lines: [orderLine],
        totalValue: orderLine.totalPrice,
        status: 'assigned',
        assignedAt: new Date()
      };
      storage.setSupplierOrders([...existingSupplierOrders, newSupplierOrder]);
    }
    console.log('✅ Supplier order created/updated');

    // Check if all lines are awarded, then generate pharmacy orders
    const updatedSeptraOrder = septraOrders.find(o => o.id === septraOrder.id);
    if (updatedSeptraOrder) {
      const allLinesAwarded = updatedSeptraOrder.lines.every(line => line.awardedSupplierId);
      if (allLinesAwarded) {
        console.log('All lines awarded, generating pharmacy orders for:', septraOrder.id);
        generatePharmacyOrdersForConfirmation(septraOrder.id);
      }
    }
  };

  const checkAndGeneratePharmacyOrders = (septraOrder: SeptraOrder) => {
    console.log('🔍 Checking if ready to generate pharmacy orders...');
    
    // Check if we have at least one awarded line (not requiring all lines)
    const hasAwardedLines = septraOrder.lines.some(line => line.awardedSupplierId);
    
    if (hasAwardedLines) {
      console.log('✅ Found awarded lines, generating pharmacy orders...');
      generatePharmacyOrdersForConfirmation(septraOrder.id);
    } else {
      console.log('⏳ No awarded lines yet, waiting for more awards...');
    }
  };

  const generatePharmacyOrdersForConfirmation = (septraOrderId: string) => {
    console.log('🏥 === GENERATING PHARMACY ORDERS ===');
    console.log('Septra Order ID:', septraOrderId);
    console.log('--- Starting generatePharmacyOrdersForConfirmation for septra order:', septraOrderId, '---');
    console.log('Generating pharmacy orders for septra order:', septraOrderId);
    
    // Get the most up-to-date septra order
    const allSeptraOrders = storage.getSeptraOrders();
    const septraOrder = allSeptraOrders.find(o => o.id === septraOrderId);
    
    if (!septraOrder) {
      console.error('❌ Septra order not found:', septraOrderId);
      return;
    }
    console.log('All Septra Orders from storage:', allSeptraOrders);
    console.log('Found septra order:', septraOrder.title);
    console.log('Order lines:', septraOrder.lines);
    console.log('Septra Order Lines awarded check:', septraOrder.lines.map(l => ({ sku: l.skuId, awarded: !!l.awardedSupplierId, awardedPrice: l.awardedPrice })));

    // Filter for lines that have been awarded
    // Filter out lines that haven't been awarded a price
    const awardedLines = septraOrder.lines.filter(line => 
      line.awardedPrice !== undefined && 
      line.awardedPrice !== null &&
      line.awardedSupplierId
    );
    
    console.log('Awarded lines:', awardedLines);
    
    if (awardedLines.length === 0) {
      console.log('⚠️ No awarded lines found, cannot generate pharmacy orders');
      return;
    }

    // Get all unique pharmacy IDs from awarded lines
    // Get all unique pharmacy IDs from the order
    const pharmacyIds = new Set(
      awardedLines.flatMap(line => line.demandBreakdown.map(d => d.pharmacyId))
    );

    console.log('Pharmacy IDs found:', Array.from(pharmacyIds));
    
    const existingPharmacyOrders = storage.getPharmacyOrders();
    const newPharmacyOrders: any[] = [];
    
    Array.from(pharmacyIds).forEach(pharmacyId => {
      console.log('Processing pharmacy:', pharmacyId);
      
      // Check if pharmacy order already exists
      const existingOrder = existingPharmacyOrders.find(
        po => po.septraOrderId === septraOrderId && po.pharmacyId === pharmacyId
      );
      
      if (existingOrder) {
        console.log('Order already exists for pharmacy:', pharmacyId);
        return; // Skip if already exists
      }

      // Find all awarded lines for this pharmacy
      // Find all lines for this pharmacy
      const pharmacyLines = awardedLines // Only consider lines that have been awarded
        .filter(line => line.demandBreakdown.some(d => d.pharmacyId === pharmacyId))
        .map(line => {
          const breakdown = line.demandBreakdown.find(d => d.pharmacyId === pharmacyId);
          return {
            id: `pharmacy_line_${Date.now()}_${Math.random()}`,
            skuId: line.skuId,
            quantity: breakdown?.quantity || 0,
            unitPrice: line.awardedPrice!, // Use ! because we filtered for awardedPrice being present
            totalPrice: (breakdown?.quantity || 0) * line.awardedPrice!,
            status: 'pending' as const
          };
        });

      const totalValue = pharmacyLines.reduce((sum, line) => sum + line.totalPrice, 0);

      const newOrder = {
        id: `pharmacy_order_${Date.now()}_${pharmacyId}`,
        septraOrderId: septraOrder.id,
        pharmacyId,
        lines: pharmacyLines,
        totalValue,
        status: 'pending' as const
      };
      
      console.log('Creating pharmacy order for:', pharmacyId, 'with total value:', totalValue);
      newPharmacyOrders.push(newOrder);
    });

    console.log('New pharmacy orders to be saved:', newPharmacyOrders);

    if (newPharmacyOrders.length > 0) {
      console.log('💾 Saving', newPharmacyOrders.length, 'new pharmacy orders');
      console.log('Saving', newPharmacyOrders.length, 'new pharmacy orders');
      
      // Save pharmacy orders
      storage.setPharmacyOrders([...existingPharmacyOrders, ...newPharmacyOrders]);

      // Update Septra Order status to awaiting confirmations
      const updatedSeptraOrders = allSeptraOrders.map(o => 
        o.id === septraOrderId 
          ? { ...o, status: 'awaiting_confirmations' as const, updatedAt: new Date() }
          : o
      );
      storage.setSeptraOrders(updatedSeptraOrders);
      setSeptraOrders(updatedSeptraOrders);

      console.log('✅ Pharmacy orders generated successfully');
      console.log('📧 Sending notifications to pharmacies...');
      
      // Send notifications
      toast.success(`Pharmacy orders generated for ${newPharmacyOrders.length} pharmacies`);
      toast.info('Pharmacies have been notified to confirm their orders');
      
      // Trigger browser notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Septra Platform', {
          body: `${newPharmacyOrders.length} pharmacy orders ready for confirmation`,
          icon: '/favicon.ico'
        });
      }
    } else {
      console.log('⚠️ No new pharmacy orders to create');
      console.log('No new pharmacy orders to create');
    }
    
    console.log('🏥 === PHARMACY ORDER GENERATION COMPLETE ===');
    console.log('--- Finished generatePharmacyOrdersForConfirmation ---');
  };

  const closeRFQAndEnableAwards = (rfqId: string) => {
    console.log('closeRFQAndEnableAwards called for RFQ:', rfqId);
    const allRFQs = storage.getRFQs();
    const updatedRFQs = allRFQs.map(r => 
      r.id === rfqId ? { ...r, status: 'closed' as const } : r
    );
    storage.setRFQs(updatedRFQs);

    // Update corresponding Septra Order
    console.log('Current RFQs before update:', allRFQs);
    console.log('Updated RFQs after status change:', updatedRFQs);
    const rfq = allRFQs.find(r => r.id === rfqId);
    if (rfq) {
      console.log('Septra Order associated with RFQ:', rfq);
      console.log('Septra Orders before update:', septraOrders);
      const updatedOrders = septraOrders.map(o => 
        o.id === rfq.septraOrderId 
          ? { ...o, status: 'bidding_closed' as const, updatedAt: new Date() }
          : o
      );
      storage.setSeptraOrders(updatedOrders);
      setSeptraOrders(updatedOrders); // Update local state for immediate reflection
      console.log('Updated Septra Orders after status change:', updatedOrders);
      console.log('Calling generatePharmacyOrdersForConfirmation for septraOrderId:', rfq.septraOrderId);
    }

    loadData();
    toast.success('RFQ closed - you can now award bids');
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

  const closedRFQs = rfqs.filter(r => r.status === 'closed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage Bids</h2>
          <p className="text-gray-600 mt-1">
            Review and award bids from suppliers
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Bids</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bids.length}</div>
            <p className="text-sm text-gray-600">
              all submissions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getBidsByStatus('submitted').length}
            </div>
            <p className="text-sm text-gray-600">
              awaiting decision
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Awarded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getBidsByStatus('awarded').length}
            </div>
            <p className="text-sm text-gray-600">
              contracts won
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getBidsByStatus('rejected').length}
            </div>
            <p className="text-sm text-gray-600">
              not selected
            </p>
          </CardContent>
        </Card>
      </div>

      {bids.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bids received</h3>
              <p className="text-gray-600">
                Bids will appear here once suppliers respond to your RFQs
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="by-rfq" className="space-y-6">
          <TabsList>
            <TabsTrigger value="by-rfq">By RFQ</TabsTrigger>
            <TabsTrigger value="all-bids">All Bids</TabsTrigger>
          </TabsList>

          <TabsContent value="by-rfq" className="space-y-6">
            {closedRFQs.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No closed RFQs</h3>
                    <p className="text-gray-600">
                      Close bidding on RFQs to review and award bids
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {closedRFQs.map((rfq) => {
                  const rfqBids = getBidsForRFQ(rfq.id);
                  const skuGroups = groupBidsBySKU(rfq.id);
                  
                  return (
                    <Card key={rfq.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{rfq.title}</CardTitle>
                            <CardDescription>
                              {rfqBids.length} bids received for {Object.keys(skuGroups).length} SKUs
                            </CardDescription>
                          </div>
                          <Badge className="bg-orange-100 text-orange-800">
                            Ready for Award
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {Object.entries(skuGroups).map(([skuId, skuBids]) => {
                          const rankedBids = rankBids(skuBids);
                          const awardedBid = skuBids.find(b => b.status === 'awarded');
                          
                          return (
                            <div key={skuId} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-medium">{getSKUName(skuId)}</h4>
                                {awardedBid ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    <Award className="h-3 w-3 mr-1" />
                                    Awarded
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">
                                    {rankedBids.length} bids
                                  </Badge>
                                )}
                              </div>
                              
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead>Unit Price</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Lead Time</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {rankedBids.map((bid, index) => (
                                    <TableRow key={bid.id} className={index === 0 && !awardedBid ? 'bg-green-50' : ''}>
                                      <TableCell>
                                        {index === 0 && !awardedBid && (
                                          <Badge variant="outline" className="text-green-600 border-green-600">
                                            #1
                                          </Badge>
                                        )}
                                        {index === 0 && awardedBid && bid.status === 'awarded' && (
                                          <Badge className="bg-green-100 text-green-800">
                                            Winner
                                          </Badge>
                                        )}
                                        {index > 0 && `#${index + 1}`}
                                      </TableCell>
                                      <TableCell>
                                        <div className="font-medium">
                                          {getSupplierName(bid.supplierId)}
                                        </div>
                                        {bid.notes && (
                                          <div className="text-sm text-gray-500 mt-1">
                                            {bid.notes}
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <div className="font-medium">
                                          ${bid.unitPrice.toFixed(2)}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div>
                                          {bid.quantity}
                                          {bid.minQuantity && (
                                            <div className="text-xs text-gray-500">
                                              Min: {bid.minQuantity}
                                            </div>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>{bid.leadTimeDays} days</TableCell>
                                      <TableCell>
                                        <div className="flex items-center space-x-1">
                                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                          <span className="text-sm">
                                            {getSupplierRating(bid.supplierId).toFixed(1)}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge className={getStatusColor(bid.status)}>
                                          {bid.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        {!awardedBid && bid.status === 'submitted' && (
                                          <Button
                                            size="sm"
                                            variant={index === 0 ? 'default' : 'outline'}
                                            onClick={() => awardBid(bid.id)}
                                          >
                                            Award
                                          </Button>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all-bids">
            <Card>
              <CardHeader>
                <CardTitle>All Bids</CardTitle>
                <CardDescription>
                  Complete list of all submitted bids
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>RFQ</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Lead Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
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
                          <div className="font-medium">{getSKUName(bid.skuId)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {getSupplierName(bid.supplierId)}
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span className="text-sm text-gray-500">
                              {getSupplierRating(bid.supplierId).toFixed(1)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>${bid.unitPrice.toFixed(2)}</TableCell>
                        <TableCell>
                          <div>
                            {bid.quantity}
                            {bid.minQuantity && (
                              <div className="text-xs text-gray-500">
                                Min: {bid.minQuantity}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{bid.leadTimeDays} days</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(bid.status)}>
                            {bid.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(bid.submittedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {(() => {
                              const rfq = rfqs.find(r => r.id === bid.rfqId);
                              const isRfqClosed = rfq?.status === 'closed';
                              const isBidAwarded = bid.status === 'awarded';
                              const isBidRejected = bid.status === 'rejected';
                              const canAward = isRfqClosed && bid.status === 'submitted';

                              // Show Close RFQ button if RFQ is still open
                              if (!isRfqClosed && bid.status === 'submitted') {
                                return (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => closeRFQAndEnableAwards(bid.rfqId)}
                                          className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                                        >
                                          Close RFQ
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Close bidding for this RFQ to enable awarding bids
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              }

                              // Show Award button if RFQ is closed
                              let tooltipMessage = '';
                              if (isBidAwarded) {
                                tooltipMessage = 'This bid has already been awarded.';
                              } else if (isBidRejected) {
                                tooltipMessage = 'This bid has been rejected.';
                              } else if (bid.status !== 'submitted') {
                                tooltipMessage = 'Only submitted bids can be awarded.';
                              }

                              return (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        onClick={() => awardBid(bid.id)} 
                                        disabled={!canAward}
                                        className={canAward ? "bg-green-600 hover:bg-green-700" : ""}
                                      >
                                        {isBidAwarded ? 'Awarded' : 'Award'}
                                      </Button>
                                    </TooltipTrigger>
                                    {tooltipMessage && <TooltipContent>{tooltipMessage}</TooltipContent>}
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}