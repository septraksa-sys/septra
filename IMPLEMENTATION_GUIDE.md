# Implementation Guide - Dual-Type System Architecture

## Quick Start

### 1. Migration Setup
Follow the migration guide to set up your Supabase database:
```bash
# 1. Set up Supabase project and get credentials
# 2. Add credentials to .env.local
# 3. Run the migration SQL in Supabase SQL Editor
# 4. Create admin user
```

### 2. Disable ESLint (Temporary)
ESLint has been disabled for development. Re-enable when ready:
```bash
# To re-enable ESLint later:
npm run lint
npm run build:check
```

### 3. Start with RFQ Engine
The RFQ engine has been updated to use the dual-type system:
- Frontend types for UI components
- Database types for service layer
- Transformers for seamless conversion

## Entity Implementation Pattern

### For Each New Entity, Follow This Pattern:

#### Step 1: Define Types
```typescript
// In types/frontend.ts
export interface MyEntity {
  id: string;
  name: string;
  createdAt: Date;           // UI-friendly Date object
  relatedItems: RelatedItem[]; // Embedded for UI
}

// In types/database.ts
export interface DatabaseMyEntity {
  id: string;
  name: string;
  created_at: string;        // Database ISO string
  related_item_id: string;   // Foreign key, not embedded
}
```

#### Step 2: Create Transformer
```typescript
// In lib/transformers/my-entity-transformer.ts
export class MyEntityTransformer extends BaseTransformer<MyEntity, DatabaseMyEntity> {
  toDatabase(frontend: MyEntity): DatabaseMyEntity {
    return {
      id: frontend.id,
      name: frontend.name,
      created_at: frontend.createdAt.toISOString()
      // Note: Don't include embedded relationships
    };
  }

  toFrontend(database: DatabaseMyEntity): MyEntity {
    return {
      id: database.id,
      name: database.name,
      createdAt: new Date(database.created_at),
      relatedItems: [] // Will be populated by service layer
    };
  }
}
```

#### Step 3: Create Service
```typescript
// In lib/services/my-entity-service.ts
export class MyEntityService {
  private static transformer = new MyEntityTransformer();

  static async getAll(): Promise<MyEntity[]> {
    const { data, error } = await supabase
      .from('my_entities')
      .select(`
        *,
        related_items (*)
      `);
    
    if (error) throw error;
    
    return data.map(item => this.transformer.toFrontendWithRelations(item));
  }

  static async create(entityData: Omit<MyEntity, 'id' | 'createdAt'>): Promise<MyEntity | null> {
    const databaseData = this.transformer.toDatabase({
      ...entityData,
      id: 'temp',
      createdAt: new Date()
    });

    const { data, error } = await supabase
      .from('my_entities')
      .insert(databaseData)
      .select()
      .single();

    return data ? this.transformer.toFrontend(data) : null;
  }
}
```

