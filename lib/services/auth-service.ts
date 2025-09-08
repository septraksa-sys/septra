import { supabase } from '@/lib/supabase-client';
import { User } from '@/types';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import DOMPurify from 'dompurify';
import { Database } from '@/database.types';
import { DatabaseUser } from '@/types/database';

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map<string, { attempts: number; lastAttempt: Date }>();

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

/**
 * Comprehensive Authentication Service
 * Handles user registration, login, validation, and security
 */
export class AuthService {
  
  /**
   * Validates user signup data with comprehensive rules
   * @param userData - User registration data
   * @returns Validation result with errors if any
   */
  static validateSignupData(userData: {
    email: string;
    password: string;
    confirmPassword: string;
    username: string;
    name: string;
    role: 'pharmacy' | 'supplier';
  }): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // Sanitize inputs
    const sanitizedData = {
      email: DOMPurify.sanitize(userData.email.trim().toLowerCase()),
      username: DOMPurify.sanitize(userData.username.trim().toLowerCase()),
      name: DOMPurify.sanitize(userData.name.trim()),
      password: userData.password, // Don't sanitize passwords
      confirmPassword: userData.confirmPassword
    };

    // Email validation
    if (!sanitizedData.email) {
      errors.email = 'Email is required';
    } else if (!validator.isEmail(sanitizedData.email)) {
      errors.email = 'Please enter a valid email address';
    } else if (sanitizedData.email.length > 255) {
      errors.email = 'Email must be less than 255 characters';
    }

