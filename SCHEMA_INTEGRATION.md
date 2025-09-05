# Schema Integration Guide - RFQ-Central Architecture

## Overview

This document provides comprehensive instructions for running, validating, and maintaining the new RFQ-central schema in the Septra platform. The migration from SeptraOrder-central to RFQ-central architecture represents a fundamental shift in how the platform handles the bidding process.

## Schema Architecture Changes

### Key Changes Made

1. **RFQ is now the central entity** - All business logic flows through RFQ instead of SeptraOrder
2. **New entities added**:
   - `RFQLine` - Replaces SeptraOrderLine, linked to RFQ
   - `AwardedBid` - Tracks which bids were selected for each RFQ line
3. **Foreign key updates** - All related entities now reference `rfqId` instead of `septraOrderId`
4. **SeptraOrder simplified** - Now only handles demand aggregation and high-level tracking

### Entity Relationships (New Schema)

```
SeptraOrder (1) -> (N) RFQ -> (N) RFQLine -> (N) Bid
                            -> (1) AwardedBid
RFQ (1) -> (N) PharmacyOrder
RFQ (1) -> (N) SupplierOrder  
RFQ (1) -> (N) Escrow
RFQ (1) -> (N) LogisticsEntry
```

## Development Environment Setup

### 1. Install Dependencies

```bash
# Install ESLint and TypeScript dependencies
npm install @typescript-eslint/eslint-plugin@^6.21.0 @typescript-eslint/parser@^6.21.0 eslint-plugin-import@^2.29.1 eslint-plugin-unused-imports@^3.0.0 --save-dev
```

### 2. Available Commands

```bash
# Development
npm run dev                 # Start development server
npm run build              # Build for production
npm run build:check       # Build with linting and type checking

# Linting and Type Checking
npm run lint               # Run ESLint
npm run lint:fix          # Fix auto-fixable ESLint issues
npm run type-check        # Run TypeScript compiler check

# Schema Validation
npm run schema:validate    # Validate schema compliance
npm run schema:generate    # Generate types from schema
```

### 3. Pre-commit Validation

Before committing code, always run:

```bash
npm run build:check
```

This command will:
1. Run ESLint to catch type and schema violations
2. Run TypeScript compiler to verify type safety
3. Build the project to ensure everything compiles

## Schema Validation

### Automated Validation

The system includes built-in schema validation that runs automatically:

```typescript
// In lib/storage.ts
const validation = storage.validateSchema();
if (!validation.isValid) {
  console.warn('⚠️ Schema validation warnings:', validation.errors);
}
```

### Manual Validation

To manually validate schema compliance:

```bash
# Run type checking
npm run type-check

# Run schema validation
npm run schema:validate

# Check for schema violations in code
npm run lint
```

### Common Validation Errors

1. **Foreign Key Mismatches**
   ```
   Error: PharmacyOrder references non-existent RFQ
   Fix: Ensure all PharmacyOrder.rfqId values reference valid RFQ.id
   ```

2. **Type Safety Issues**
   ```
   Error: Property 'septraOrderId' does not exist on type 'PharmacyOrder'
   Fix: Use 'rfqId' instead of 'septraOrderId'
   ```

3. **Missing Required Fields**
   ```
   Error: RFQLine missing required 'rfqId' field
   Fix: Ensure all RFQLine entities have valid rfqId references
   ```

## ESLint Configuration

### Rules Implemented

The ESLint configuration includes comprehensive rules for:

- **Type Safety**: Prevents `any` usage, ensures proper typing
- **Schema Compliance**: Validates entity relationships and field usage
- **Import/Export**: Ensures consistent module structure
- **Code Quality**: Removes unused variables, enforces best practices

### Key Rules

```json
{
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-member-access": "error",
  "@typescript-eslint/restrict-template-expressions": "error",
  "import/no-unused-modules": "error",
  "unused-imports/no-unused-imports": "error"
}
```

### Build Integration

ESLint runs automatically during:
- `npm run build:check` - Fails build on errors
- `npm run lint` - Manual linting
- Pre-commit hooks (if configured)

## Migration Checklist

### ✅ Completed Updates

1. **Type Definitions** (`types/index.ts`)
   - Added RFQLine and AwardedBid interfaces
   - Updated all entities to reference RFQ instead of SeptraOrder
   - Added type guards for runtime validation

2. **Storage Layer** (`lib/storage.ts`)
   - Added RFQLine and AwardedBid storage methods
   - Implemented schema validation
   - Updated foreign key references

3. **Admin Components**
   - `admin-rfqs.tsx`: Now creates RFQLine entities
   - `admin-bids.tsx`: Uses AwardedBid for tracking awards
   - `admin-orders.tsx`: Updated to work with RFQ references
   - `admin-escrow.tsx`: References RFQ instead of SeptraOrder
   - `admin-logistics.tsx`: Updated foreign key references

4. **Pharmacy Components**
   - `pharmacy-orders.tsx`: Updated to use RFQ references
   - `pharmacy-tracking.tsx`: Works with RFQ-based logistics

5. **Supplier Components**
   - `supplier-orders.tsx`: Updated RFQ references
   - All supplier workflows now RFQ-centric

6. **ESLint Configuration**
   - Comprehensive type safety rules
   - Schema compliance validation
   - Build integration

### 🔄 Ongoing Maintenance

1. **Regular Schema Validation**
   ```bash
   # Run weekly
   npm run schema:validate
   ```

2. **Type Safety Monitoring**
   ```bash
   # Before each release
   npm run type-check
   ```

3. **Lint Rule Updates**
   - Review and update ESLint rules quarterly
   - Add new rules for emerging patterns

## Troubleshooting

### Common Issues

1. **Build Failures After Schema Changes**
   ```bash
   # Clear cache and rebuild
   npm run clean
   npm install
   npm run build:check
   ```

2. **Type Errors in Components**
   - Check that all components use the new RFQ-based interfaces
   - Ensure foreign key references are updated (rfqId vs septraOrderId)

3. **Runtime Schema Violations**
   - Check browser console for validation warnings
   - Run `storage.validateSchema()` in development tools

### Debug Commands

```bash
# Check TypeScript compilation
npx tsc --noEmit --pretty

# Detailed ESLint output
npx eslint . --ext .ts,.tsx --format detailed

# Check for unused exports
npx ts-unused-exports tsconfig.json
```

## Performance Considerations

### Schema Validation Impact

- Validation runs automatically but is lightweight
- Only validates relationships, not data content
- Can be disabled in production if needed

### Type Checking Performance

- Use `npm run type-check` for faster checking without build
- Consider incremental compilation for large codebases

## Future Enhancements

### Planned Improvements

1. **Runtime Schema Validation**
   - Add Zod schemas for runtime validation
   - Implement API request/response validation

2. **Enhanced ESLint Rules**
   - Custom rules for Septra-specific patterns
   - Automated foreign key validation

3. **Schema Migration Tools**
   - Automated migration scripts
   - Data transformation utilities

## Support

For issues with schema integration:

1. Check this documentation first
2. Run diagnostic commands
3. Review ESLint and TypeScript errors
4. Validate schema compliance

The new RFQ-central architecture provides better separation of concerns and more flexible business logic handling while maintaining backward compatibility where possible.