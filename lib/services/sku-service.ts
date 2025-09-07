import { supabase } from '@/lib/supabase-client';
import { SKU } from '@/types/frontend';
import { DatabaseSKU } from '@/types/database';
import { SKUTransformerFactory } from '@/lib/transformers/sku-transformer';

export class SKUService {
  private static transformer = SKUTransformerFactory.getInstance();

  // Get all active SKUs
  static async getActiveSKUs(): Promise<SKU[]> {
    try {
      const { data, error } = await supabase
        .from('skus')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return data.map(sku => this.transformer.toFrontend(sku));
    } catch (error) {
      console.error('Error fetching active SKUs:', error);
      return [];
    }
  }

  // Get all SKUs (admin only)
  static async getAllSKUs(): Promise<SKU[]> {
    try {
      const { data, error } = await supabase
        .from('skus')
        .select('*')
        .order('name');

      if (error) throw error;

      return data.map(sku => this.transformer.toFrontend(sku));
    } catch (error) {
      console.error('Error fetching all SKUs:', error);
      return [];
    }
  }

  // Create new SKU
  static async createSKU(skuData: {
    code?: string;
    name: string;
    description?: string;
    category: string;
    strength: string;
    unit: string;
    metadata?: any;
    createdBy: string;
  }): Promise<SKU | null> {
    try {
      // Generate code if not provided
      const code = skuData.code || this.transformer.generateSKUCode(skuData.name, skuData.strength);

      // Check for duplicate codes
      const { data: existing } = await supabase
        .from('skus')
        .select('id')
        .eq('code', code)
        .single();

      if (existing) {
        throw new Error('SKU code already exists');
      }

      // Create frontend SKU for validation
      const frontendSKU: SKU = {
        id: `sku_${Date.now()}`,
        code,
        name: skuData.name,
        description: skuData.description,
        category: skuData.category,
        strength: skuData.strength,
        unit: skuData.unit,
        metadata: skuData.metadata || {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: skuData.createdBy
      };

      // Validate before transformation
      const validation = this.transformer.validateForDatabase(frontendSKU);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
      }

      // Transform to database format
      const databaseSKU = this.transformer.toDatabase(frontendSKU);

      const { data, error } = await supabase
        .from('skus')
        .insert(databaseSKU)
        .select()
        .single();

      if (error) throw error;

      return this.transformer.toFrontend(data);
    } catch (error) {
      console.error('Error creating SKU:', error);
      return null;
    }
  }

  // Update SKU
  static async updateSKU(skuId: string, updates: Partial<SKU>): Promise<boolean> {
    try {
      // Get current SKU
      const { data: currentSKU, error: fetchError } = await supabase
        .from('skus')
        .select('*')
        .eq('id', skuId)
        .single();

      if (fetchError) throw fetchError;

      // Transform current to frontend, apply updates, then back to database
      const frontendSKU = this.transformer.toFrontend(currentSKU);
      const updatedFrontendSKU = { ...frontendSKU, ...updates, updatedAt: new Date() };

      // Validate updated SKU
      const validation = this.transformer.validateForDatabase(updatedFrontendSKU);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
      }

      // Transform to database format (only the fields that can be updated)
      const databaseUpdates: Partial<DatabaseSKU> = {};
      
      if (updates.code) databaseUpdates.code = updates.code;
      if (updates.name) databaseUpdates.name = updates.name;
      if (updates.description !== undefined) databaseUpdates.description = updates.description || null;
      if (updates.category) databaseUpdates.category = updates.category;
      if (updates.strength !== undefined) databaseUpdates.strength = updates.strength || null;
      if (updates.unit) databaseUpdates.unit = updates.unit;
      if (updates.metadata) databaseUpdates.metadata = updates.metadata;
      if (updates.isActive !== undefined) databaseUpdates.is_active = updates.isActive;
      
      // Always update the timestamp
      databaseUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('skus')
        .update(databaseUpdates)
        .eq('id', skuId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating SKU:', error);
      return false;
    }
  }

