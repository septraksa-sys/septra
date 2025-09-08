# Supabase Integration Guide

## Database ID Management

When working with Supabase in the Septra platform, it's important to follow these guidelines for managing database entity IDs:

### 1. Let Supabase Generate IDs

- **DO NOT** generate IDs on the client side
- Supabase automatically generates UUIDs for primary keys
- Omit the `id` field when inserting new records

```typescript
// INCORRECT - Don't create IDs client-side
const data = {
  id: `sku_${Date.now()}`, // ❌ Don't do this
  name: 'Product Name',
  // ...other fields
};

// CORRECT - Let Supabase generate the ID
const data = {
  name: 'Product Name',
  // ...other fields (no id field)
};
```

### 2. Timestamp Management

Supabase automatically handles `created_at` and `updated_at` timestamps if you've configured your tables with the appropriate triggers:

- Omit `created_at` when inserting new records
- Omit `updated_at` when inserting or updating records

### 3. Proper Insert Pattern

```typescript
// Correct pattern for inserting with Supabase
const { data, error } = await supabase
  .from('your_table')
  .insert({
    // Fields without id, created_at, updated_at
    field1: value1,
    field2: value2,
    // ...
  })
  .select() // Get the complete inserted record including generated ID
  .single();
```

### 4. Using TypeScript Interfaces

To enforce this pattern, we've created separate interfaces for reading vs inserting data:

```typescript
// For reading (has all fields)
interface DatabaseSKU {
  id: string;
  code: string;
  // ... other fields
  created_at: string;
  updated_at: string;
}

// For inserting (omits auto-generated fields)
interface DatabaseSKUInsert {
  code: string;
  // ... other fields
  // No id, created_at, or updated_at
}
```

### 5. Foreign Keys

When referencing other entities, always use the IDs returned from Supabase, never client-generated IDs.

## Common Pitfalls

1. **Temporary IDs**: Avoid using temporary IDs in your frontend state - wait for real IDs from Supabase.
2. **ID Format**: Supabase uses UUID format. Don't assume any specific format in your application logic.
3. **Transaction Safety**: When multiple inserts depend on each other, use Supabase's transactions.

## Best Practices

1. **Error Handling**: Always check for errors after Supabase operations.
2. **Validation**: Validate data before sending to Supabase.
3. **Type Safety**: Use TypeScript interfaces to ensure proper data structure.

Following these guidelines will ensure your application works correctly with Supabase and maintains data integrity.
