'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, RFQ, SeptraOrder, SKU, Supplier } from '@/types';
import { storage } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Calendar, DollarSign } from 'lucide-react';

interface SupplierRFQsProps {
  user: User;
}

export function SupplierRFQs({ user }: SupplierRFQsProps) {
  const [rfqs, setRFQs] = useState<RFQ[]>([]);
  const [septraOrders, setSeptraOrders] = useState<SeptraOrder[]>([]);
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

  // Add effect to reload data when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const loadData = useCallback(() => {
    const allRFQs = storage.getRFQs();
    
    // Convert date strings back to Date objects
    const rfqsWithDates = allRFQs.map(rfq => ({
      ...rfq,
      publishedAt: new Date(rfq.publishedAt),
      biddingDeadline: new Date(rfq.biddingDeadline),
      deliveryRequirement: rfq.deliveryRequirement ? new Date(rfq.deliveryRequirement) : undefined
    }));
    
    // Filter for truly open RFQs (status open AND deadline not passed)
    const now = new Date();
    const openRFQs = rfqsWithDates.filter(r => {
      const isOpen = r.status === 'open';
      const notExpired = r.biddingDeadline > now;
      return isOpen && notExpired;
    });
    
    // Filter RFQs for SKUs that this supplier can provide
    const suppliers = storage.getSuppliers();
    const currentSupplier = suppliers.find(s => s.id === user.profileId);
    setSupplier(currentSupplier);
    
    if (currentSupplier) {
      const allSeptraOrders = storage.getSeptraOrders();
      
      const relevantOrders = allSeptraOrders.filter(order => 
        openRFQs.some(rfq => rfq.septraOrderId === order.id) &&
        order.lines.some(line => {
          const sku = storage.getSKUs().find(s => s.id === line.skuId);
          const categoryMatch = sku && currentSupplier.categories.includes(sku.category);
          return categoryMatch;
        })
      );
      
      const relevantRFQs = openRFQs.filter(rfq => 
        relevantOrders.some(order => order.id === rfq.septraOrderId)
      );
      
      setRFQs(relevantRFQs);
      setSeptraOrders(relevantOrders);
    }
    
    // Load all active SKUs for supplier interface
    const allSKUs = storage.getSKUs();
    const activeSKUs = allSKUs.filter(sku => sku.isActive);
    setSKUs(activeSKUs);
  }, [user.profileId]);

  const getSeptraOrder = (septraOrderId: string) => {
    return septraOrders.find(o => o.id === septraOrderId);
  };

  const getSKUName = (skuId: string) => {
    const sku = skus.find(s => s.id === skuId);
    return sku ? `${sku.name} (${sku.code})` : skuId;
  };

  const canSupplySKU = (skuId: string) => {
    if (!supplier) return false;
    const sku = skus.find(s => s.id === skuId);
    // More flexible category matching - check if supplier has "ALL" category or exact match
    const canSupply = sku && (
      supplier.categories.includes('ALL') || 
      supplier.categories.includes(sku.category) ||
      supplier.categories.some(cat => cat.toLowerCase() === sku.category.toLowerCase())
    );
    
    return canSupply;
  };

  const isDeadlineApproaching = (deadline: Date) => {
    const now = new Date();
    const timeLeft = deadline.getTime() - now.getTime();
    const hoursLeft = timeLeft / (1000 * 60 * 60);
    return hoursLeft <= 24; // Less than 24 hours
  };

  const formatTimeLeft = (deadline: Date) => {
    const now = new Date();
    const timeLeft = deadline.getTime() - now.getTime();
    
    if (timeLeft <= 0) return 'Expired';
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} days, ${hours} hours`;
    } else {
      return `${hours} hours`;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Open RFQs</h2>
        <p className="text-gray-600 mt-1">
          View and bid on Request for Quotations matching your categories
        </p>
      </div>

      {rfqs.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No open RFQs</h3>
              <p className="text-gray-600">
                There are currently no RFQs available for your categories
              </p>
              {supplier && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Your categories:</p>
                  <div className="flex justify-center space-x-2 mt-2">
                    {supplier.categories.map((category) => (
                      <Badge key={category} variant="outline">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {rfqs.map((rfq) => {
            const septraOrder = getSeptraOrder(rfq.septraOrderId);
            const eligibleLines = septraOrder?.lines.filter(line => canSupplySKU(line.skuId)) || [];
            const deadlineApproaching = isDeadlineApproaching(rfq.biddingDeadline);

            return (
              <Card key={rfq.id} className={deadlineApproaching ? 'border-orange-300 bg-orange-50' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{rfq.title}</CardTitle>
                      <CardDescription>
                        {rfq.description}
                      </CardDescription>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant={deadlineApproaching ? 'destructive' : 'default'}>
                        {rfq.status}
                      </Badge>
                      {deadlineApproaching && (
                        <div className="text-sm text-orange-600 font-medium">
                          ⚠️ Deadline approaching
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* RFQ Details */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">Bidding Deadline</p>
                        <p className="text-sm text-gray-600">
                          {rfq.biddingDeadline.toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimeLeft(rfq.biddingDeadline)} left
                        </p>
                      </div>
                    </div>
                    {rfq.deliveryRequirement && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">Delivery Required</p>
                          <p className="text-sm text-gray-600">
                            {rfq.deliveryRequirement.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">Total Value</p>
                        <p className="text-sm text-gray-600">
                          ${septraOrder?.totalValue?.toFixed(2) || 'TBD'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Terms */}
                  {rfq.terms && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Terms & Conditions</h4>
                      <p className="text-sm text-blue-700">{rfq.terms}</p>
                    </div>
                  )}

                  {/* Eligible SKU Lines */}
                  <div>
                    <h4 className="font-medium mb-3">
                      Eligible Items ({eligibleLines.length} of {septraOrder?.lines.length || 0})
                    </h4>
                    {eligibleLines.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Total Quantity</TableHead>
                            <TableHead>Pharmacies</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {eligibleLines.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell>
                                <div className="font-medium">
                                  {getSKUName(line.skuId)}
                                </div>
                              </TableCell>
                              <TableCell>{line.totalQuantity}</TableCell>
                              <TableCell>{line.demandBreakdown.length} pharmacies</TableCell>
                              <TableCell>
                                <Badge variant={line.awardedSupplierId ? 'default' : 'secondary'}>
                                  {line.awardedSupplierId ? 'Awarded' : 'Open for bidding'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <p>No items match your categories for this RFQ</p>
                        {supplier && (
                          <div className="mt-2">
                            <p className="text-sm">Your categories:</p>
                            <div className="flex justify-center space-x-2 mt-1">
                              {supplier.categories.map((category) => (
                                <Badge key={category} variant="outline" className="text-xs">
                                  {category}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}