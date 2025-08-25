import { useState } from 'react';
import { AdminEscrow } from '@/components/admin/admin-escrow';
import { AdminLogistics } from '@/components/admin/admin-logistics';
import { AdminAnalytics } from '@/components/admin/admin-analytics';
import { AdminSKUEngine } from '@/components/admin/admin-sku-engine';
import { AdminOverview } from '@/components/admin/admin-overview';
import { AdminDemands } from '@/components/admin/admin-demands';
import { AdminOrders } from '@/components/admin/admin-orders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, Package, FileText, TrendingUp, 
  ShoppingCart, Shield, Truck, Activity, Database 
} from 'lucide-react';

interface AdminDashboardProps {
  user: any;
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
      icon: TrendingUp,
      component: AdminAnalytics
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {user?.name || 'Administrator'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Activity className="w-4 h-4" />
              <span>System Status: Online</span>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
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
                    className={`
                      flex flex-col items-center justify-center gap-1 p-3 rounded-xl transition-all duration-200
                      ${isActive 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                        : 'hover:bg-white/50 text-gray-600'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {tabs.map((tab) => {
            const Component = tab.component;
            return (
              <TabsContent key={tab.id} value={tab.id} className="mt-8">
                <Component user={user} />
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}