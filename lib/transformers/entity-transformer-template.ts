// Generic Entity Transformer Template
// Use this template to create transformers for any entity

import { BaseTransformer, TransformationResult, createTransformationResult } from './base-transformer';

// Template for creating new entity transformers
export class EntityTransformerTemplate<FrontendType, DatabaseType> extends BaseTransformer<FrontendType, DatabaseType> {
  
  // Constructor to define field mappings
  constructor(
    private frontendToDbFieldMap: Record<string, string>,
    private dbToFrontendFieldMap: Record<string, string>,
    private dateFields: string[] = [],
    private requiredFields: string[] = []
  ) {
    super();
  }

  toDatabase(frontend: FrontendType): DatabaseType {
    const result = {} as DatabaseType;
    
    Object.entries(frontend as any).forEach(([key, value]) => {
      const dbField = this.frontendToDbFieldMap[key] || key;
      
      if (this.dateFields.includes(key) && value instanceof Date) {
        (result as any)[dbField] = value.toISOString();
      } else if (value !== undefined) {
        (result as any)[dbField] = value;
      }
    });
    
    return result;
  }

  toFrontend(database: DatabaseType): FrontendType {
    const result = {} as FrontendType;
    
    Object.entries(database as any).forEach(([key, value]) => {
      const frontendField = this.dbToFrontendFieldMap[key] || key;
      
      if (this.dateFields.includes(frontendField) && typeof value === 'string') {
        (result as any)[frontendField] = new Date(value);
      } else if (value !== null) {
        (result as any)[frontendField] = value;
      }
    });
    
    return result;
  }

  validate(frontend: FrontendType): TransformationResult<DatabaseType> {
    const errors = this.validateRequired(frontend as any, this.requiredFields);
    
    if (errors.length > 0) {
      return createTransformationResult<DatabaseType>(undefined, errors);
    }
    
    return createTransformationResult(this.toDatabase(frontend));
  }
}

// Factory function for creating entity transformers
export function createEntityTransformer<F, D>(config: {
  frontendToDb: Record<string, string>;
  dbToFrontend: Record<string, string>;
  dateFields?: string[];
  requiredFields?: string[];
}) {
  return new EntityTransformerTemplate<F, D>(
    config.frontendToDb,
    config.dbToFrontend,
    config.dateFields || [],
    config.requiredFields || []
  );
}

// Example usage for creating transformers for other entities:

/*
// User Transformer Example
export const userTransformer = createEntityTransformer<User, DatabaseUser>({
  frontendToDb: {
    'licenseNumber': 'license_number',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  },
  dbToFrontend: {
    'license_number': 'licenseNumber',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt'
  },
  dateFields: ['createdAt', 'updatedAt'],
  requiredFields: ['id', 'email', 'role']
});

// SKU Transformer Example
export const skuTransformer = createEntityTransformer<SKU, DatabaseSKU>({
  frontendToDb: {
    'isActive': 'is_active',
    'createdBy': 'created_by',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  },
  dbToFrontend: {
    'is_active': 'isActive',
    'created_by': 'createdBy',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt'
  },
  dateFields: ['createdAt', 'updatedAt'],
  requiredFields: ['id', 'code', 'name', 'category', 'unit']
});
*/