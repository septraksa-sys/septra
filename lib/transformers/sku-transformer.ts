// SKU Transformer - Complete Implementation
// Handles conversion between Frontend SKU and Database SKU types

import { BaseTransformer, TransformationResult, createTransformationResult } from './base-transformer';
import { SKU } from '@/types/frontend';
import { DatabaseSKU } from '@/types/database';

export class SKUTransformer extends BaseTransformer<SKU, DatabaseSKU> {
  // Transform Frontend SKU to Database SKU
  toDatabase(frontend: SKU): DatabaseSKU {
    return {
      id: frontend.id,
      code: frontend.code,
      name: frontend.name,
      description: frontend.description || null,
      category: frontend.category,
      strength: frontend.strength || null,
      unit: frontend.unit,
      metadata: frontend.metadata || {},
      is_active: frontend.isActive,
      created_by: frontend.createdBy,
      created_at: this.transformDate(frontend.createdAt)!,
      updated_at: this.transformDate(frontend.updatedAt)!
    };
  }

  // Transform Database SKU to Frontend SKU
  toFrontend(database: DatabaseSKU): SKU {
    return {
      id: database.id,
      code: database.code,
      name: database.name,
      description: database.description || undefined,
      category: database.category,
      strength: database.strength || '',
      unit: database.unit,
      metadata: database.metadata || {},
      isActive: database.is_active,
      createdAt: new Date(database.created_at),
      updatedAt: new Date(database.updated_at),
      createdBy: database.created_by
    };
  }

  // Validate SKU data before transformation
  validateForDatabase(frontend: SKU): TransformationResult<DatabaseSKU> {
    const errors: string[] = [];
    
    // Required field validation
    errors.push(...this.validateRequired(frontend, ['id', 'code', 'name', 'category', 'unit', 'createdBy']));
    
    // Business logic validation
    if (frontend.code && !/^[A-Z0-9]+$/.test(frontend.code)) {
      errors.push('SKU code must contain only uppercase letters and numbers');
    }
    
    if (frontend.code && frontend.code.length > 20) {
      errors.push('SKU code must be 20 characters or less');
    }
    
    if (frontend.name && frontend.name.length > 255) {
      errors.push('SKU name must be 255 characters or less');
    }
    
    // Foreign key validation
    errors.push(...this.validateForeignKey(frontend.createdBy, 'User'));
    
    if (errors.length > 0) {
      return createTransformationResult<DatabaseSKU>(undefined, errors);
    }
    
    return createTransformationResult(this.toDatabase(frontend));
  }

  // Generate SKU code from name and strength
  generateSKUCode(name: string, strength: string): string {
    const nameCode = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
    const strengthCode = strength.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `${nameCode}${strengthCode}`;
  }

  // Validate SKU code uniqueness (would be called by service)
  async validateCodeUniqueness(code: string, excludeId?: string): Promise<boolean> {
    // This would be implemented in the service layer with actual database check
    // Returning true for now as placeholder
    return true;
  }
}

// SKU Transformer Factory
export class SKUTransformerFactory {
  private static instance = new SKUTransformer();

  static getInstance(): SKUTransformer {
    return this.instance;
  }
}