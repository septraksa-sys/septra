import { 
  SKU, Pharmacy, Supplier, PharmacyDemand, SeptraOrder, RFQ, Bid, 
  PharmacyOrder, SupplierOrder, Escrow, LogisticsEntry, User,
  RFQLine, AwardedBid
} from '@/types';

class LocalStorage {
  private getItem<T>(key: string): T[] {
    if (typeof window === 'undefined') return [];
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  }

  private setItem<T>(key: string, data: T[]): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(data));
  }

  // SKUs
  getSKUs(): SKU[] {
    return this.getItem<SKU>('septra_skus');
  }

  setSKUs(skus: SKU[]): void {
    this.setItem('septra_skus', skus);
  }

  // Pharmacies
  getPharmacies(): Pharmacy[] {
    return this.getItem<Pharmacy>('septra_pharmacies');
  }

  setPharmacies(pharmacies: Pharmacy[]): void {
    this.setItem('septra_pharmacies', pharmacies);
  }

  // Suppliers
  getSuppliers(): Supplier[] {
    return this.getItem<Supplier>('septra_suppliers');
  }

  setSuppliers(suppliers: Supplier[]): void {
    this.setItem('septra_suppliers', suppliers);
  }

  // Pharmacy Demands
  getPharmacyDemands(): PharmacyDemand[] {
    return this.getItem<PharmacyDemand>('septra_pharmacy_demands');
  }

  setPharmacyDemands(demands: PharmacyDemand[]): void {
    this.setItem('septra_pharmacy_demands', demands);
  }

  // Septra Orders
  getSeptraOrders(): SeptraOrder[] {
    return this.getItem<SeptraOrder>('septra_orders');
  }

  setSeptraOrders(orders: SeptraOrder[]): void {
    this.setItem('septra_orders', orders);
  }

  // RFQs
  getRFQs(): RFQ[] {
    return this.getItem<RFQ>('septra_rfqs');
  }

  setRFQs(rfqs: RFQ[]): void {
    this.setItem('septra_rfqs', rfqs);
  }

  // RFQ Lines
  getRFQLines(): RFQLine[] {
    return this.getItem<RFQLine>('septra_rfq_lines');
  }

  setRFQLines(lines: RFQLine[]): void {
    this.setItem('septra_rfq_lines', lines);
  }

  // Awarded Bids
  getAwardedBids(): AwardedBid[] {
    return this.getItem<AwardedBid>('septra_awarded_bids');
  }

  setAwardedBids(awardedBids: AwardedBid[]): void {
    this.setItem('septra_awarded_bids', awardedBids);
  }

  // Bids
  getBids(): Bid[] {
    return this.getItem<Bid>('septra_bids');
  }

  setBids(bids: Bid[]): void {
    this.setItem('septra_bids', bids);
  }

  // Pharmacy Orders
  getPharmacyOrders(): PharmacyOrder[] {
    return this.getItem<PharmacyOrder>('septra_pharmacy_orders');
  }

  setPharmacyOrders(orders: PharmacyOrder[]): void {
    this.setItem('septra_pharmacy_orders', orders);
  }

  // Supplier Orders
  getSupplierOrders(): SupplierOrder[] {
    return this.getItem<SupplierOrder>('septra_supplier_orders');
  }

  setSupplierOrders(orders: SupplierOrder[]): void {
    this.setItem('septra_supplier_orders', orders);
  }

  // Escrow
  getEscrows(): Escrow[] {
    return this.getItem<Escrow>('septra_escrows');
  }

  setEscrows(escrows: Escrow[]): void {
    this.setItem('septra_escrows', escrows);
  }

  // Logistics
  getLogisticsEntries(): LogisticsEntry[] {
    return this.getItem<LogisticsEntry>('septra_logistics');
  }

  setLogisticsEntries(entries: LogisticsEntry[]): void {
    this.setItem('septra_logistics', entries);
  }

  // Users
  getUsers(): User[] {
    return this.getItem<User>('septra_users');
  }

  setUsers(users: User[]): void {
    this.setItem('septra_users', users);
  }

  // Current User
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const user = window.localStorage.getItem('septra_current_user');
    return user ? JSON.parse(user) : null;
  }

  setCurrentUser(user: User | null): void {
    if (typeof window === 'undefined') return;
    if (user) {
      window.localStorage.setItem('septra_current_user', JSON.stringify(user));
    } else {
      window.localStorage.removeItem('septra_current_user');
    }
  }

  // Clear all data
  clearAll(): void {
    if (typeof window === 'undefined') return;
    const keys = [
      'septra_skus', 'septra_pharmacies', 'septra_suppliers', 
      'septra_pharmacy_demands', 'septra_orders', 'septra_rfqs', 
      'septra_rfq_lines', 'septra_awarded_bids', 'septra_bids', 
      'septra_pharmacy_orders', 'septra_supplier_orders',
      'septra_escrows', 'septra_logistics', 'septra_users', 'septra_current_user'
    ];
    keys.forEach(key => window.localStorage.removeItem(key));
  }

  // Schema validation helper
  validateSchema(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // Validate that all RFQs have corresponding SeptraOrders
      const rfqs = this.getRFQs();
      const septraOrders = this.getSeptraOrders();
      
      rfqs.forEach(rfq => {
        if (!septraOrders.find(order => order.id === rfq.septraOrderId)) {
          errors.push(`RFQ ${rfq.id} references non-existent SeptraOrder ${rfq.septraOrderId}`);
        }
      });

      // Validate that all PharmacyOrders reference valid RFQs
      const pharmacyOrders = this.getPharmacyOrders();
      pharmacyOrders.forEach(order => {
        if (!rfqs.find(rfq => rfq.id === order.rfqId)) {
          errors.push(`PharmacyOrder ${order.id} references non-existent RFQ ${order.rfqId}`);
        }
      });

      // Validate that all SupplierOrders reference valid RFQs
      const supplierOrders = this.getSupplierOrders();
      supplierOrders.forEach(order => {
        if (!rfqs.find(rfq => rfq.id === order.rfqId)) {
          errors.push(`SupplierOrder ${order.id} references non-existent RFQ ${order.rfqId}`);
        }
      });

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      return { isValid: false, errors: [`Schema validation failed: ${error}`] };
    }
  }
}

export const storage = new LocalStorage();