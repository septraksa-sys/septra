'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { SupplierRFQs } from '@/components/supplier/supplier-rfqs';
import { SupplierBids } from '@/components/supplier/supplier-bids';
import { SupplierOrders } from '@/components/supplier/supplier-orders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileText, TrendingUp, Truck, RefreshCw, Package } from 'lucide-react';

interface SupplierDashboardProps {
  user: User;
  onLogout: () => void;
}

export function SupplierDashboard({ user, onLogout }: SupplierDashboardProps) {
  const [activeTab, setActiveTab] = useState('rfqs');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const tabs = [
    {
      id: 'rfqs',
      label: 'Open RFQs',
      icon: FileText,
      component: SupplierRFQs
    },
    {
      id: 'bids',
      label: 'My Bids',
      icon: TrendingUp,
      component: SupplierBids
    },
    {
      id: 'orders',
      label: 'My Orders',
      icon: Truck,
      component: SupplierOrders
    }
  ];

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="p-6 space-y-8">
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Supplier Dashboard
              </h1>
              <p className="text-gray-600 mt-1 text-lg">
                View RFQs, submit bids, and manage order fulfillment
              </p>
            </div>
          </div>
          <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
          <Button 
            variant="outline"
            size="sm" 
            onClick={handleRefresh}
            className="mt-4 hover:bg-blue-50 border-blue-200 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-white/20">
            <TabsList className="grid w-full grid-cols-3 h-14 bg-transparent gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={`flex items-center space-x-2 h-12 rounded-xl transition-all duration-200 ${
                      isActive 
                        ? 'bg-white shadow-md text-blue-600 font-semibold' 
                        : 'hover:bg-white/50 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : ''}`} />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {tabs.map((tab) => {
            const Component = tab.component;
            return (
              <TabsContent key={tab.id} value={tab.id} className="space-y-6 animate-fade-in">
                <Component key={refreshKey} user={user} />
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}