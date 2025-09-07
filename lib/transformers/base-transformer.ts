// Universal Transformation Framework
// Generic utilities for converting between Frontend and Database types

export type TransformationOptions = {
  includeRelations?: boolean;
  includeComputed?: boolean;
  validateRequired?: boolean;
};

export type TransformationResult<T> = {
  success: boolean;
  data?: T;
  errors?: string[];
};

abstract class BaseTransformer<FrontendType, DatabaseType> {
  // Abstract methods that must be implemented by each transformer
  abstract toDatabase(frontend: FrontendType): DatabaseType;
  abstract toFrontend(database: DatabaseType): FrontendType;
  
  // Generic transformation utilities
  protected transformDate(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return date.toISOString();
  }
  
  protected parseDate(dateString: string | null | undefined): Date | undefined {
    if (!dateString) return undefined;
    return new Date(dateString);
  }
  
  protected transformArray<T, U>(
    array: T[] | null | undefined,
    transformer: (item: T) => U
  ): U[] {
    if (!array) return [];
    return array.map(transformer);
  }
  
  protected safeTransform<T, U>(
    value: T | null | undefined,
    transformer: (value: T) => U,
    defaultValue: U
  ): U {
    if (value === null || value === undefined) return defaultValue;
    try {
      return transformer(value);
    } catch (error) {
      console.warn('Transformation error:', error);
      return defaultValue;
    }
  }
  
  // Batch transformation utilities
  public transformArrayToDatabase(frontendArray: FrontendType[]): DatabaseType[] {
    return frontendArray.map(item => this.toDatabase(item));
  }
  
  public transformArrayToFrontend(databaseArray: DatabaseType[]): FrontendType[] {
    return databaseArray.map(item => this.toFrontend(item));
  }
  
  // Validation utilities
  protected validateRequired(obj: any, requiredFields: string[]): string[] {
    const errors: string[] = [];
    requiredFields.forEach(field => {
      if (obj[field] === null || obj[field] === undefined || obj[field] === '') {
        errors.push(`Required field '${field}' is missing or empty`);
      }
    });
    return errors;
  }
  
  protected validateForeignKey(id: string | null | undefined, entityName: string): string[] {
    if (!id) return [`${entityName} ID is required`];
    if (typeof id !== 'string' || id.trim() === '') {
      return [`${entityName} ID must be a non-empty string`];
    }
    return [];
  }
}

// Generic utility types for automatic type generation
export type DatabaseToFrontend<T> = T extends { created_at: string }
  ? Omit<T, 'created_at' | 'updated_at'> & {
      createdAt: Date;
      updatedAt?: Date;
    }
  : T;

export type FrontendToDatabase<T> = T extends { createdAt: Date }
  ? Omit<T, 'createdAt' | 'updatedAt'> & {
      created_at: string;
      updated_at: string;
    }
  : T;

// Relationship embedding utilities
export type WithEmbeddedRelations<T, Relations> = T & Relations;

export type EmbedRelation<T, K extends keyof T, R> = Omit<T, K> & {
  [P in K]: R;
};

// Transformation error handling
export class TransformationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly originalValue?: any
  ) {
    super(message);
    this.name = 'TransformationError';
  }
}

// Generic transformation result wrapper
export const createTransformationResult = <T>(
  data?: T,
  errors?: string[]
): TransformationResult<T> => ({
  success: !errors || errors.length === 0,
  data,
  errors
});

// Utility for handling nullable transformations
export const transformNullable = <T, U>(
  value: T | null | undefined,
  transformer: (value: T) => U
): U | undefined => {
  return value ? transformer(value) : undefined;
};

// Utility for deep cloning objects during transformation
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (Array.isArray(obj)) return obj.map(deepClone) as unknown as T;
  
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

export { BaseTransformer }