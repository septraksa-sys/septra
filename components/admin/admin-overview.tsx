'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { storage } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Package, Users, Building2, TrendingUp, 
  DollarSign, Clock, CheckCircle, AlertTriangle 
} from 'lucide-react';

interface AdminOverviewProps {
  user: User;
}

export function AdminOverview({ user }: AdminOverviewProps) {
  const [stats, setStats] = useState({
    totalDemands: 0,
    submittedDemands: 0,
    totalPharmacies: 0,
    activePharmacies: 0,
    totalSuppliers: 0,
    totalOrders: 0,
    completedOrders: 0,
    totalValue: 0,
    avgSavings: 0
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = () => {
    const demands = storage.getPharmacyDemands();
    const pharmacies = storage.getPharmacies();
    const suppliers = storage.getSuppliers();
    const septraOrders = storage.getSeptraOrders();
    const bids = storage.getBids();
    const pharmacyOrders = storage.getPharmacyOrders();

    // Calculate active pharmacies (those with submitted demands)
    const activePharmacyIds = new Set(
      demands.filter(d => d.status === 'submitted').map(d => d.pharmacyId)
    );

    // Calculate total value from completed orders
    const completedOrders = septraOrders.filter(o => o.status === 'completed');
    const totalValue = completedOrders.reduce((sum, order) => sum + (order.totalValue || 0), 0);

    // Calculate average savings (mock calculation)
    const avgSavings = 15.5; // Mock 15.5% average savings

    setStats({
      totalDemands: demands.length,
      submittedDemands: demands.filter(d => d.status === 'submitted').length,
      totalPharmacies: pharmacies.length,
      activePharmacies: activePharmacyIds.size,
      totalSuppliers: suppliers.length,
      totalOrders: septraOrders.length,
      completedOrders: completedOrders.length,
      totalValue,
      avgSavings
    });

    // Generate recent activity
    const activities = [
      ...demands.slice(-3).map(d => ({
        id: d.id,
        type: 'demand',
        message: `New demand submitted for ${d.quantity} units`,
        timestamp: d.createdAt,
        status: d.status
      })),
      ...bids.slice(-3).map(b => ({
        id: b.id,
        type: 'bid',
        message: `New bid received at $${b.unitPrice.toFixed(2)}/unit`,
        timestamp: b.submittedAt,
        status: b.status
      })),
      ...pharmacyOrders.slice(-2).map(o => ({
        id: o.id,
        type: 'order',
        message: `Order ${o.status} - $${o.totalValue.toFixed(2)}`,
        timestamp: o.confirmedAt || new Date(),
        status: o.status
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);

    setRecentActivity(activities);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'demand':
        return Package;
      case 'bid':
        return TrendingUp;
      case 'order':
        return CheckCircle;
      default:
        return Clock;
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'confirmed':
      case 'awarded':
        return 'text-green-600';
      case 'pending':
      case 'draft':
        return 'text-yellow-600';
      case 'declined':
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const orderCompletionRate = stats.totalOrders > 0 ? (stats.completedOrders / stats.totalOrders) * 100 : 0;
  const pharmacyParticipationRate = stats.totalPharmacies > 0 ? (stats.activePharmacies / stats.totalPharmacies) * 100 : 0;
  const demandSubmissionRate = stats.totalDemands > 0 ? (stats.submittedDemands / stats.totalDemands) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Platform Overview</h2>
        <p className="text-gray-600 mt-1">
          Monitor key metrics and recent activity across the Septra platform
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Demands</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDemands}</div>
            <p className="text-xs text-muted-foreground">
              {stats.submittedDemands} submitted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Pharmacies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePharmacies}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.totalPharmacies} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.avgSavings}% avg savings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              registered suppliers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Completion Rate</CardTitle>
            <CardDescription>
              Orders completed successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completed</span>
                <span>{stats.completedOrders} / {stats.totalOrders}</span>
              </div>
              <Progress value={orderCompletionRate} className="h-2" />
              <p className="text-xs text-gray-600">
                {orderCompletionRate.toFixed(1)}% completion rate
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pharmacy Participation</CardTitle>
            <CardDescription>
              Pharmacies actively submitting demands
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active</span>
                <span>{stats.activePharmacies} / {stats.totalPharmacies}</span>
              </div>
              <Progress value={pharmacyParticipationRate} className="h-2" />
              <p className="text-xs text-gray-600">
                {pharmacyParticipationRate.toFixed(1)}% participation rate
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Demand Submission</CardTitle>
            <CardDescription>
              Demands successfully submitted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Submitted</span>
                <span>{stats.submittedDemands} / {stats.totalDemands}</span>
              </div>
              <Progress value={demandSubmissionRate} className="h-2" />
              <p className="text-xs text-gray-600">
                {demandSubmissionRate.toFixed(1)}% submission rate
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>
            Latest updates across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Icon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={getActivityColor(activity.status)}>
                      {activity.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}