'use client';

import { useState, useEffect } from 'react';
import { User, SKU } from '@/types';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Save, Package, Settings, Database } from 'lucide-react';
import { toast } from 'sonner';

interface AdminSKUEngineProps {
  user: User;
}

export function AdminSKUEngine({ user }: AdminSKUEngineProps) {
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSKU, setEditingSKU] = useState<SKU | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: '',
    strength: '',
    unit: 'Pack',
    dosageForm: '',
    packSize: '',
    manufacturer: '',
    requiresExpiry: false,
    storageConditions: '',
    therapeuticClass: '',
    customMetadata: ''
  });

  useEffect(() => {
    loadSKUs();
  }, []);

  const loadSKUs = () => {
    const allSKUs = storage.getSKUs();
    setSKUs(allSKUs);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      category: '',
      strength: '',
      unit: 'Pack',
      dosageForm: '',
      packSize: '',
      manufacturer: '',
      requiresExpiry: false,
      storageConditions: '',
      therapeuticClass: '',
      customMetadata: ''
    });
    setEditingSKU(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.category || !formData.strength) {
      toast.error('Please fill in all required fields (Name, Category, Strength)');
      return;
    }

    // Generate SKU code if not provided
    const skuCode = formData.code || generateSKUCode(formData.name, formData.strength);

    // Check for duplicate codes
    const existingSKU = skus.find(s => s.code === skuCode && s.id !== editingSKU?.id);
    if (existingSKU) {
      toast.error('SKU code already exists. Please use a different code.');
      return;
    }

    // Parse custom metadata
    let customMetadata = {};
    if (formData.customMetadata) {
      try {
        customMetadata = JSON.parse(formData.customMetadata);
      } catch (error) {
        toast.error('Invalid JSON format in custom metadata');
        return;
      }
    }

    const now = new Date();
    const allSKUs = storage.getSKUs();

    if (editingSKU) {
      // Update existing SKU
      const updatedSKUs = allSKUs.map(s => 
        s.id === editingSKU.id 
          ? {
              ...s,
              code: skuCode,
              name: formData.name,
              description: formData.description,
              category: formData.category,
              strength: formData.strength,
              unit: formData.unit,
              metadata: {
                dosageForm: formData.dosageForm,
                packSize: formData.packSize,
                manufacturer: formData.manufacturer,
                requiresExpiry: formData.requiresExpiry,
                storageConditions: formData.storageConditions,
                therapeuticClass: formData.therapeuticClass,
                ...customMetadata
              },
              updatedAt: now
            }
          : s
      );
      storage.setSKUs(updatedSKUs);
      toast.success('SKU updated successfully');
      
      // Broadcast update event
      broadcastSKUUpdate('updated', skuCode);
    } else {
      // Create new SKU
      const newSKU: SKU = {
        id: `sku_${Date.now()}`,
        code: skuCode,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        strength: formData.strength,
        unit: formData.unit,
        metadata: {
          dosageForm: formData.dosageForm,
          packSize: formData.packSize,
          manufacturer: formData.manufacturer,
          requiresExpiry: formData.requiresExpiry,
          storageConditions: formData.storageConditions,
          therapeuticClass: formData.therapeuticClass,
          ...customMetadata
        },
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: user.id
      };
      
      storage.setSKUs([...allSKUs, newSKU]);
      toast.success('SKU created successfully');
      
      // Broadcast creation event
      broadcastSKUUpdate('created', skuCode);
    }

    loadSKUs();
    setIsDialogOpen(false);
    resetForm();
  };

  const generateSKUCode = (name: string, strength: string) => {
    const nameCode = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
    const strengthCode = strength.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `${nameCode}${strengthCode}`;
  };

  const broadcastSKUUpdate = (action: string, skuCode: string) => {
    // Broadcast to all open tabs/windows
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('skuUpdate', { 
        detail: { action, skuCode, timestamp: Date.now() } 
      }));
    }
    
    // Show notification
    toast.info(`SKU ${skuCode} ${action} - All views will update automatically`);
  };

  const handleEdit = (sku: SKU) => {
    setEditingSKU(sku);
    setFormData({
      code: sku.code,
      name: sku.name,
      description: sku.description || '',
      category: sku.category,
      strength: sku.strength,
      unit: sku.unit,
      dosageForm: sku.metadata.dosageForm || '',
      packSize: sku.metadata.packSize || '',
      manufacturer: sku.metadata.manufacturer || '',
      requiresExpiry: sku.metadata.requiresExpiry || false,
      storageConditions: sku.metadata.storageConditions || '',
      therapeuticClass: sku.metadata.therapeuticClass || '',
      customMetadata: JSON.stringify(
        Object.fromEntries(
          Object.entries(sku.metadata).filter(([key]) => 
            !['dosageForm', 'packSize', 'manufacturer', 'requiresExpiry', 'storageConditions', 'therapeuticClass'].includes(key)
          )
        ), null, 2
      )
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (skuId: string) => {
    const sku = skus.find(s => s.id === skuId);
    if (!sku) return;

    // Check if SKU is being used
    const demands = storage.getPharmacyDemands();
    const isInUse = demands.some(d => d.skuId === skuId);
    
    if (isInUse) {
      toast.error('Cannot delete SKU - it is currently being used in demands or orders');
      return;
    }

    const allSKUs = storage.getSKUs();
    const updatedSKUs = allSKUs.filter(s => s.id !== skuId);
    storage.setSKUs(updatedSKUs);
    loadSKUs();
    
    // Broadcast deletion event
    broadcastSKUUpdate('deleted', sku.code);
    toast.success('SKU deleted successfully');
  };

  const toggleSKUStatus = (skuId: string) => {
    const allSKUs = storage.getSKUs();
    const updatedSKUs = allSKUs.map(s => 
      s.id === skuId ? { ...s, isActive: !s.isActive, updatedAt: new Date() } : s
    );
    storage.setSKUs(updatedSKUs);
    loadSKUs();
    
    const sku = allSKUs.find(s => s.id === skuId);
    if (sku) {
      broadcastSKUUpdate(sku.isActive ? 'deactivated' : 'activated', sku.code);
      toast.success(`SKU ${sku.isActive ? 'deactivated' : 'activated'} successfully`);
    }
  };

  const getUniqueCategories = () => {
    return [...new Set(skus.map(s => s.category))].filter(Boolean);
  };

  const getUsageStats = () => {
    const demands = storage.getPharmacyDemands();
    const orders = storage.getSeptraOrders();
    
    return skus.map(sku => {
      const demandCount = demands.filter(d => d.skuId === sku.id).length;
      const orderCount = orders.reduce((count, order) => 
        count + order.lines.filter(line => line.skuId === sku.id).length, 0
      );
      
      return {
        skuId: sku.id,
        demandCount,
        orderCount,
        totalUsage: demandCount + orderCount
      };
    });
  };

  const usageStats = getUsageStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Database className="h-6 w-6 mr-3 text-indigo-600" />
            SKU Engine
          </h2>
          <p className="text-gray-600 mt-1">
            Centralized SKU management - Single source of truth for all pharmaceutical products
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add New SKU
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                {editingSKU ? 'Edit SKU' : 'Create New SKU'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic Information</TabsTrigger>
                  <TabsTrigger value="metadata">Metadata & Properties</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">SKU Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Paracetamol"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">SKU Code</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        placeholder="Auto-generated if empty"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="e.g., Analgesics"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="strength">Strength *</Label>
                      <Input
                        id="strength"
                        value={formData.strength}
                        onChange={(e) => setFormData(prev => ({ ...prev, strength: e.target.value }))}
                        placeholder="e.g., 500mg"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit</Label>
                      <select
                        id="unit"
                        className="w-full p-2 border rounded-md"
                        value={formData.unit}
                        onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      >
                        <option value="Pack">Pack</option>
                        <option value="Bottle">Bottle</option>
                        <option value="Box">Box</option>
                        <option value="Vial">Vial</option>
                        <option value="Tube">Tube</option>
                        <option value="Strip">Strip</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dosageForm">Dosage Form</Label>
                      <Input
                        id="dosageForm"
                        value={formData.dosageForm}
                        onChange={(e) => setFormData(prev => ({ ...prev, dosageForm: e.target.value }))}
                        placeholder="e.g., Tablet, Capsule, Syrup"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Detailed product description"
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="metadata" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="packSize">Pack Size</Label>
                      <Input
                        id="packSize"
                        value={formData.packSize}
                        onChange={(e) => setFormData(prev => ({ ...prev, packSize: e.target.value }))}
                        placeholder="e.g., 20 tablets"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manufacturer">Manufacturer</Label>
                      <Input
                        id="manufacturer"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                        placeholder="e.g., Pfizer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="therapeuticClass">Therapeutic Class</Label>
                      <Input
                        id="therapeuticClass"
                        value={formData.therapeuticClass}
                        onChange={(e) => setFormData(prev => ({ ...prev, therapeuticClass: e.target.value }))}
                        placeholder="e.g., NSAID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storageConditions">Storage Conditions</Label>
                      <Input
                        id="storageConditions"
                        value={formData.storageConditions}
                        onChange={(e) => setFormData(prev => ({ ...prev, storageConditions: e.target.value }))}
                        placeholder="e.g., Store below 25°C"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requiresExpiry"
                      checked={formData.requiresExpiry}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requiresExpiry: checked }))}
                    />
                    <Label htmlFor="requiresExpiry">Requires Expiry Date Tracking</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customMetadata">Custom Metadata (JSON)</Label>
                    <Textarea
                      id="customMetadata"
                      value={formData.customMetadata}
                      onChange={(e) => setFormData(prev => ({ ...prev, customMetadata: e.target.value }))}
                      placeholder='{"customField": "value", "anotherField": "value"}'
                      rows={4}
                    />
                    <p className="text-xs text-gray-500">
                      Add custom fields as JSON for future expansion
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingSKU ? 'Update SKU' : 'Create SKU'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total SKUs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{skus.length}</div>
            <p className="text-sm text-gray-600">
              {skus.filter(s => s.isActive).length} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getUniqueCategories().length}</div>
            <p className="text-sm text-gray-600">
              unique categories
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Most Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.max(...usageStats.map(s => s.totalUsage), 0)}
            </div>
            <p className="text-sm text-gray-600">
              max usage count
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {skus.filter(s => {
                const dayAgo = new Date();
                dayAgo.setDate(dayAgo.getDate() - 1);
                return new Date(s.updatedAt) > dayAgo;
              }).length}
            </div>
            <p className="text-sm text-gray-600">
              in last 24h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SKUs Table */}
      {skus.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No SKUs in the system</h3>
              <p className="text-gray-600">
                Create your first SKU to start managing pharmaceutical products
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              SKU Management
            </CardTitle>
            <CardDescription>
              Manage all pharmaceutical products in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Strength</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skus.map((sku) => {
                  const usage = usageStats.find(s => s.skuId === sku.id);
                  return (
                    <TableRow key={sku.id}>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {sku.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sku.name}</p>
                          {sku.metadata?.dosageForm && (
                            <p className="text-sm text-gray-500">{sku.metadata.dosageForm}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sku.category}</Badge>
                      </TableCell>
                      <TableCell>{sku.strength}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={sku.isActive}
                            onCheckedChange={() => toggleSKUStatus(sku.id)}
                            size="sm"
                          />
                          <Badge variant={sku.isActive ? 'default' : 'secondary'}>
                            {sku.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{usage?.totalUsage || 0} total</div>
                          <div className="text-gray-500">
                            {usage?.demandCount || 0} demands, {usage?.orderCount || 0} orders
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {new Date(sku.updatedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(sku)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(sku.id)}
                            disabled={usage && usage.totalUsage > 0}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}