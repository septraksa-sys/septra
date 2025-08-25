'use client';

import { useState, useEffect } from 'react';
import { User, PharmacyOrder, LogisticsEntry, Escrow, SeptraOrder } from '@/types';
import { storage } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Truck, Package, MapPin, DollarSign, Clock, CheckCircle } from 'lucide-react';

interface PharmacyTrackingProps {
  user: User;
}

export function PharmacyTracking({ user }: PharmacyTrackingProps) {
  const [pharmacyOrders, setPharmacyOrders] = useState<PharmacyOrder[]>([]);
  const [logistics, setLogistics] = useState<LogisticsEntry[]>([]);
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [septraOrders, setSeptraOrders] = useState<SeptraOrder[]>([]);

  useEffect(() => {
    loadData();
  }, [user.profileId]);

  const loadData = () => {
    const allPharmacyOrders = storage.getPharmacyOrders();
    const myOrders = allPharmacyOrders.filter(o => o.pharmacyId === user.profileId && o.status === 'confirmed');
    setPharmacyOrders(myOrders);

    const allLogistics = storage.getLogisticsEntries();
    const myLogistics = allLogistics.filter(l => l.pharmacyId === user.profileId);
    setLogistics(myLogistics);

    const allEscrows = storage.getEscrows();
    const myEscrows = allEscrows.filter(e => e.pharmacyId === user.profileId);
    setEscrows(myEscrows);

    setSeptraOrders(storage.getSeptraOrders());
  };

  const getSeptraOrder = (septraOrderId: string) => {
    return septraOrders.find(o => o.id === septraOrderId);
  };

  const getOrderLogistics = (septraOrderId: string) => {
    return logistics.filter(l => l.septraOrderId === septraOrderId);
  };

  const getOrderEscrow = (septraOrderId: string) => {
    return escrows.find(e => e.septraOrderId === septraOrderId);
  };

  const getLogisticsProgress = (status: LogisticsEntry['status']) => {
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

  const getLogisticsStatusColor = (status: LogisticsEntry['status']) => {
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

  const getEscrowStatusColor = (status: Escrow['status']) => {
    switch (status) {
      case 'released':
        return 'bg-green-100 text-green-800';
      case 'funded':
        return 'bg-blue-100 text-blue-800';
      case 'refunded':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Order Tracking</h2>
        <p className="text-gray-600 mt-1">
          Track the delivery status and escrow payments for your confirmed orders
        </p>
      </div>

      {pharmacyOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No active deliveries</h3>
              <p className="text-gray-600">
                Once you confirm orders, tracking information will appear here
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pharmacyOrders.map((order) => {
            const septraOrder = getSeptraOrder(order.septraOrderId);
            const orderLogistics = getOrderLogistics(order.septraOrderId);
            const escrow = getOrderEscrow(order.septraOrderId);

            return (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {septraOrder?.title || `Order ${order.id.slice(-8)}`}
                      </CardTitle>
                      <CardDescription>
                        Total Value: ${order.totalValue.toFixed(2)}
                      </CardDescription>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Confirmed
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Escrow Status */}
                  {escrow && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium flex items-center">
                          <DollarSign className="h-4 w-4 mr-2" />
                          Escrow Status
                        </h4>
                        <Badge className={getEscrowStatusColor(escrow.status)}>
                          {escrow.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Amount:</span> ${escrow.amount.toFixed(2)}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span> {escrow.status.replace('_', ' ')}
                        </div>
                        {escrow.fundedAt && (
                          <div>
                            <span className="font-medium">Funded:</span> {new Date(escrow.fundedAt).toLocaleDateString()}
                          </div>
                        )}
                        {escrow.releasedAt && (
                          <div>
                            <span className="font-medium">Released:</span> {new Date(escrow.releasedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Logistics Tracking */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center">
                      <Truck className="h-4 w-4 mr-2" />
                      Delivery Tracking
                    </h4>
                    
                    {orderLogistics.length === 0 ? (
                      <div className="text-center py-6 text-gray-500">
                        <Clock className="h-8 w-8 mx-auto mb-2" />
                        <p>Waiting for shipment assignment</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orderLogistics.map((logistic) => (
                          <div key={logistic.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <Package className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">
                                  {logistic.trackingNumber || 'Tracking number pending'}
                                </span>
                              </div>
                              <Badge className={getLogisticsStatusColor(logistic.status)}>
                                {logistic.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            <div className="mb-4">
                              <div className="flex justify-between text-sm mb-2">
                                <span>Delivery Progress</span>
                                <span>{getLogisticsProgress(logistic.status)}%</span>
                              </div>
                              <Progress value={getLogisticsProgress(logistic.status)} className="h-2" />
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                              {logistic.shipmentDate && (
                                <div>
                                  <span className="font-medium">Shipped:</span> {new Date(logistic.shipmentDate).toLocaleDateString()}
                                </div>
                              )}
                              {logistic.estimatedDelivery && (
                                <div>
                                  <span className="font-medium">Est. Delivery:</span> {new Date(logistic.estimatedDelivery).toLocaleDateString()}
                                </div>
                              )}
                              {logistic.actualDelivery && (
                                <div>
                                  <span className="font-medium">Delivered:</span> {new Date(logistic.actualDelivery).toLocaleDateString()}
                                </div>
                              )}
                              {logistic.notes && (
                                <div className="col-span-2">
                                  <span className="font-medium">Notes:</span> {logistic.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Delivery Address */}
                  {order.deliveryAddress && (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium flex items-center mb-2">
                        <MapPin className="h-4 w-4 mr-2" />
                        Delivery Address
                      </h4>
                      <p className="text-gray-600">{order.deliveryAddress}</p>
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