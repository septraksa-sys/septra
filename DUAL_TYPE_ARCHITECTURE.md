# Dual-Type System Architecture Guide

## Overview

This document outlines the comprehensive dual-type system architecture implemented for the Septra platform. The system cleanly separates frontend UI-optimized types from database schema-aligned types, with a universal service layer for seamless transformations.

## Architecture Components

### 1. Frontend Types (`types/frontend.ts`)
- **Purpose**: UI-optimized types with embedded relationships
- **Features**: 
  - Embedded objects for easier component consumption
  - Computed/derived fields for UI logic
  - Date objects instead of strings
  - Optional fields for better UX
- **Example**: `RFQ` includes embedded `lines: RFQLine[]` array

### 2. Database Types (`types/database.ts`)
- **Purpose**: Schema-aligned types mirroring actual database structure
- **Features**:
  - Foreign keys instead of embedded objects
  - Nullable fields matching database constraints
  - String dates matching database format
  - Exact field naming from database (snake_case)
- **Example**: `DatabaseRFQ` has `septra_order_id: string` foreign key

### 3. Universal Service Layer (`lib/transformers/`)
- **Base Transformer**: Abstract class with common transformation utilities
- **Entity-Specific Transformers**: Concrete implementations for each entity
- **Transformation Framework**: Generic utilities for any entity type
- **Error Handling**: Comprehensive validation and error reporting

## Implementation Pattern

### Step 1: Define Types
```typescript
// Frontend Type (UI-optimized)
interface RFQ {
  id: string;
  septraOrderId: string;
  lines: RFQLine[]; // Embedded for UI
  createdAt: Date;   // Date object
}

// Database Type (Schema-aligned)
interface DatabaseRFQ {
  id: string;
  septra_order_id: string; // Foreign key
  created_at: string;      // ISO string
}
```

### Step 2: Create Transformer
```typescript
class RFQTransformer extends BaseTransformer<RFQ, DatabaseRFQ> {
  toDatabase(frontend: RFQ): DatabaseRFQ {
    return {
      id: frontend.id,
      septra_order_id: frontend.septraOrderId,
      created_at: frontend.createdAt.toISOString()
    };
  }

  toFrontend(database: DatabaseRFQ): RFQ {
    return {
      id: database.id,
      septraOrderId: database.septra_order_id,
      lines: [], // Populated separately
      createdAt: new Date(database.created_at)
    };
  }
}
```

### Step 3: Use in Services
```typescript
class RFQService {
  private static transformer = new RFQTransformer();

  static async createRFQ(rfqData: RFQ): Promise<RFQ | null> {
    const databaseRFQ = this.transformer.toDatabase(rfqData);
    const { data, error } = await supabase.from('rfqs').insert(databaseRFQ);
    return data ? this.transformer.toFrontend(data) : null;
  }
}
```

## Entity Implementation Guide

### For Each Entity, Create:

1. **Frontend Type** in `types/frontend.ts`
   - Include embedded relationships
   - Use Date objects
   - Make fields optional where appropriate
   - Add computed fields for UI

2. **Database Type** in `types/database.ts`
   - Mirror exact database schema
   - Use foreign keys
   - Use string dates
   - Match database field naming

3. **Transformer Class** in `lib/transformers/`
   - Extend `BaseTransformer`
   - Implement `toDatabase()` and `toFrontend()`
   - Add validation methods
   - Handle complex relationships

4. **Service Methods** in `lib/services/`
   - Use transformers for all database operations
   - Handle async operations properly
   - Include error handling
   - Provide both simple and complex query methods

## Transformation Patterns

### Simple Field Mapping
```typescript
// Frontend -> Database
createdAt: Date -> created_at: string
isActive: boolean -> is_active: boolean
```

### Relationship Handling
```typescript
// Frontend (embedded)
rfq: {
  lines: RFQLine[]
}

// Database (normalized)
rfq_id: string
// Separate rfq_lines table
```

### Complex Transformations
```typescript
// With relations query
const { data } = await supabase
  .from('rfqs')
  .select(`
    *,
    rfq_lines (
      *,
      skus (*),
      awarded_bids (*)
    )
  `);

// Transform with embedded relationships
return transformer.toFrontendWithRelations(data);
```

## Best Practices

### 1. Type Safety
- Always use transformers for database operations
- Validate data before transformation
- Use type guards for runtime validation
- Handle nullable/undefined values properly

### 2. Performance
- Use batch transformations for arrays
- Cache transformer instances
- Optimize database queries with proper selects
- Consider pagination for large datasets

### 3. Error Handling
- Validate required fields
- Check foreign key constraints
- Provide meaningful error messages
- Log transformation errors for debugging

### 4. Maintainability
- Use the transformer factory pattern
- Create reusable transformation utilities
- Document complex transformation logic
- Test transformations thoroughly

## Migration Strategy

### Phase 1: Core Entities (Completed)
- ✅ RFQ and related entities
- ✅ Transformation framework
- ✅ Service layer integration

### Phase 2: Remaining Entities
Apply the same pattern to:
- User/Pharmacy/Supplier entities
- Order entities (Pharmacy/Supplier)
- Escrow and Logistics entities
- Analytics and reporting entities

### Phase 3: Component Updates
- Update all components to use services
- Remove direct database type usage in UI
- Add proper loading states
- Implement error boundaries

## Testing Strategy

### Unit Tests
```typescript
describe('RFQTransformer', () => {
  it('should transform frontend RFQ to database format', () => {
    const frontend: RFQ = { /* test data */ };
    const database = transformer.toDatabase(frontend);
    expect(database.septra_order_id).toBe(frontend.septraOrderId);
  });
});
```

### Integration Tests
```typescript
describe('RFQService', () => {
  it('should create RFQ with proper transformations', async () => {
    const result = await RFQService.createRFQFromSeptraOrder(/* params */);
    expect(result).toBeDefined();
    expect(result.rfq.lines).toBeInstanceOf(Array);
  });
});
```

## Performance Considerations

### Database Queries
- Use proper indexes on foreign keys
- Optimize join queries for complex relationships
- Consider query complexity vs. multiple simple queries
- Implement caching for frequently accessed data

### Transformation Performance
- Cache transformer instances
- Use batch operations for arrays
- Avoid unnecessary deep cloning
- Profile transformation performance in production

### Memory Management
- Clean up large objects after transformation
- Use streaming for very large datasets
- Consider pagination for UI performance
- Monitor memory usage in production

## Security Considerations

### Data Validation
- Validate all input data before transformation
- Sanitize user input in transformers
- Check foreign key constraints
- Validate business rules during transformation

### Access Control
- Implement RLS policies in database
- Validate user permissions in services
- Filter data based on user roles
- Audit transformation operations

## Future Enhancements

### Planned Features
1. **Automatic Type Generation**: Generate database types from schema
2. **Runtime Validation**: Add Zod schemas for runtime validation
3. **Caching Layer**: Implement Redis caching for transformations
4. **Audit Trail**: Track all transformation operations
5. **Performance Monitoring**: Monitor transformation performance

### Extensibility
- The framework is designed to handle any entity type
- New entities can be added following the established pattern
- Transformers can be extended with custom logic
- The service layer can accommodate complex business rules

This dual-type architecture provides a robust foundation for maintaining clean separation between UI and database concerns while ensuring type safety and performance across the entire application.