    // Username validation
    if (!sanitizedData.username) {
      errors.username = 'Username is required';
    } else if (sanitizedData.username.length < 2) {
      errors.username = 'Username must be at least 2 characters long';
    } else if (sanitizedData.username.length > 50) {
      errors.username = 'Username must be less than 50 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(sanitizedData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Name validation
    if (!sanitizedData.name) {
      errors.name = 'Name is required';
    } else if (sanitizedData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    } else if (sanitizedData.name.length > 50) {
      errors.name = 'Name must be less than 50 characters';
    } else if (!/^[a-zA-Z\s\-']+$/.test(sanitizedData.name)) {
      errors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }

    // Password validation
    if (!sanitizedData.password) {
      errors.password = 'Password is required';
    } else {
      const passwordErrors = this.validatePasswordStrength(sanitizedData.password);
      if (passwordErrors.length > 0) {
        errors.password = passwordErrors[0]; // Show first error
      }
    }

    // Confirm password validation
    if (!sanitizedData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (sanitizedData.password !== sanitizedData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
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
    emailOrUsername: string;
    password: string;
  }): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // Sanitize inputs
    const sanitized = {
      emailOrUsername: DOMPurify.sanitize(credentials.emailOrUsername.trim().toLowerCase()),
      password: credentials.password // Don't sanitize passwords
    };

    // Email/Username validation
    if (!sanitized.emailOrUsername) {
      errors.emailOrUsername = 'Email or username is required';
    } else {
      // Check if it's an email or username format
      const isEmail = sanitized.emailOrUsername.includes('@');
      if (isEmail && !validator.isEmail(sanitized.emailOrUsername)) {
        errors.emailOrUsername = 'Please enter a valid email address';
      } else if (!isEmail && (sanitized.emailOrUsername.length < 3 || !/^[a-zA-Z0-9_]+$/.test(sanitized.emailOrUsername))) {
        errors.emailOrUsername = 'Username must be at least 2 characters and contain only letters, numbers, and underscores';
      }
    }

    // Password validation
    if (!sanitized.password) {
      errors.password = 'Password is required';
    } else if (sanitized.password.length < 1) {
      errors.password = 'Password cannot be empty';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Validates password strength with comprehensive rules
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

    // Check for common weak passwords
    const commonPasswords = ['password', '12345678', 'qwerty123', 'admin123'];
    if (commonPasswords.some(weak => password.toLowerCase().includes(weak))) {
      errors.push('Password is too common, please choose a stronger password');
    }

    return errors;
  }

  /**
   * Calculates password strength score (0-100)
   * @param password - Password to analyze
   * @returns Strength score and level
   */
  static calculatePasswordStrength(password: string): { score: number; level: 'weak' | 'fair' | 'good' | 'strong' } {
    let score = 0;

    // Length scoring
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Character variety scoring
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;

    // Complexity scoring
    if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) score += 10;
    if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(password)) score += 15;

    // Determine level
    let level: 'weak' | 'fair' | 'good' | 'strong';
    if (score < 40) level = 'weak';
    else if (score < 60) level = 'fair';
    else if (score < 80) level = 'good';
    else level = 'strong';

    return { score: Math.min(score, 100), level };
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
        .single();

      return !!data && !error;
    } catch (error) {
      console.error('Error checking email existence:', error);
      return false;
    }
  }

  /**
   * Checks if username already exists in database
   * @param username - Username to check
   * @returns True if username exists
   */
  static async checkUsernameExists(username: string): Promise<boolean> {
    try {
      // For now, we'll use the name field as username
      // In production, you might want a separate username field
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .ilike('name', username.toLowerCase())
        .single();

      return !!data && !error;
    } catch (error) {
      console.error('Error checking username existence:', error);
      return false;
    }
  }

  /**
   * Hashes password using bcrypt
   * @param password - Plain text password
   * @returns Hashed password
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verifies password against hash
   * @param password - Plain text password
   * @param hash - Stored password hash
   * @returns True if password matches
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generates JWT authentication token
   * @param user - User object
   * @returns JWT token
   */
  static generateAuthToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    return jwt.sign(payload, JWT_SECRET);
  }

  /**
   * Verifies and decodes JWT token
   * @param token - JWT token
   * @returns Decoded user data or null
   */
  static verifyAuthToken(token: string): any | null {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Checks rate limiting for login attempts
   * @param identifier - IP address or user identifier
   * @returns Rate limit status
   */
  static checkRateLimit(identifier: string): { 
    allowed: boolean; 
    remainingAttempts: number; 
    resetTime?: Date 
  } {
    const now = new Date();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;

    const record = rateLimitStore.get(identifier);

    if (!record) {
      // First attempt
      rateLimitStore.set(identifier, { attempts: 1, lastAttempt: now });
      return { allowed: true, remainingAttempts: maxAttempts - 1 };
    }

    // Check if window has expired
    const timeSinceLastAttempt = now.getTime() - record.lastAttempt.getTime();
    if (timeSinceLastAttempt > windowMs) {
      // Reset window
      rateLimitStore.set(identifier, { attempts: 1, lastAttempt: now });
      return { allowed: true, remainingAttempts: maxAttempts - 1 };
    }

    // Check if limit exceeded
    if (record.attempts >= maxAttempts) {
      const resetTime = new Date(record.lastAttempt.getTime() + windowMs);
      return { 
        allowed: false, 
        remainingAttempts: 0, 
        resetTime 
      };
    }

    // Increment attempts
    record.attempts++;
    record.lastAttempt = now;
    rateLimitStore.set(identifier, record);

    return { 
      allowed: true, 
      remainingAttempts: maxAttempts - record.attempts 
    };
  }

  /**
   * Creates a new user account with full validation
   * @param userData - User registration data
   * @returns Created user or null with errors
   */
  static async createUser(userData: {
    email: string;
    password: string;
    confirmPassword: string;
    username: string;
    name: string;
    role: 'pharmacy' | 'supplier';
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

      // Check email uniqueness
      const emailExists = await this.checkEmailExists(userData.email);
      if (emailExists) {
        return { 
          user: null, 
          errors: { email: 'An account with this email already exists' }
        };
      }

      // Check username uniqueness
      const usernameExists = await this.checkUsernameExists(userData.username);
      if (usernameExists) {
        return { 
          user: null, 
          errors: { username: 'This username is already taken' }
        };
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Create auth user in Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.username ? `${userData.username}@temp.local` : userData.email.toLowerCase(),
        password: userData.password,
        options: {
          emailRedirectTo: undefined // Disable email confirmation for demo
        }
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        return { 
          user: null, 
          errors: { general: 'Failed to create account. Please try again.' }
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
        .single() as { data: DatabaseUser, error: any };

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
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
   * Authenticates user with email/username and password
   * @param credentials - Login credentials
   * @param clientIP - Client IP for rate limiting
   * @returns Authentication result
   */
  static async authenticateUser(
    credentials: { emailOrUsername: string; password: string },
    clientIP: string = 'unknown'
  ): Promise<{ 
    user: User | null; 
    token: string | null; 
    errors: Record<string, string>;
    rateLimitInfo?: { remainingAttempts: number; resetTime?: Date };
  }> {
    try {
      // Check rate limiting
      const rateLimit = this.checkRateLimit(clientIP);
      if (!rateLimit.allowed) {
        return {
          user: null,
          token: null,
          errors: { 
            general: `Too many login attempts. Please try again after ${rateLimit.resetTime?.toLocaleTimeString()}`
          },
          rateLimitInfo: rateLimit
        };
      }

      // Validate input
      const validation = this.validateLoginData(credentials);
      if (!validation.isValid) {
        return { 
          user: null, 
          token: null, 
          errors: validation.errors,
          rateLimitInfo: rateLimit
        };
      }

      // Determine if input is email or username
      const isEmail = credentials.emailOrUsername.includes('@');
      
      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: isEmail ? credentials.emailOrUsername : `${credentials.emailOrUsername}@temp.com`, // Temp workaround
        password: credentials.password
      });

      // If not email, try to find user by username and then authenticate
      if (!isEmail) {
        // Find user by username (using name field for now)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email, id')
          .eq('email', `${credentials.emailOrUsername}@temp.local`)
          .single();

        // For username login, we'll use a temporary email format
        const tempEmail = `${credentials.emailOrUsername}@temp.local`;
        const { data: authByUsername, error: authByUsernameError } = await supabase.auth.signInWithPassword({
          email: tempEmail,
          password: credentials.password
        });

        if (authByUsernameError || !authByUsername.user) {
          return {
            user: null,
            token: null,
            errors: { general: 'Invalid username or password' },
            rateLimitInfo: rateLimit
          };
        }
        
        // Update authData to use the username auth result
        const authData = authByUsername;
      } else if (authError || !authData.user) {
        return {
          user: null,
          token: null,
          errors: { general: 'Invalid email or password' },
          rateLimitInfo: rateLimit
        };
      }

      // Get user profile
      const userId = authData?.user?.id  ||'';
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single() as { data: DatabaseUser | null, error: any };

      if (profileError || !profileData) {
        console.error('Profile fetch error:', profileError);
        return {
          user: null,
          token: null,
          errors: { general: 'Account not found. Please contact support.' },
          rateLimitInfo: rateLimit
        };
      }

      // Check account status (you can add status field to users table)
      // For now, all accounts are considered active

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

      // Generate JWT token
      const token = this.generateAuthToken(user);

      // Reset rate limit on successful login
      rateLimitStore.delete(clientIP);

      return { 
        user, 
        token, 
        errors: {},
        rateLimitInfo: { remainingAttempts: 5 }
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        user: null,
        token: null,
        errors: { general: 'Authentication failed. Please try again.' }
      };
    }
  }

  /**
   * Signs out user
   * @returns Success status
   */
  static async signOut(): Promise<boolean> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear any stored tokens
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('septra_current_user');
      }
      
      return true;
    } catch (error) {
      console.error('Sign out error:', error);
      return false;
    }
  }

  /**
   * Gets current authenticated user
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
        .single() as { data: DatabaseUser | null, error: any };;

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
   * Refreshes authentication token
   * @returns New token or null
   */
  static async refreshToken(): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.user) return null;

      const user = await this.getCurrentUser();
      if (!user) return null;

      return this.generateAuthToken(user);
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Validates and sanitizes user input
   * @param input - Raw user input
   * @param type - Type of input (email, username, name, etc.)
   * @returns Sanitized and validated input
   */
  static sanitizeInput(input: string, type: 'email' | 'username' | 'name' | 'general'): string {
    let sanitized = DOMPurify.sanitize(input.trim());

    switch (type) {
      case 'email':
        sanitized = sanitized.toLowerCase();
        break;
      case 'username':
        sanitized = sanitized.toLowerCase().replace(/[^a-z0-9_]/g, '');
        break;
      case 'name':
        sanitized = sanitized.replace(/[^a-zA-Z\s\-']/g, '');
        break;
      default:
        // General sanitization already applied
        break;
    }

    return sanitized;
  }

  /**
   * Generates secure random password
   * @param length - Password length (default 12)
   * @returns Secure random password
   */
  static generateSecurePassword(length: number = 12): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill remaining length with random characters
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
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
}

// Error message constants
export const AUTH_ERRORS = {
  INVALID_EMAIL: 'Please enter a valid email address',
  EMAIL_REQUIRED: 'Email is required',
  EMAIL_EXISTS: 'An account with this email already exists',
  PASSWORD_REQUIRED: 'Password is required',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long',
  PASSWORD_WEAK: 'Password must contain uppercase, lowercase, number, and special character',
  PASSWORDS_DONT_MATCH: 'Passwords do not match',
  USERNAME_REQUIRED: 'Username is required',
  USERNAME_TOO_SHORT: 'Username must be at least 3 characters long',
  USERNAME_TOO_LONG: 'Username must be less than 20 characters',
  USERNAME_INVALID: 'Username can only contain letters, numbers, and underscores',
  USERNAME_EXISTS: 'This username is already taken',
  NAME_REQUIRED: 'Name is required',
  NAME_TOO_SHORT: 'Name must be at least 2 characters long',
  NAME_TOO_LONG: 'Name must be less than 50 characters',
  NAME_INVALID: 'Name can only contain letters, spaces, hyphens, and apostrophes',
  ROLE_REQUIRED: 'Please select an account type',
  INVALID_CREDENTIALS: 'Invalid email/username or password',
  ACCOUNT_LOCKED: 'Account temporarily locked due to too many failed attempts',
  RATE_LIMITED: 'Too many login attempts. Please try again later.',
  GENERAL_ERROR: 'An unexpected error occurred. Please try again.'
} as const;

// Password strength levels
export const PASSWORD_STRENGTH = {
  WEAK: { color: 'red', text: 'Weak' },
  FAIR: { color: 'orange', text: 'Fair' },
  GOOD: { color: 'yellow', text: 'Good' },
  STRONG: { color: 'green', text: 'Strong' }
} as const;