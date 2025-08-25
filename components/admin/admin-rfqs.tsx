'use client';

import { useState, useEffect } from 'react';
import { User, RFQ, SeptraOrder } from '@/types';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Send, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AdminRFQsProps {
  user: User;
}

export function AdminRFQs({ user }: AdminRFQsProps) {
  const [rfqs, setRFQs] = useState<RFQ[]>([]);
  const [septraOrders, setSeptraOrders] = useState<SeptraOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SeptraOrder | null>(null);
  const [rfqForm, setRFQForm] = useState({
    title: '',
    description: '',
    biddingDeadline: '',
    deliveryRequirement: '',
    terms: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const rfqs = storage.getRFQs().map(rfq => ({
      ...rfq,
      publishedAt: new Date(rfq.publishedAt),
      biddingDeadline: new Date(rfq.biddingDeadline),
      deliveryRequirement: rfq.deliveryRequirement ? new Date(rfq.deliveryRequirement) : undefined
    }));
    setRFQs(rfqs);
    setSeptraOrders(storage.getSeptraOrders());
  };

  const getOrdersEligibleForRFQ = () => {
    return septraOrders.filter(order => 
      order.status === 'draft' && !rfqs.some(rfq => rfq.septraOrderId === order.id)
    );
  };

  const getSeptraOrder = (septraOrderId: string) => {
    return septraOrders.find(o => o.id === septraOrderId);
  };

  const publishRFQ = () => {
    if (!selectedOrder || !rfqForm.title || !rfqForm.biddingDeadline) {
      toast.error('Please fill in required fields');
      return;
    }

    const newRFQ: RFQ = {
      id: `rfq_${Date.now()}`,
      septraOrderId: selectedOrder.id,
      title: rfqForm.title,
      description: rfqForm.description,
      publishedAt: new Date(),
      biddingDeadline: new Date(rfqForm.biddingDeadline),
      deliveryRequirement: rfqForm.deliveryRequirement ? new Date(rfqForm.deliveryRequirement) : undefined,
      terms: rfqForm.terms,
      status: 'open'
    };

    // Save RFQ
    const allRFQs = storage.getRFQs();
    storage.setRFQs([...allRFQs, newRFQ]);

    // Update Septra Order status
    const updatedOrders = septraOrders.map(o => 
      o.id === selectedOrder.id 
        ? { ...o, status: 'rfq_open' as const, publishedAt: new Date(), updatedAt: new Date() }
        : o
    );
    storage.setSeptraOrders(updatedOrders);

    loadData();
    setSelectedOrder(null);
    setRFQForm({
      title: '',
      description: '',
      biddingDeadline: '',
      deliveryRequirement: '',
      terms: ''
    });

    toast.success('RFQ published successfully');
  };

  const closeBidding = (rfqId: string) => {
    const allRFQs = storage.getRFQs();
    const updatedRFQs = allRFQs.map(r => 
      r.id === rfqId ? { ...r, status: 'closed' as const } : r
    );
    storage.setRFQs(updatedRFQs);

    // Update corresponding Septra Order
    const rfq = allRFQs.find(r => r.id === rfqId);
    if (rfq) {
      const updatedOrders = septraOrders.map(o => 
        o.id === rfq.septraOrderId 
          ? { ...o, status: 'bidding_closed' as const, updatedAt: new Date() }
          : o
      );
      storage.setSeptraOrders(updatedOrders);
    }

    loadData();
    toast.success('Bidding closed successfully');
  };

  const getStatusColor = (status: RFQ['status']) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-orange-100 text-orange-800';
      case 'awarded':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: RFQ['status']) => {
    switch (status) {
      case 'open':
        return <Clock className="h-3 w-3" />;
      case 'closed':
        return <FileText className="h-3 w-3" />;
      case 'awarded':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const isDeadlinePassed = (deadline: Date) => {
    return new Date() > deadline;
  };

  const formatTimeLeft = (deadline: Date) => {
    const now = new Date();
    const timeLeft = deadline.getTime() - now.getTime();
    
    if (timeLeft <= 0) return 'Expired';
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else {
      return `${hours}h`;
    }
  };

  const eligibleOrders = getOrdersEligibleForRFQ();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage RFQs</h2>
          <p className="text-gray-600 mt-1">
            Publish and manage Request for Quotations from Septra Orders
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button disabled={eligibleOrders.length === 0}>
              <Send className="h-4 w-4 mr-2" />
              Publish RFQ
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Publish New RFQ</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Septra Order</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedOrder?.id || ''}
                  onChange={(e) => {
                    const order = septraOrders.find(o => o.id === e.target.value);
                    setSelectedOrder(order || null);
                    if (order) {
                      setRFQForm(prev => ({
                        ...prev,
                        title: `RFQ - ${order.title}`,
                        description: order.description || ''
                      }));
                    }
                  }}
                >
                  <option value="">Select an order</option>
                  {eligibleOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.title} ({order.lines.length} lines)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>RFQ Title *</Label>
                <Input
                  value={rfqForm.title}
                  onChange={(e) => setRFQForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="RFQ title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={rfqForm.description}
                  onChange={(e) => setRFQForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="RFQ description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bidding Deadline *</Label>
                  <Input
                    type="datetime-local"
                    value={rfqForm.biddingDeadline}
                    onChange={(e) => setRFQForm(prev => ({ ...prev, biddingDeadline: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Delivery Requirement</Label>
                  <Input
                    type="datetime-local"
                    value={rfqForm.deliveryRequirement}
                    onChange={(e) => setRFQForm(prev => ({ ...prev, deliveryRequirement: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Terms & Conditions</Label>
                <Textarea
                  value={rfqForm.terms}
                  onChange={(e) => setRFQForm(prev => ({ ...prev, terms: e.target.value }))}
                  placeholder="Payment terms, quality requirements, etc."
                  rows={3}
                />
              </div>

              {selectedOrder && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-2">Order Summary</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Lines:</span> {selectedOrder.lines.length}</p>
                    <p><span className="font-medium">Total Quantity:</span> {selectedOrder.lines.reduce((sum, line) => sum + line.totalQuantity, 0)} units</p>
                    <p><span className="font-medium">Pharmacies:</span> {new Set(selectedOrder.lines.flatMap(line => line.demandBreakdown.map(d => d.pharmacyId))).size}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                  Cancel
                </Button>
                <Button onClick={publishRFQ}>
                  Publish RFQ
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rfqs.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No RFQs published</h3>
              <p className="text-gray-600">
                Publish your first RFQ from a completed Septra Order
              </p>
              {eligibleOrders.length > 0 && (
                <p className="text-sm text-blue-600 mt-2">
                  {eligibleOrders.length} order(s) ready for RFQ
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Open RFQs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {rfqs.filter(r => r.status === 'open').length}
                </div>
                <p className="text-sm text-gray-600">
                  accepting bids
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Closed RFQs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {rfqs.filter(r => r.status === 'closed').length}
                </div>
                <p className="text-sm text-gray-600">
                  bidding closed
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Awarded RFQs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {rfqs.filter(r => r.status === 'awarded').length}
                </div>
                <p className="text-sm text-gray-600">
                  contracts awarded
                </p>
              </CardContent>
            </Card>
          </div>

          {/* RFQs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Published RFQs</CardTitle>
              <CardDescription>
                Manage your published Request for Quotations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFQ Title</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bidding Deadline</TableHead>
                    <TableHead>Time Left</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rfqs.map((rfq) => {
                    const septraOrder = getSeptraOrder(rfq.septraOrderId);
                    const deadlinePassed = isDeadlinePassed(rfq.biddingDeadline);
                    return (
                      <TableRow key={rfq.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{rfq.title}</div>
                            {rfq.description && (
                              <div className="text-sm text-gray-500 mt-1">{rfq.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {septraOrder?.title || 'Unknown Order'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {septraOrder?.lines.length || 0} lines
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`flex items-center space-x-1 w-fit ${getStatusColor(rfq.status)}`}>
                            {getStatusIcon(rfq.status)}
                            <span className="capitalize">{rfq.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className={deadlinePassed && rfq.status === 'open' ? 'text-red-600' : ''}>
                            {rfq.biddingDeadline.toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {rfq.biddingDeadline.toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={deadlinePassed ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {formatTimeLeft(rfq.biddingDeadline)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {rfq.status === 'open' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => closeBidding(rfq.id)}
                            >
                              Close Bidding
                            </Button>
                          )}
                          {rfq.status === 'closed' && (
                            <Badge variant="outline" className="text-orange-600">
                              Ready for Award
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}