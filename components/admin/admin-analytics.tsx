'use client';

import { useState, useEffect } from 'react';
import { User, Analytics } from '@/types';
import { storage } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, DollarSign, Users, Star, 
  Package, Clock, CheckCircle, AlertTriangle 
} from 'lucide-react';

interface AdminAnalyticsProps {
  user: User;
}

export function AdminAnalytics({ user }: AdminAnalyticsProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    calculateAnalytics();
  }, [timeRange]);

  const calculateAnalytics = () => {
    const septraOrders = storage.getSeptraOrders();
    const pharmacyOrders = storage.getPharmacyOrders();
    const suppliers = storage.getSuppliers();
    const pharmacies = storage.getPharmacies();
    const bids = storage.getBids();
    const logistics = storage.getLogisticsEntries();

    // Calculate total orders and value
    const completedOrders = septraOrders.filter(o => o.status === 'completed');
    const totalOrders = septraOrders.length;
    const totalValue = completedOrders.reduce((sum, order) => sum + (order.totalValue || 0), 0);

    // Mock average savings calculation (15-20% typical)
    const avgSavings = 17.3;

    // Supplier performance metrics
    const supplierPerformance = suppliers.map(supplier => {
      const supplierBids = bids.filter(b => b.supplierId === supplier.id);
      const awardedBids = supplierBids.filter(b => b.status === 'awarded');
      const supplierLogistics = logistics.filter(l => l.supplierId === supplier.id);
      const deliveredOnTime = supplierLogistics.filter(l => 
        l.status === 'delivered' && 
        l.actualDelivery && 
        l.estimatedDelivery &&
        new Date(l.actualDelivery) <= new Date(l.estimatedDelivery)
      ).length;

      return {
        supplierId: supplier.id,
        name: supplier.name,
        onTimeDelivery: supplierLogistics.length > 0 ? (deliveredOnTime / supplierLogistics.length) * 100 : 0,
        qualityScore: supplier.rating * 20, // Convert 5-star to 100 scale
        responseTime: Math.random() * 24, // Mock response time in hours
        totalBids: supplierBids.length,
        awardedBids: awardedBids.length,
        winRate: supplierBids.length > 0 ? (awardedBids.length / supplierBids.length) * 100 : 0
      };
    });

    // Pharmacy participation metrics
    const pharmacyParticipation = pharmacies.map(pharmacy => {
      const pharmacyOrdersForPharmacy = pharmacyOrders.filter(po => po.pharmacyId === pharmacy.id);
      const totalOrderValue = pharmacyOrdersForPharmacy.reduce((sum, po) => sum + po.totalValue, 0);

      return {
        pharmacyId: pharmacy.id,
        name: pharmacy.name,
        totalOrders: pharmacyOrdersForPharmacy.length,
        totalValue: totalOrderValue
      };
    });

    setAnalytics({
      totalOrders,
      totalValue,
      avgSavings,
      supplierPerformance,
      pharmacyParticipation
    });
  };

  const generateChartData = () => {
    if (!analytics) return { orderTrend: [], categoryBreakdown: [], statusDistribution: [] };

    // Mock order trend data
    const orderTrend = [
      { month: 'Jan', orders: 5, value: 125000 },
      { month: 'Feb', orders: 8, value: 180000 },
      { month: 'Mar', orders: 12, value: 245000 },
      { month: 'Apr', orders: 15, value: 320000 },
      { month: 'May', orders: 18, value: 380000 },
      { month: 'Jun', orders: 22, value: 450000 },
    ];

    // Category breakdown
    const skus = storage.getSKUs();
    const categoryGroups = skus.reduce((acc: { [key: string]: number }, sku) => {
      acc[sku.category] = (acc[sku.category] || 0) + 1;
      return acc;
    }, {});

    const categoryBreakdown = Object.entries(categoryGroups).map(([category, count]) => ({
      category,
      count,
      value: count * 50000 // Mock value
    }));

    // Status distribution
    const septraOrders = storage.getSeptraOrders();
    const statusGroups = septraOrders.reduce((acc: { [key: string]: number }, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const statusDistribution = Object.entries(statusGroups).map(([status, count]) => ({
      status: status.replace('_', ' '),
      count,
      percentage: (count / septraOrders.length) * 100
    }));

    return { orderTrend, categoryBreakdown, statusDistribution };
  };

  const { orderTrend, categoryBreakdown, statusDistribution } = generateChartData();

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Platform Analytics</h2>
        <p className="text-gray-600 mt-1">
          Comprehensive insights into platform performance and user behavior
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +8% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgSavings}%</div>
            <p className="text-xs text-muted-foreground">
              vs individual purchasing
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.pharmacyParticipation.filter(p => p.totalOrders > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              participating pharmacies
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="pharmacies">Pharmacies</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Order Trend</CardTitle>
                <CardDescription>Monthly order volume and value</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={orderTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Distribution by product category</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percentage }) => `${category} (${percentage?.toFixed(0) || 0}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status Distribution</CardTitle>
              <CardDescription>Current status of all orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusDistribution.map((status, index) => (
                  <div key={status.status} className="flex items-center space-x-4">
                    <div className="w-24 text-sm font-medium capitalize">{status.status}</div>
                    <div className="flex-1">
                      <Progress value={status.percentage} className="h-2" />
                    </div>
                    <div className="w-16 text-sm text-gray-600">
                      {status.count} ({status.percentage.toFixed(1)}%)
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Performance</CardTitle>
              <CardDescription>
                Key performance metrics for all registered suppliers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Total Bids</TableHead>
                    <TableHead>Win Rate</TableHead>
                    <TableHead>On-Time Delivery</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.supplierPerformance.map((supplier) => (
                    <TableRow key={supplier.supplierId}>
                      <TableCell>
                        <div className="font-medium">{supplier.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span>{(supplier.qualityScore / 20).toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{supplier.totalBids}</span>
                          <div className="text-sm text-gray-500">
                            {supplier.awardedBids} awarded
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-16">
                            <Progress value={supplier.winRate} className="h-2" />
                          </div>
                          <span className="text-sm">{supplier.winRate.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-16">
                            <Progress value={supplier.onTimeDelivery} className="h-2" />
                          </div>
                          <span className="text-sm">{supplier.onTimeDelivery.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {supplier.responseTime.toFixed(1)}h
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          supplier.qualityScore >= 80 ? 'default' :
                          supplier.qualityScore >= 60 ? 'secondary' :
                          'destructive'
                        }>
                          {supplier.qualityScore >= 80 ? 'Excellent' :
                           supplier.qualityScore >= 60 ? 'Good' :
                           'Needs Improvement'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pharmacies">
          <Card>
            <CardHeader>
              <CardTitle>Pharmacy Participation</CardTitle>
              <CardDescription>
                Engagement metrics for all registered pharmacies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pharmacy</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Avg Order Size</TableHead>
                    <TableHead>Participation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.pharmacyParticipation
                    .sort((a, b) => b.totalValue - a.totalValue)
                    .map((pharmacy) => (
                    <TableRow key={pharmacy.pharmacyId}>
                      <TableCell>
                        <div className="font-medium">{pharmacy.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{pharmacy.totalOrders}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          ${pharmacy.totalValue.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          ${pharmacy.totalOrders > 0 ? 
                            (pharmacy.totalValue / pharmacy.totalOrders).toLocaleString() : 
                            '0'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          pharmacy.totalOrders > 5 ? 'default' :
                          pharmacy.totalOrders > 2 ? 'secondary' :
                          pharmacy.totalOrders > 0 ? 'outline' :
                          'destructive'
                        }>
                          {pharmacy.totalOrders > 5 ? 'High' :
                           pharmacy.totalOrders > 2 ? 'Medium' :
                           pharmacy.totalOrders > 0 ? 'Low' :
                           'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order Value Analysis</CardTitle>
              <CardDescription>Monthly order values and trends</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orderTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [
                    name === 'value' ? `$${value.toLocaleString()}` : value,
                    name === 'value' ? 'Order Value' : 'Order Count'
                  ]} />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}