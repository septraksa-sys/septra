'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { User, Escrow, PharmacyOrder, SeptraOrder, Pharmacy, RFQ } from '@/types';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

interface AdminEscrowProps {
  user: User;
}

export function AdminEscrow({ user }: AdminEscrowProps) {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [pharmacyOrders, setPharmacyOrders] = useState<PharmacyOrder[]>([]);
  const [septraOrders, setSeptraOrders] = useState<SeptraOrder[]>([]);
  const [rfqs, setRFQs] = useState<RFQ[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedEscrow, setSelectedEscrow] = useState<Escrow | null>(null);
  const [releaseReason, setReleaseReason] = useState('');

  useEffect(() => {
    loadData();
    initializeEscrows();
  }, []);

  const loadData = () => {
    setEscrows(storage.getEscrows());
    setPharmacyOrders(storage.getPharmacyOrders());
    setSeptraOrders(storage.getSeptraOrders());
    setRFQs(storage.getRFQs());
    setPharmacies(storage.getPharmacies());
  };

  const initializeEscrows = () => {
    // Create escrow entries for confirmed pharmacy orders that don't have escrows yet
    const confirmedOrders = storage.getPharmacyOrders().filter(po => po.status === 'confirmed');
    const existingEscrows = storage.getEscrows();
    
    const newEscrows: Escrow[] = [];
    confirmedOrders.forEach(order => {
      const hasEscrow = existingEscrows.some(e => 
        e.rfqId === order.rfqId && e.pharmacyId === order.pharmacyId
      );
      
      if (!hasEscrow) {
        const newEscrow: Escrow = {
          id: `escrow_${Date.now()}_${order.pharmacyId}`,
          rfqId: order.rfqId,
          pharmacyId: order.pharmacyId,
          amount: order.totalValue,
          status: Math.random() > 0.5 ? 'funded' : 'not_funded', // Mock some as funded
          fundedAt: Math.random() > 0.5 ? new Date() : undefined
        };
        newEscrows.push(newEscrow);
      }
    });
    
    if (newEscrows.length > 0) {
      storage.setEscrows([...existingEscrows, ...newEscrows]);
      loadData();
    }
  };

  const getPharmacyName = (pharmacyId: string) => {
    const pharmacy = pharmacies.find(p => p.id === pharmacyId);
    return pharmacy?.name || pharmacyId;
  };

  const getRFQ = (rfqId: string): RFQ | undefined => {
    return rfqs.find(r => r.id === rfqId);
  };

  const getSeptraOrderFromRFQ = (rfqId: string): SeptraOrder | undefined => {
    const rfq = getRFQ(rfqId);
    if (!rfq) return undefined;
    return septraOrders.find(o => o.id === rfq.septraOrderId);
  };

  const getOrderTitle = (rfqId: string): string => {
    const rfq = getRFQ(rfqId);
    const septraOrder = getSeptraOrderFromRFQ(rfqId);
    return rfq?.title || septraOrder?.title || `Order ${rfqId.slice(-8)}`;
  };

  const getStatusColor = (status: Escrow['status']) => {
    switch (status) {
      case 'funded':
        return 'bg-blue-100 text-blue-800';
      case 'released':
        return 'bg-green-100 text-green-800';
      case 'refunded':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Escrow['status']) => {
    switch (status) {
      case 'funded':
        return <Shield className="h-3 w-3" />;
      case 'released':
        return <CheckCircle className="h-3 w-3" />;
      case 'refunded':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <DollarSign className="h-3 w-3" />;
    }
  };

  const fundEscrow = (escrowId: string) => {
    const updatedEscrows = escrows.map(e => 
      e.id === escrowId 
        ? { ...e, status: 'funded' as const, fundedAt: new Date() }
        : e
    );
    storage.setEscrows(updatedEscrows);
    loadData();
    toast.info('Pharmacy and supplier have been notified of escrow funding');
    toast.success('Escrow funded successfully');
  };

  const releaseEscrow = () => {
    if (!selectedEscrow) return;

    const updatedEscrows = escrows.map(e => 
      e.id === selectedEscrow.id 
        ? { 
            ...e, 
            status: 'released' as const, 
            releasedAt: new Date(),
            reason: releaseReason || 'Order completed successfully'
          }
        : e
    );
    storage.setEscrows(updatedEscrows);
    loadData();
    setSelectedEscrow(null);
    setReleaseReason('');
    toast.info('Supplier has been notified of payment release');
    toast.success('Escrow released successfully');
  };

  const refundEscrow = () => {
    if (!selectedEscrow) return;

    const updatedEscrows = escrows.map(e => 
      e.id === selectedEscrow.id 
        ? { 
            ...e, 
            status: 'refunded' as const, 
            refundedAt: new Date(),
            reason: releaseReason || 'Order cancelled or issue resolved'
          }
        : e
    );
    storage.setEscrows(updatedEscrows);
    loadData();
    setSelectedEscrow(null);
    setReleaseReason('');
    toast.info('Pharmacy has been notified of refund processing');
    toast.success('Escrow refunded successfully');
  };

  const getEscrowsByStatus = (status: Escrow['status']) => {
    return escrows.filter(e => e.status === status);
  };

  const totalEscrowValue = escrows.reduce((sum, e) => sum + e.amount, 0);
  const fundedEscrowValue = getEscrowsByStatus('funded').reduce((sum, e) => sum + e.amount, 0);
  const releasedEscrowValue = getEscrowsByStatus('released').reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Escrow Management</h2>
        <p className="text-gray-600 mt-1">
          Manage secure payment escrows for confirmed pharmacy orders
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEscrowValue.toLocaleString()}</div>
            <p className="text-sm text-gray-600">
              across {escrows.length} escrows
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Funded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${fundedEscrowValue.toLocaleString()}</div>
            <p className="text-sm text-gray-600">
              {getEscrowsByStatus('funded').length} funded escrows
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Released
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${releasedEscrowValue.toLocaleString()}</div>
            <p className="text-sm text-gray-600">
              {getEscrowsByStatus('released').length} completed payments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Pending Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getEscrowsByStatus('not_funded').length + getEscrowsByStatus('funded').length}
            </div>
            <p className="text-sm text-gray-600">
              require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {escrows.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No escrows created</h3>
              <p className="text-gray-600">
                Escrows will be created automatically when pharmacy orders are confirmed
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Escrow Accounts</CardTitle>
            <CardDescription>
              Manage secure payment escrows for all confirmed orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pharmacy</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Funded</TableHead>
                  <TableHead>Released/Refunded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escrows.map((escrow) => (
                  <TableRow key={escrow.id}>
                    <TableCell>
                      <div className="font-medium">
                        {getPharmacyName(escrow.pharmacyId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {getSeptraOrderTitle(escrow.septraOrderId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-lg">
                        ${escrow.amount.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`flex items-center space-x-1 w-fit ${getStatusColor(escrow.status)}`}>
                        {getStatusIcon(escrow.status)}
                        <span className="capitalize">{escrow.status.replace('_', ' ')}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {escrow.fundedAt ? (
                        <div className="text-sm">
                          <div>{new Date(escrow.fundedAt).toLocaleDateString()}</div>
                          <div className="text-gray-500">{new Date(escrow.fundedAt).toLocaleTimeString()}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {escrow.releasedAt && (
                        <div className="text-sm">
                          <div className="text-green-600">Released</div>
                          <div className="text-gray-500">{new Date(escrow.releasedAt).toLocaleDateString()}</div>
                        </div>
                      )}
                      {escrow.refundedAt && (
                        <div className="text-sm">
                          <div className="text-red-600">Refunded</div>
                          <div className="text-gray-500">{new Date(escrow.refundedAt).toLocaleDateString()}</div>
                        </div>
                      )}
                      {!escrow.releasedAt && !escrow.refundedAt && (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {escrow.status === 'not_funded' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fundEscrow(escrow.id)}
                          >
                            Fund
                          </Button>
                        )}
                        {escrow.status === 'funded' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedEscrow(escrow)}
                              >
                                Release
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Release Escrow</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="p-4 bg-blue-50 rounded-lg">
                                  <h4 className="font-medium text-blue-900 mb-2">Escrow Details</h4>
                                  <div className="text-sm text-blue-700 space-y-1">
                                    <p><span className="font-medium">Pharmacy:</span> {getPharmacyName(escrow.pharmacyId)}</p>
                                    <p><span className="font-medium">Order:</span> {getSeptraOrderTitle(escrow.septraOrderId)}</p>
                                    <p><span className="font-medium">Amount:</span> ${escrow.amount.toFixed(2)}</p>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Release Reason</Label>
                                  <Textarea
                                    value={releaseReason}
                                    onChange={(e) => setReleaseReason(e.target.value)}
                                    placeholder="Reason for releasing escrow (optional)"
                                    rows={3}
                                  />
                                </div>

                                <div className="flex justify-end space-x-2">
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setSelectedEscrow(null);
                                      setReleaseReason('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button variant="destructive" onClick={refundEscrow}>
                                    Refund
                                  </Button>
                                  <Button onClick={releaseEscrow}>
                                    Release
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
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