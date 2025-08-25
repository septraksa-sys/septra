'use client';

import { User } from '@/types';
import { storage } from './storage';

export class AuthService {
  static async login(email: string, password: string): Promise<User | null> {
    try {
      // Get users from local storage
      const users = storage.getUsers();
      const user = users.find(u => u.email === email && password === password);
      
      if (user) {
        storage.setCurrentUser(user);
        return user;
      }
      
      return null;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  }

  static async logout(): Promise<void> {
    try {
      storage.setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      return storage.getCurrentUser();
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  static async hasRole(role: User['role']): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.role === role;
  }

  static async requireAuth(): Promise<User> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }
    return user;
  }

  static async requireRole(role: User['role']): Promise<User> {
    const user = await this.requireAuth();
    if (user.role !== role) {
      throw new Error(`Role ${role} required`);
    }
    return user;
  }

  static async register(
    email: string, 
    password: string, 
    role: 'pharmacy' | 'supplier', 
    profileData: any
  ): Promise<User | null> {
    try {
      const users = storage.getUsers();
      
      // Check if user already exists
      if (users.some(u => u.email === email)) {
        return null;
      }

      const newUser: User = {
        id: `user_${Date.now()}`,
        email: email.toLowerCase(),
        role: role,
        profileId: `${role}_${Date.now()}`,
        name: profileData.name,
        address: profileData.address,
        phone: profileData.phone,
        licenseNumber: profileData.licenseNumber,
        rating: profileData.rating || 4.0,
        categories: profileData.categories || []
      };

      // Add to users
      storage.setUsers([...users, newUser]);

      // Add to appropriate profile storage
      if (role === 'pharmacy') {
        const pharmacies = storage.getPharmacies();
        storage.setPharmacies([...pharmacies, {
          id: newUser.profileId,
          name: profileData.name,
          email: email.toLowerCase(),
          address: profileData.address,
          phone: profileData.phone,
          licenseNumber: profileData.licenseNumber
        }]);
      } else if (role === 'supplier') {
        const suppliers = storage.getSuppliers();
        storage.setSuppliers([...suppliers, {
          id: newUser.profileId,
          name: profileData.name,
          email: email.toLowerCase(),
          address: profileData.address,
          phone: profileData.phone,
          rating: profileData.rating || 4.0,
          categories: profileData.categories || []
        }]);
      }

      storage.setCurrentUser(newUser);
      return newUser;
    } catch (error) {
      console.error('Registration error:', error);
      return null;
    }
  }

  static getAllCategories(): string[] {
    return [
      'Analgesics',
      'Antibiotics', 
      'Cardiovascular',
      'Diabetes',
      'Gastrointestinal',
      'Respiratory',
      'Dermatology',
      'Neurology',
      'ALL'
    ];
  }

  static onAuthStateChange(callback: (user: User | null) => void) {
    // For local storage, we'll just call the callback immediately with current user
    const currentUser = this.getCurrentUser();
    currentUser.then(callback);
    
    // Return a mock subscription object
    return { 
      data: { 
        subscription: { 
          unsubscribe: () => {} 
        } 
      } 
    };
  }
}