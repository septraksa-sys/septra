import { supabase } from '@/lib/supabase-client';
import { SKU } from '@/types';

export class SKUService {
  // Get all active SKUs
  static async getActiveSKUs(): Promise<SKU[]> {
    try {
      const { data, error } = await supabase
        .from('skus')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return data.map(sku => ({
        id: sku.id,
        code: sku.code,
        name: sku.name,
        description: sku.description || undefined,
        category: sku.category,
        strength: sku.strength || '',
        unit: sku.unit,
        metadata: sku.metadata || {},
        isActive: sku.is_active,
        createdAt: new Date(sku.created_at),
        updatedAt: new Date(sku.updated_at),
        createdBy: sku.created_by
      }));
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

      return data.map(sku => ({
        id: sku.id,
        code: sku.code,
        name: sku.name,
        description: sku.description || undefined,
        category: sku.category,
        strength: sku.strength || '',
        unit: sku.unit,
        metadata: sku.metadata || {},
        isActive: sku.is_active,
        createdAt: new Date(sku.created_at),
        updatedAt: new Date(sku.updated_at),
        createdBy: sku.created_by
      }));
    } catch (error) {
      console.error('Error fetching all SKUs:', error);
      return [];
    }
  }

  // Create new SKU
  static async createSKU(skuData: {
    code: string;
    name: string;
    description?: string;
    category: string;
    strength: string;
    unit: string;
    metadata?: any;
    createdBy: string;
  }): Promise<SKU | null> {
    try {
      const { data, error } = await supabase
        .from('skus')
        .insert({
          code: skuData.code,
          name: skuData.name,
          description: skuData.description,
          category: skuData.category,
          strength: skuData.strength,
          unit: skuData.unit,
          metadata: skuData.metadata || {},
          created_by: skuData.createdBy
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        code: data.code,
        name: data.name,
        description: data.description || undefined,
        category: data.category,
        strength: data.strength || '',
        unit: data.unit,
        metadata: data.metadata || {},
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        createdBy: data.created_by
      };
    } catch (error) {
      console.error('Error creating SKU:', error);
      return null;
    }
  }

  // Update SKU
  static async updateSKU(skuId: string, updates: Partial<SKU>): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (updates.code) updateData.code = updates.code;
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.category) updateData.category = updates.category;
      if (updates.strength !== undefined) updateData.strength = updates.strength;
      if (updates.unit) updateData.unit = updates.unit;
      if (updates.metadata) updateData.metadata = updates.metadata;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { error } = await supabase
        .from('skus')
        .update(updateData)
        .eq('id', skuId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating SKU:', error);
      return false;
    }
  }

  // Delete SKU
  static async deleteSKU(skuId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('skus')
        .delete()
        .eq('id', skuId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting SKU:', error);
      return false;
    }
  }
}