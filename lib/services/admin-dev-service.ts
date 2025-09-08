/**
 * Admin Development Service
 * Provides utilities for creating admin users during development
 * Can be disabled in production environments
 */

import { AuthService } from './auth-service';
import { User } from '@/types';

export class AdminDevService {
  /**
   * Creates an admin user for development/testing purposes
   * This function should only be used in development environments
   * @param email - Admin email address
   * @param password - Admin password
   * @returns Promise<User | null>
   */
  static async createDevAdmin(email: string = 'admin@septra.com', password: string = 'admin123'): Promise<User | null> {
    try {
      // Check if we're in development mode
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           process.env.ENABLE_ADMIN_SIGNUP !== 'false';
      
      if (!isDevelopment) {
        console.warn('🚫 Admin user creation is disabled in production');
        return null;
      }

      console.log('🔧 Creating development admin user...');
      
      // Check if admin already exists
      const existingAdmin = await AuthService.checkEmailExists(email);
      if (existingAdmin) {
        console.log('ℹ️ Admin user already exists');
        return null;
      }

      // Create admin user using the auth service
      const result = await AuthService.createUser({
        email,
        password,
        confirmPassword: password,
        username: 'admin',
        name: 'Administrator',
        role: 'admin' as any, // Cast to bypass role restriction
        address: 'Septra HQ',
        phone: '+1-555-0100'
      });

      if (result.user) {
        console.log('✅ Development admin user created successfully');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
        return result.user;
      } else {
        console.error('❌ Failed to create admin user:', result.errors);
        return null;
      }
    } catch (error) {
      console.error('❌ Admin creation error:', error);
      return null;
    }
  }

  /**
   * Quick setup function to create admin and seed basic data
   * Call this from browser console during development
   */
  static async quickSetup(): Promise<void> {
    try {
      console.log('🚀 Starting quick development setup...');
      
      // Create admin user
      const admin = await this.createDevAdmin();
      
      if (admin) {
        console.log('✅ Quick setup completed successfully');
        console.log('🎯 You can now login with:');
        console.log('   Email: admin@septra.com');
        console.log('   Password: admin123');
      } else {
        console.log('ℹ️ Admin user already exists or creation was skipped');
      }
    } catch (error) {
      console.error('❌ Quick setup failed:', error);
    }
  }

  /**
   * Validates if admin creation is allowed in current environment
   * @returns boolean indicating if admin creation is enabled
   */
  static isAdminCreationEnabled(): boolean {
    return process.env.NODE_ENV === 'development' || 
           process.env.ENABLE_ADMIN_SIGNUP !== 'false';
  }
}

// Export for browser console access during development
if (typeof window !== 'undefined') {
  (window as any).AdminDevService = AdminDevService;
  console.log('🔧 AdminDevService available in browser console');
  console.log('💡 Run AdminDevService.quickSetup() to create admin user');
}