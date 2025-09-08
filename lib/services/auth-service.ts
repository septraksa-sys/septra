import { supabase } from '@/lib/supabase-client';
import { User } from '@/types';
import validator from 'validator';
import { DatabaseUser } from '@/types/database';

/**
 * Supabase-Native Authentication Service
 * Uses Supabase's built-in authentication without client-side token management
 */
export class AuthService {
  
  /**
   * Validates user signup data with updated requirements
   * @param userData - User registration data
   * @returns Validation result with errors if any
   */
  static validateSignupData(userData: {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    role: 'pharmacy' | 'supplier' | 'admin';
  }): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // Email validation
    if (!userData.email) {
      errors.email = 'Email is required';
    } else if (!validator.isEmail(userData.email)) {
      errors.email = 'Please enter a valid email address';
    } else if (userData.email.length > 255) {
      errors.email = 'Email must be less than 255 characters';
    }

    // Password validation (updated requirements: 2-16 characters)
    if (!userData.password) {
      errors.password = 'Password is required';
    } else if (userData.password.length < 2) {
      errors.password = 'Password must be at least 2 characters long';
    } else if (userData.password.length > 16) {
      errors.password = 'Password must be less than 16 characters';
    }

    // Confirm password validation
    if (!userData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (userData.password !== userData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Name validation (updated requirements: 2-50 characters)
    if (!userData.name) {
      errors.name = 'Name is required';
    } else if (userData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    } else if (userData.name.length > 50) {
      errors.name = 'Name must be less than 50 characters';
    }

    // Role validation
    if (!userData.role || !['pharmacy', 'supplier', 'admin'].includes(userData.role)) {
      errors.role = 'Please select a valid account type';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Validates login credentials
   * @param credentials - Login credentials
   * @returns Validation result
   */
  static validateLoginData(credentials: {
    email: string;
    password: string;
  }): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // Email validation
    if (!credentials.email) {
      errors.email = 'Email is required';
    } else if (!validator.isEmail(credentials.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!credentials.password) {
      errors.password = 'Password is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Creates a new user account using Supabase Auth
   * @param userData - User registration data
   * @returns Created user or null with errors
   */
  static async createUser(userData: {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    role: 'pharmacy' | 'supplier' | 'admin';
    address?: string;
    phone?: string;
    licenseNumber?: string;
    categories?: string[];
  }): Promise<{ user: User | null; errors: Record<string, string> }> {
    try {
      // Validate input data
      const validation = this.validateSignupData(userData);
      if (!validation.isValid) {
        return { user: null, errors: validation.errors };
      }

      // Check if email already exists
      const emailExists = await this.checkEmailExists(userData.email);
      if (emailExists) {
        return { 
          user: null, 
          errors: { email: 'An account with this email already exists' }
        };
      }

      // Create auth user in Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email.toLowerCase(),
        password: userData.password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation for demo
          data: {
            name: userData.name,
            role: userData.role
          }
        }
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        return { 
          user: null, 
          errors: { general: authError.message || 'Failed to create account' }
        };
      }

      if (!authData.user) {
        return { 
          user: null, 
          errors: { general: 'Account creation failed. Please try again.' }
        };
      }

      // Create user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email.toLowerCase(),
          role: userData.role,
          name: userData.name,
          address: userData.address || null,
          phone: userData.phone || null,
          license_number: userData.licenseNumber || null,
          categories: userData.categories || null,
          rating: userData.role === 'supplier' ? 4.0 : null
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        return { 
          user: null, 
          errors: { general: 'Failed to create user profile. Please try again.' }
        };
      }

      // Transform to frontend User type
      const user: User = {
        id: profileData.id,
        email: profileData.email,
        role: profileData.role as 'pharmacy' | 'supplier' | 'admin',
        profileId: profileData.id,
        name: profileData.name || undefined,
        address: profileData.address || undefined,
        phone: profileData.phone || undefined,
        licenseNumber: profileData.license_number || undefined,
        rating: profileData.rating || undefined,
        categories: profileData.categories || undefined,
        createdAt: new Date(profileData.created_at),
        updatedAt: new Date(profileData.updated_at)
      };

      return { user, errors: {} };
    } catch (error) {
      console.error('User creation error:', error);
      return { 
        user: null, 
        errors: { general: 'An unexpected error occurred. Please try again.' }
      };
    }
  }

  /**
   * Authenticates user with email and password using Supabase
   * @param credentials - Login credentials
   * @returns Authentication result
   */
  static async authenticateUser(
    credentials: { email: string; password: string }
  ): Promise<{ 
    user: User | null; 
    errors: Record<string, string>;
  }> {
    try {
      // Validate input
      const validation = this.validateLoginData(credentials);
      if (!validation.isValid) {
        return { 
          user: null, 
          errors: validation.errors
        };
      }

      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email.toLowerCase(),
        password: credentials.password
      });

      if (authError || !authData.user) {
        return {
          user: null,
          errors: { general: 'Invalid email or password' }
        };
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profileData) {
        console.error('Profile fetch error:', profileError);
        return {
          user: null,
          errors: { general: 'Account not found. Please contact support.' }
        };
      }

      // Transform to frontend User type
      const user: User = {
        id: profileData.id,
        email: profileData.email,
        role: profileData.role as 'pharmacy' | 'supplier' | 'admin',
        profileId: profileData.id,
        name: profileData.name || undefined,
        address: profileData.address || undefined,
        phone: profileData.phone || undefined,
        licenseNumber: profileData.license_number || undefined,
        rating: profileData.rating || undefined,
        categories: profileData.categories || undefined,
        createdAt: new Date(profileData.created_at),
        updatedAt: new Date(profileData.updated_at)
      };

      return { user, errors: {} };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        user: null,
        errors: { general: 'Authentication failed. Please try again.' }
      };
    }
  }

  /**
   * Signs out user using Supabase
   * @returns Success status
   */
  static async signOut(): Promise<boolean> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Sign out error:', error);
      return false;
    }
  }

  /**
   * Gets current authenticated user from Supabase
   * @returns Current user or null
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) return null;

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) return null;

      return {
        id: profileData.id,
        email: profileData.email,
        role: profileData.role as 'pharmacy' | 'supplier' | 'admin',
        profileId: profileData.id,
        name: profileData.name || undefined,
        address: profileData.address || undefined,
        phone: profileData.phone || undefined,
        licenseNumber: profileData.license_number || undefined,
        rating: profileData.rating || undefined,
        categories: profileData.categories || undefined,
        createdAt: new Date(profileData.created_at),
        updatedAt: new Date(profileData.updated_at)
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Checks if email already exists in database
   * @param email - Email to check
   * @returns True if email exists
   */
  static async checkEmailExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .limit(1);

      if (error) {
        console.error('Error checking email existence:', error);
        return false;
      }

      return !!data && data.length > 0;
    } catch (error) {
      console.error('Error checking email existence:', error);
      return false;
    }
  }

  /**
   * Listen to authentication state changes
   * @param callback - Function to call when auth state changes
   * @returns Subscription object with unsubscribe method
   */
  static onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser();
        callback(user);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Password strength calculation for UI feedback
   * @param password - Password to analyze
   * @returns Strength score and level
   */
  static calculatePasswordStrength(password: string): { score: number; level: 'weak' | 'fair' | 'good' | 'strong' } {
    let score = 0;

    // Length scoring (more lenient for 2-16 char requirement)
    if (password.length >= 2) score += 20;
    if (password.length >= 6) score += 20;
    if (password.length >= 10) score += 20;

    // Character variety scoring
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10;

    // Determine level
    let level: 'weak' | 'fair' | 'good' | 'strong';
    if (score < 30) level = 'weak';
    else if (score < 50) level = 'fair';
    else if (score < 70) level = 'good';
    else level = 'strong';

    return { score: Math.min(score, 100), level };
  }

  /**
   * Validates password strength with updated requirements
   * @param password - Password to validate
   * @returns Array of error messages
   */
  static validatePasswordStrength(password: string): string[] {
    const errors: string[] = [];

    if (password.length < 2) {
      errors.push('Password must be at least 2 characters long');
    }

    if (password.length > 16) {
      errors.push('Password must be less than 16 characters');
    }

    return errors;
  }

  /**
   * Creates admin user for development (uses Supabase auth)
   * @param email - Admin email
   * @param password - Admin password
   * @returns Created admin user or null
   */
  static async createAdminUser(email: string = 'admin@septra.com', password: string = 'admin123'): Promise<User | null> {
    try {
      // Check if running in development
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           process.env.ENABLE_ADMIN_SIGNUP !== 'false';
      
      if (!isDevelopment) {
        console.warn('🚫 Admin user creation is disabled in production');
        return null;
      }

      console.log('🔧 Creating development admin user...');
      
      // Check if admin already exists
      const emailExists = await this.checkEmailExists(email);
      if (emailExists) {
        console.log('ℹ️ Admin user already exists');
        return null;
      }

      // Create admin using the standard createUser method
      const result = await this.createUser({
        email,
        password,
        confirmPassword: password,
        name: 'Administrator',
        role: 'admin',
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
   * Sanitizes user input
   * @param input - Raw user input
   * @param type - Type of input
   * @returns Sanitized input
   */
  static sanitizeInput(input: string, type: 'email' | 'name' | 'general'): string {
    let sanitized = input.trim();

    switch (type) {
      case 'email':
        sanitized = sanitized.toLowerCase();
        break;
      case 'name':
        sanitized = sanitized.replace(/[^a-zA-Z\s\-']/g, '');
        break;
      default:
        // General sanitization
        break;
    }

    return sanitized;
  }
}