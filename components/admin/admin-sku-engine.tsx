'use client';

import { useState, useEffect } from 'react';
import { User, SKU } from '@/types/frontend';
import { SKUService } from '@/lib/services/sku-service';
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
import { Plus, Edit, Trash2, Save, Package, Settings, Database, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

interface AdminSKUEngineProps {
  user: User;
}

export function AdminSKUEngine({ user }: AdminSKUEngineProps) {
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [skusData, categoriesData] = await Promise.all([
        SKUService.getAllSKUs(),
        SKUService.getCategories()
      ]);
      setSKUs(skusData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading SKU data:', error);
      toast.error('Failed to load SKU data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadData();
      return;
    }

    try {
      const results = await SKUService.searchSKUs(searchQuery);
      setSKUs(results);
    } catch (error) {
      toast.error('Search failed');
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.category || !formData.strength) {
      toast.error('Please fill in all required fields (Name, Category, Strength)');
      return;
    }

    setIsCreating(true);
    try {
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

      if (editingSKU) {
        // Update existing SKU
        const updates: Partial<SKU> = {
          code: formData.code,
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
          }
        };
        if(!editingSKU.id){
          return
        }

        const success = await SKUService.updateSKU(editingSKU.id, updates);
        if (success) {
          toast.success('SKU updated successfully');
          broadcastSKUUpdate('updated', formData.code || editingSKU.code);
        } else {
          toast.error('Failed to update SKU');
          return;
        }
      } else {
        // Create new SKU
        const skuData = {
          code: formData.code,
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
          createdBy: user.id
        };

        const newSKU = await SKUService.createSKU(skuData);
        if (newSKU) {
          toast.success('SKU created successfully');
          broadcastSKUUpdate('created', newSKU.code);
        } else {
          toast.error('Failed to create SKU');
          return;
        }
      }

      await loadData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting SKU:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
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

  const handleDelete = async (skuId: string) => {
    const sku = skus.find(s => s.id === skuId);
    if (!sku) return;

    try {
      const success = await SKUService.deleteSKU(skuId);
      if (success) {
        await loadData();
        broadcastSKUUpdate('deleted', sku.code);
        toast.success('SKU deleted successfully');
      } else {
        toast.error('Failed to delete SKU - it may be in use');
      }
    } catch (error) {
      toast.error('Cannot delete SKU - it is currently being used');
    }
  };

  const toggleSKUStatus = async (skuId: string) => {
    const sku = skus.find(s => s.id === skuId);
    if (!sku) return;

    try {
      const success = await SKUService.toggleSKUStatus(skuId);
      if (success) {
        await loadData();
        broadcastSKUUpdate(sku.isActive ? 'deactivated' : 'activated', sku.code);
        toast.success(`SKU ${sku.isActive ? 'deactivated' : 'activated'} successfully`);
      } else {
        toast.error('Failed to update SKU status');
      }
    } catch (error) {
      toast.error('Failed to update SKU status');
    }
  };

  const getUsageStats = () => {
    // This would be enhanced with real usage data from the database
    // For now, return empty stats as placeholder
    return skus.map(sku => ({
      skuId: sku.id,
      demandCount: 0,
      orderCount: 0,
      totalUsage: 0
    }));
  };

  const usageStats = getUsageStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="ml-2 text-gray-600">Loading SKU data...</span>
        </div>
      </div>
    );
  }

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
        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search SKUs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-64"
            />
            <Button variant="outline" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
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
                          list="categories"
                          required
                        />
                        <datalist id="categories">
                          {categories.map(cat => (
                            <option key={cat} value={cat} />
                          ))}
                        </datalist>
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
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isCreating}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingSKU ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingSKU ? 'Update SKU' : 'Create SKU'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
            <div className="text-2xl font-bold">{categories.length}</div>
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
                            onCheckedChange={() => toggleSKUStatus(sku.id ? sku.id : "")}
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
                            onClick={() => handleDelete(sku.id || "")}
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