import { User, SKU, Pharmacy, Supplier, RFQLine, AwardedBid } from '@/types';
import { storage } from './storage';

export function seedDatabase() {
  try {
    // Only initialize if no data exists (preserve existing data)
    const existingSKUs = storage.getSKUs();
    const existingUsers = storage.getUsers();
    
    // Seed users if none exist
    if (existingUsers.length === 0) {
      const defaultUsers: User[] = [
        {
          id: 'admin_001',
          email: 'admin@septra.com',
          role: 'admin',
          profileId: 'admin_001',
          name: 'Administrator'
        },
        {
          id: 'pharmacy_001',
          email: 'pharmacy@test.com',
          role: 'pharmacy',
          profileId: 'pharmacy_001',
          name: 'Test Pharmacy',
          address: '123 Main St',
          phone: '+1234567890',
          licenseNumber: 'PH001'
        },
        {
          id: 'supplier_001',
          email: 'supplier@test.com',
          role: 'supplier',
          profileId: 'supplier_001',
          name: 'Test Supplier',
          address: '456 Supply Ave',
          phone: '+0987654321',
          rating: 4.5,
          categories: ['ALL', 'Analgesics', 'Antibiotics']
        }
      ];
      storage.setUsers(defaultUsers);
    }
    
    // Seed SKUs if none exist
    if (existingSKUs.length === 0) {
      const defaultSKUs: SKU[] = [
        {
          id: 'sku_001',
          code: 'PARA500',
          name: 'Paracetamol',
          description: 'Pain relief and fever reducer',
          category: 'Analgesics',
          strength: '500mg',
          unit: 'Pack',
          metadata: {
            dosageForm: 'Tablet',
            packSize: '20 tablets',
            manufacturer: 'Generic Pharma',
            requiresExpiry: true,
            storageConditions: 'Store below 25°C',
            therapeuticClass: 'Analgesic'
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'admin_001'
        },
        {
          id: 'sku_002',
          code: 'AMOX250',
          name: 'Amoxicillin',
          description: 'Broad-spectrum antibiotic',
          category: 'Antibiotics',
          strength: '250mg',
          unit: 'Pack',
          metadata: {
            dosageForm: 'Capsule',
            packSize: '21 capsules',
            manufacturer: 'Generic Pharma',
            requiresExpiry: true,
            storageConditions: 'Store below 25°C',
            therapeuticClass: 'Antibiotic'
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'admin_001'
        }
      ];
      storage.setSKUs(defaultSKUs);
    }
    
    // Seed pharmacies if none exist
    const existingPharmacies = storage.getPharmacies();
    if (existingPharmacies.length === 0) {
      const defaultPharmacies: Pharmacy[] = [
        {
          id: 'pharmacy_001',
          name: 'Test Pharmacy',
          email: 'pharmacy@test.com',
          address: '123 Main St',
          phone: '+1234567890',
          licenseNumber: 'PH001'
        }
      ];
      storage.setPharmacies(defaultPharmacies);
    }
    
    // Seed suppliers if none exist
    const existingSuppliers = storage.getSuppliers();
    if (existingSuppliers.length === 0) {
      const defaultSuppliers: Supplier[] = [
        {
          id: 'supplier_001',
          name: 'Test Supplier',
          email: 'supplier@test.com',
          address: '456 Supply Ave',
          phone: '+0987654321',
          rating: 4.5,
          categories: ['ALL', 'Analgesics', 'Antibiotics', 'Cardiovascular', 'Diabetes']
        }
      ];
      storage.setSuppliers(defaultSuppliers);
    }
    
    // Initialize empty arrays only if they don't exist
    if (storage.getPharmacyDemands().length === 0) storage.setPharmacyDemands([]);
    if (storage.getSeptraOrders().length === 0) storage.setSeptraOrders([]);
    if (storage.getRFQs().length === 0) storage.setRFQs([]);
    if (storage.getRFQLines().length === 0) storage.setRFQLines([]);
    if (storage.getAwardedBids().length === 0) storage.setAwardedBids([]);
    if (storage.getBids().length === 0) storage.setBids([]);
    if (storage.getPharmacyOrders().length === 0) storage.setPharmacyOrders([]);
    if (storage.getSupplierOrders().length === 0) storage.setSupplierOrders([]);
    if (storage.getEscrows().length === 0) storage.setEscrows([]);
    if (storage.getLogisticsEntries().length === 0) storage.setLogisticsEntries([]);
    
    // Validate schema after seeding
    const validation = storage.validateSchema();
    if (!validation.isValid) {
      console.warn('⚠️ Schema validation warnings:', validation.errors);
    }
    
    console.log('✅ Database seeded successfully with default data');
    return true;
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    return false;
  }
}

// Helper function to get available categories from existing SKUs (dynamic)
export function getAvailableCategories(): string[] {
  const skus = storage.getSKUs();
  return [...new Set(skus.map(sku => sku.category))].filter(Boolean);
}

// Helper function to get sample data for development
export function getSampleData() {
  return {
    availableCategories: getAvailableCategories(),
    schemaVersion: '2.0.0-rfq-central'
  };
}