'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, PharmacyDemand, SKU } from '@/types';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Save, Package } from 'lucide-react';
import { toast } from 'sonner';

interface PharmacyDemandsProps {
  user: User;
}

export function PharmacyDemands({ user }: PharmacyDemandsProps) {
  const [demands, setDemands] = useState<PharmacyDemand[]>([]);
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingDemand, setEditingDemand] = useState<PharmacyDemand | null>(null);
  const [formData, setFormData] = useState({
    skuId: '',
    quantity: '',
    notes: ''
  });

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

  const loadData = useCallback(() => {
    const allDemands = storage.getPharmacyDemands();
    const pharmacyDemands = allDemands.filter(d => d.pharmacyId === user.profileId);
    setDemands(pharmacyDemands);
    
    // Only load active SKUs for pharmacy interface
    const allSKUs = storage.getSKUs();
    const activeSKUs = allSKUs.filter(sku => sku.isActive);
    setSKUs(activeSKUs);
    
    console.log('📦 Pharmacy Demands - SKUs loaded:', activeSKUs.length, 'active SKUs');
  }, [user.profileId]);
  
  // Force refresh when SKUs change
  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const resetForm = () => {
    setFormData({
      skuId: '',
      quantity: '',
      notes: ''
    });
    setEditingDemand(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.skuId || !formData.quantity) {
      toast.error('Please select a SKU and enter quantity');
      return;
    }

    const allDemands = storage.getPharmacyDemands();
    const now = new Date();

    if (editingDemand) {
      // Update existing demand
      const updatedDemands = allDemands.map(d => 
        d.id === editingDemand.id 
          ? {
              ...d,
              skuId: formData.skuId,
              quantity: parseInt(formData.quantity), // Ensure quantity is parsed as integer
              notes: formData.notes,
              updatedAt: now
            }
          : d
      );
      storage.setPharmacyDemands(updatedDemands);
      toast.success('Demand updated successfully');
    } else {
      // Create new demand
      const newDemand: PharmacyDemand = {
        id: `demand_${Date.now()}`,
        pharmacyId: user.profileId,
        skuId: formData.skuId,
        quantity: parseInt(formData.quantity),
        notes: formData.notes,
        status: 'draft',
        createdAt: now,
        updatedAt: now
      };
      
      storage.setPharmacyDemands([...allDemands, newDemand]);
      toast.success('Demand created successfully');
    }

    loadData();
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (demand: PharmacyDemand) => {
    setEditingDemand(demand);
    setFormData({
      skuId: demand.skuId,
      quantity: demand.quantity.toString(),
      notes: demand.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (demandId: string) => {
    const allDemands = storage.getPharmacyDemands();
    const updatedDemands = allDemands.filter(d => d.id !== demandId);
    storage.setPharmacyDemands(updatedDemands);
    loadData();
    toast.success('Demand deleted successfully');
  };

  const handleSubmitDemand = (demandId: string) => {
    const allDemands = storage.getPharmacyDemands();
    const updatedDemands = allDemands.map(d => 
      d.id === demandId 
        ? { ...d, status: 'submitted' as const, updatedAt: new Date() }
        : d
    );
    storage.setPharmacyDemands(updatedDemands);
    loadData();
    toast.success('Demand submitted successfully');
  };

  const getSKUName = (skuId: string) => {
    const sku = skus.find(s => s.id === skuId);
    return sku ? `${sku.name} (${sku.code})` : skuId;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Demands</h2>
          <p className="text-gray-600 mt-1">
            Submit your pharmaceutical demands to be included in aggregated orders
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Demand
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingDemand ? 'Edit Demand' : 'Create New Demand'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Select value={formData.skuId} onValueChange={(value) => setFormData(prev => ({ ...prev, skuId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a SKU" />
                  </SelectTrigger>
                  <SelectContent>
                    {skus.map((sku) => (
                      <SelectItem key={sku.id} value={sku.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{sku.name}</span>
                          <span className="text-sm text-gray-500">{sku.code} - {sku.category}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Enter quantity"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional requirements or notes"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingDemand ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {demands.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No demands yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first demand to start participating in aggregated orders
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Current Demands</CardTitle>
            <CardDescription>
              Manage your pharmaceutical demands
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demands.map((demand) => (
                  <TableRow key={demand.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{getSKUName(demand.skuId)}</p>
                        {demand.notes && (
                          <p className="text-sm text-gray-500 mt-1">{demand.notes}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{demand.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={demand.status === 'submitted' ? 'default' : 'secondary'}>
                        {demand.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(demand.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {demand.status === 'draft' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(demand)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(demand.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSubmitDemand(demand.id)}
                            >
                              Submit
                            </Button>
                          </>
                        )}
                        {demand.status === 'submitted' && (
                          <span className="text-sm text-green-600 font-medium">
                            ✓ Submitted
                          </span>
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