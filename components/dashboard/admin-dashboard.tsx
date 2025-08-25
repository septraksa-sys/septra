'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { User } from '@/types';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AdminDemands } from '@/components/admin/admin-demands';
import { AdminRFQs } from '@/components/admin/admin-rfqs';
import { AdminBids } from '@/components/admin/admin-bids';
import { AdminOrders } from '@/components/admin/admin-orders';
import { AdminEscrow } from '@/components/admin/admin-escrow';
import { AdminLogistics } from '@/components/admin/admin-logistics';
import { AdminSKUEngine } from '@/components/admin/admin-sku-engine';
import { AdminOverview } from '@/components/admin/admin-overview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, Package, FileText, TrendingUp, 
  ShoppingCart, Shield, Truck, Activity, Database 
} from 'lucide-react';

const AdminAnalytics = dynamic(() => import('@/components/admin/admin-analytics').then(mod => ({ default: mod.AdminAnalytics })), {
  ssr: false
});

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: BarChart3,
      component: AdminOverview
    },
    {
      id: 'sku-engine',
      label: 'SKU Engine',
      icon: Database,
      component: AdminSKUEngine
    },
    {
      id: 'demands',
      label: 'Aggregate',
      icon: Package,
      component: AdminDemands
    },
    {
      id: 'rfqs',
      label: 'RFQs',
      icon: FileText,
      component: AdminRFQs
    },
    {
      id: 'bids',
      label: 'Bids',
      icon: TrendingUp,
      component: AdminBids
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingCart,
      component: AdminOrders
    },
    {
      id: 'escrow',
      label: 'Escrow',
      icon: Shield,
      component: AdminEscrow
    },
    {
      id: 'logistics',
      label: 'Logistics',
      icon: Truck,
      component: AdminLogistics
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: Activity,
      component: AdminAnalytics
    }
  ];

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="p-6 space-y-8">
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1 text-lg">
                Manage the complete order lifecycle from demand to delivery
              </p>
            </div>
          </div>
          <div className="h-1 w-24 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-white/20">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9 h-14 bg-transparent gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={`flex items-center space-x-1 lg:space-x-2 h-12 text-xs lg:text-sm rounded-xl transition-all duration-200 ${
                      isActive 
                        ? 'bg-white shadow-md text-indigo-600 font-semibold' 
                        : 'hover:bg-white/50 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`h-3 w-3 lg:h-4 lg:w-4 ${isActive ? 'text-indigo-600' : ''}`} />
                    <span className="hidden sm:inline">{tab.label}</span>
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