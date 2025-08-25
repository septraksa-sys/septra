'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PharmacyDemands } from '@/components/pharmacy/pharmacy-demands';
import { PharmacyOrders } from '@/components/pharmacy/pharmacy-orders';
import { PharmacyTracking } from '@/components/pharmacy/pharmacy-tracking';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ShoppingCart, TruckIcon, Building2 } from 'lucide-react';

interface PharmacyDashboardProps {
  user: User;
  onLogout: () => void;
}

export function PharmacyDashboard({ user, onLogout }: PharmacyDashboardProps) {
  const [activeTab, setActiveTab] = useState('demands');

  const tabs = [
    {
      id: 'demands',
      label: 'Submit Demands',
      icon: Package,
      component: PharmacyDemands
    },
    {
      id: 'orders',
      label: 'My Orders',
      icon: ShoppingCart,
      component: PharmacyOrders
    },
    {
      id: 'tracking',
      label: 'Order Tracking',
      icon: TruckIcon,
      component: PharmacyTracking
    }
  ];

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="p-6 space-y-8">
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Pharmacy Dashboard
              </h1>
              <p className="text-gray-600 mt-1 text-lg">
                Submit demands, manage orders, and track deliveries
              </p>
            </div>
          </div>
          <div className="h-1 w-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
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
                        ? 'bg-white shadow-md text-green-600 font-semibold' 
                        : 'hover:bg-white/50 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-green-600' : ''}`} />
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
                <Component user={user} />
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}