#### Step 4: Update Component
```typescript
// In components/my-entity-component.tsx
export function MyEntityComponent() {
  const [entities, setEntities] = useState<MyEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await MyEntityService.getAll();
      setEntities(data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Component renders using frontend types with embedded relationships
  return (
    <div>
      {entities.map(entity => (
        <div key={entity.id}>
          <h3>{entity.name}</h3>
          <p>Created: {entity.createdAt.toLocaleDateString()}</p>
          <ul>
            {entity.relatedItems.map(item => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

## Remaining Entities to Implement

### Priority 1: Core Entities
1. **User/Pharmacy/Supplier**
   - Update user management
   - Profile handling
   - Authentication integration

2. **SKU Management**
   - Product catalog
   - Category management
   - Metadata handling

3. **Demand Management**
   - Pharmacy demand submission
   - Aggregation logic
   - Status tracking

### Priority 2: Order Management
1. **Pharmacy Orders**
   - Order confirmation
   - Payment processing
   - Status tracking

2. **Supplier Orders**
   - Order fulfillment
   - Shipping management
   - Status updates

### Priority 3: Supporting Systems
1. **Escrow Management**
   - Payment processing
   - Release conditions
   - Refund handling

2. **Logistics Tracking**
   - Shipment tracking
   - Delivery confirmation
   - Status updates

3. **Analytics & Reporting**
   - Performance metrics
   - Business intelligence
   - Dashboard data

## Implementation Checklist

### For Each Entity:
- [ ] Define frontend type with embedded relationships
- [ ] Define database type matching schema exactly
- [ ] Create transformer class extending BaseTransformer
- [ ] Implement service class using transformers
- [ ] Update components to use services
- [ ] Add loading states and error handling
- [ ] Test CRUD operations
- [ ] Verify type safety throughout

### Quality Assurance:
- [ ] All database operations use transformers
- [ ] No direct database types in UI components
- [ ] Proper error handling in all services
- [ ] Loading states in all async operations
- [ ] Type safety maintained throughout
- [ ] Performance optimized for large datasets

## Common Patterns

### 1. Simple Entity (No Relations)
```typescript
// Frontend: User
// Database: DatabaseUser
// Transformer: UserTransformer
// Service: UserService
```

### 2. Entity with One-to-Many Relations
```typescript
// Frontend: RFQ with embedded lines[]
// Database: DatabaseRFQ + DatabaseRFQLine (separate tables)
// Transformer: Handle embedding in toFrontendWithRelations()
// Service: Use JOIN queries to fetch relations
```

### 3. Entity with Many-to-Many Relations
```typescript
// Frontend: Supplier with embedded categories[]
// Database: DatabaseSupplier + supplier_categories junction table
// Transformer: Handle array transformations
// Service: Use complex JOINs or separate queries
```

### 4. Complex Business Logic
```typescript
// Use service layer for business rules
// Keep transformers focused on data conversion
// Validate business rules before database operations
// Handle transactions for multi-table operations
```

## Error Handling Patterns

### Service Layer Errors
```typescript
try {
  const result = await MyEntityService.create(data);
  if (!result) {
    toast.error('Failed to create entity');
    return;
  }
  toast.success('Entity created successfully');
} catch (error) {
  console.error('Service error:', error);
  toast.error('An unexpected error occurred');
}
```

### Transformation Errors
```typescript
const validation = transformer.validate(frontendData);
if (!validation.success) {
  console.error('Validation errors:', validation.errors);
  return;
}
```

### Component Error Boundaries
```typescript
const [error, setError] = useState<string | null>(null);

const loadData = async () => {
  try {
    setError(null);
    const data = await Service.getAll();
    setData(data);
  } catch (err) {
    setError('Failed to load data');
  }
};
```

## Performance Optimization

### Database Queries
- Use specific SELECT fields instead of *
- Implement proper indexing on foreign keys
- Use pagination for large datasets
- Consider query complexity vs. multiple simple queries

### Transformation Performance
- Cache transformer instances
- Use batch operations for arrays
- Avoid unnecessary deep cloning
- Profile transformation performance

### UI Performance
- Implement proper loading states
- Use React.memo for expensive components
- Consider virtualization for large lists
- Optimize re-renders with proper dependencies

## Testing Strategy

### Unit Tests
- Test each transformer independently
- Validate transformation accuracy
- Test error handling
- Verify type safety

### Integration Tests
- Test service layer operations
- Verify database interactions
- Test complex relationship handling
- Validate business logic

### Component Tests
- Test UI with mock services
- Verify loading states
- Test error handling
- Validate user interactions

## Deployment Considerations

### Environment Setup
- Ensure Supabase credentials are configured
- Verify database migrations are applied
- Test service connectivity
- Validate RLS policies

### Monitoring
- Monitor transformation performance
- Track database query performance
- Log transformation errors
- Monitor memory usage

### Rollback Strategy
- Keep old local storage system as fallback
- Implement feature flags for gradual rollout
- Monitor error rates during deployment
- Have rollback plan for critical issues

This architecture provides a robust, scalable foundation for managing complex data relationships while maintaining clean separation of concerns and excellent developer experience.