  // Delete SKU (soft delete by setting inactive)
  static async deleteSKU(skuId: string): Promise<boolean> {
    try {
      // Check if SKU is being used
      const { data: demands } = await supabase
        .from('pharmacy_demands')
        .select('id')
        .eq('sku_id', skuId)
        .limit(1);

      if (demands && demands.length > 0) {
        throw new Error('Cannot delete SKU - it is currently being used in demands or orders');
      }

      // Soft delete by setting inactive
      const { error } = await supabase
        .from('skus')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', skuId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting SKU:', error);
      return false;
    }
  }

  // Hard delete SKU (admin only, use with caution)
  static async hardDeleteSKU(skuId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('skus')
        .delete()
        .eq('id', skuId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error hard deleting SKU:', error);
      return false;
    }
  }

  // Toggle SKU active status
  static async toggleSKUStatus(skuId: string): Promise<boolean> {
    try {
      // Get current status
      const { data: currentSKU, error: fetchError } = await supabase
        .from('skus')
        .select('is_active')
        .eq('id', skuId)
        .single();

      if (fetchError) throw fetchError;

      // Toggle status
      const { error } = await supabase
        .from('skus')
        .update({ 
          is_active: !currentSKU.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', skuId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error toggling SKU status:', error);
      return false;
    }
  }

  // Get SKU by ID
  static async getSKUById(skuId: string): Promise<SKU | null> {
    try {
      const { data, error } = await supabase
        .from('skus')
        .select('*')
        .eq('id', skuId)
        .single();

      if (error) throw error;

      return this.transformer.toFrontend(data);
    } catch (error) {
      console.error('Error fetching SKU by ID:', error);
      return null;
    }
  }

  // Get SKU by code
  static async getSKUByCode(code: string): Promise<SKU | null> {
    try {
      const { data, error } = await supabase
        .from('skus')
        .select('*')
        .eq('code', code)
        .single();

      if (error) throw error;

      return this.transformer.toFrontend(data);
    } catch (error) {
      console.error('Error fetching SKU by code:', error);
      return null;
    }
  }

  // Get SKUs by category
  static async getSKUsByCategory(category: string): Promise<SKU[]> {
    try {
      const { data, error } = await supabase
        .from('skus')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return data.map(sku => this.transformer.toFrontend(sku));
    } catch (error) {
      console.error('Error fetching SKUs by category:', error);
      return [];
    }
  }

  // Get unique categories
  static async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('skus')
        .select('category')
        .eq('is_active', true);

      if (error) throw error;

      const categories = [...new Set(data.map(item => item.category))];
      return categories.filter(Boolean).sort();
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  // Search SKUs
  static async searchSKUs(query: string): Promise<SKU[]> {
    try {
      const { data, error } = await supabase
        .from('skus')
        .select('*')
        .or(`name.ilike.%${query}%,code.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('is_active', true)
        .order('name')
        .limit(50);

      if (error) throw error;

      return data.map(sku => this.transformer.toFrontend(sku));
    } catch (error) {
      console.error('Error searching SKUs:', error);
      return [];
    }
  }

  // Get SKU usage statistics
  static async getSKUUsageStats(skuId: string): Promise<{
    demandCount: number;
    orderCount: number;
    totalQuantityDemanded: number;
    lastUsed?: Date;
  }> {
    try {
      // Get demand count and total quantity
      const { data: demands, error: demandsError } = await supabase
        .from('pharmacy_demands')
        .select('quantity, created_at')
        .eq('sku_id', skuId);

      if (demandsError) throw demandsError;

      // Get order count from RFQ lines
      const { data: rfqLines, error: rfqLinesError } = await supabase
        .from('rfq_lines')
        .select('total_quantity, created_at')
        .eq('sku_id', skuId);

      if (rfqLinesError) throw rfqLinesError;

      const demandCount = demands?.length || 0;
      const orderCount = rfqLines?.length || 0;
      const totalQuantityDemanded = (demands || []).reduce((sum, d) => sum + d.quantity, 0);
      
      // Find last usage date
      const allDates = [
        ...(demands || []).map(d => new Date(d.created_at)),
        ...(rfqLines || []).map(r => new Date(r.created_at))
      ];
      const lastUsed = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : undefined;

      return {
        demandCount,
        orderCount,
        totalQuantityDemanded,
        lastUsed
      };
    } catch (error) {
      console.error('Error fetching SKU usage stats:', error);
      return {
        demandCount: 0,
        orderCount: 0,
        totalQuantityDemanded: 0
      };
    }
  }
}