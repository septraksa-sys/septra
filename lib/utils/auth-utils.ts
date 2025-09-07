/**
 * Authentication Utility Functions
 * Handles token management, form validation, and auth state
 */

import { User } from '@/types';
import { AuthService } from '@/lib/services/auth-service';

/**
 * Token Management Utilities
 */
export class TokenManager {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly USER_KEY = 'septra_current_user';
  private static readonly REFRESH_THRESHOLD = 60 * 60 * 1000; // 1 hour before expiry

  /**
   * Stores authentication token securely
   * @param token - JWT token
   * @param user - User object
   */
  static storeToken(token: string, user: User): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store auth token:', error);
    }
  }

  /**
   * Retrieves stored authentication token
   * @returns Token or null
   */
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;

    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve auth token:', error);
      return null;
    }
  }

  /**
   * Retrieves stored user data
   * @returns User object or null
   */
  static getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;

    try {
      const userData = localStorage.getItem(this.USER_KEY);
      if (!userData) return null;

      const user = JSON.parse(userData);
      // Convert date strings back to Date objects
      if (user.createdAt) user.createdAt = new Date(user.createdAt);
      if (user.updatedAt) user.updatedAt = new Date(user.updatedAt);
      
      return user;
    } catch (error) {
      console.error('Failed to retrieve stored user:', error);
      return null;
    }
  }

  /**
   * Clears stored authentication data
   */
  static clearToken(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    } catch (error) {
      console.error('Failed to clear auth token:', error);
    }
  }

  /**
   * Checks if token needs refresh
   * @param token - JWT token
   * @returns True if token should be refreshed
   */
  static shouldRefreshToken(token: string): boolean {
    try {
      const decoded = AuthService.verifyAuthToken(token);
      if (!decoded || !decoded.exp) return true;

      const expiryTime = decoded.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;

      return timeUntilExpiry <= this.REFRESH_THRESHOLD;
    } catch (error) {
      return true; // Refresh on any error
    }
  }

  /**
   * Automatically refreshes token if needed
   * @returns New token or existing token
   */
  static async autoRefreshToken(): Promise<string | null> {
    const currentToken = this.getToken();
    if (!currentToken) return null;

    if (this.shouldRefreshToken(currentToken)) {
      const newToken = await AuthService.refreshToken();
      if (newToken) {
        const user = await AuthService.getCurrentUser();
        if (user) {
          this.storeToken(newToken, user);
          return newToken;
        }
      }
      return null;
    }

    return currentToken;
  }
}

/**
 * Form Validation Utilities
 */
export class FormValidator {
  /**
   * Real-time email validation
   * @param email - Email to validate
   * @returns Validation result
   */
  static validateEmailRealTime(email: string): { isValid: boolean; message: string } {
    if (!email) {
      return { isValid: false, message: '' }; // Don't show error for empty field
    }

    const sanitized = AuthService.sanitizeInput(email, 'email');
    
    if (sanitized !== email.trim().toLowerCase()) {
      return { isValid: false, message: 'Email contains invalid characters' };
    }

    if (!validator.isEmail(sanitized)) {
      return { isValid: false, message: 'Please enter a valid email address' };
    }

    if (sanitized.length > 255) {
      return { isValid: false, message: 'Email is too long' };
    }

    return { isValid: true, message: 'Valid email address' };
  }

  /**
   * Real-time username validation
   * @param username - Username to validate
   * @returns Validation result
   */
  static validateUsernameRealTime(username: string): { isValid: boolean; message: string } {
    if (!username) {
      return { isValid: false, message: '' }; // Don't show error for empty field
    }

    const sanitized = AuthService.sanitizeInput(username, 'username');

    if (sanitized.length < 3) {
      return { isValid: false, message: 'Username must be at least 3 characters' };
    }

    if (sanitized.length > 20) {
      return { isValid: false, message: 'Username must be less than 20 characters' };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(sanitized)) {
      return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
    }

    return { isValid: true, message: 'Username is available' };
  }

  /**
   * Real-time password validation with strength indicator
   * @param password - Password to validate
   * @returns Validation result with strength info
   */
  static validatePasswordRealTime(password: string): { 
    isValid: boolean; 
    message: string; 
    strength: { score: number; level: string; color: string } 
  } {
    const strengthInfo = AuthService.calculatePasswordStrength(password);
    const errors = AuthService.validatePasswordStrength(password);

    const colorMap = {
      weak: 'red',
      fair: 'orange', 
      good: 'yellow',
      strong: 'green'
    };

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? errors[0] : `${strengthInfo.level.charAt(0).toUpperCase() + strengthInfo.level.slice(1)} password`,
      strength: {
        score: strengthInfo.score,
        level: strengthInfo.level,
        color: colorMap[strengthInfo.level]
      }
    };
  }

  /**
   * Debounced validation for async checks
   * @param fn - Validation function
   * @param delay - Debounce delay in ms
   * @returns Debounced function
   */
  static debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
    let timeoutId: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(null, args), delay);
    }) as T;
  }
}

/**
 * Authentication State Management
 */
export class AuthStateManager {
  private static listeners: ((user: User | null) => void)[] = [];

  /**
   * Subscribe to auth state changes
   * @param callback - Function to call on auth state change
   * @returns Unsubscribe function
   */
  static subscribe(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of auth state change
   * @param user - Current user or null
   */
  static notifyListeners(user: User | null): void {
    this.listeners.forEach(callback => {
      try {
        callback(user);
      } catch (error) {
        console.error('Auth state listener error:', error);
      }
    });
  }

  /**
   * Initialize auth state from stored data
   * @returns Current user or null
   */
  static async initializeAuthState(): Promise<User | null> {
    try {
      // Try to get current user from Supabase
      const user = await AuthService.getCurrentUser();
      
      if (user) {
        // Update stored user data
        TokenManager.storeToken(TokenManager.getToken() || '', user);
        this.notifyListeners(user);
        return user;
      }

      // Clear invalid stored data
      TokenManager.clearToken();
      this.notifyListeners(null);
      return null;
    } catch (error) {
      console.error('Auth state initialization error:', error);
      TokenManager.clearToken();
      this.notifyListeners(null);
      return null;
    }
  }

  /**
   * Handle successful login
   * @param user - Authenticated user
   * @param token - Auth token
   */
  static handleLoginSuccess(user: User, token: string): void {
    TokenManager.storeToken(token, user);
    this.notifyListeners(user);
  }

  /**
   * Handle logout
   */
  static async handleLogout(): Promise<void> {
    await AuthService.signOut();
    TokenManager.clearToken();
    this.notifyListeners(null);
  }
}

/**
 * Client IP detection utility
 */
export const getClientIP = (): string => {
  // In a real application, this would be handled server-side
  // For demo purposes, we'll use a mock IP
  return typeof window !== 'undefined' 
    ? `client_${Date.now() % 1000}` 
    : 'server_unknown';
};

/**
 * Form field validation helpers
 */
export const ValidationHelpers = {
  /**
   * Validates required field
   */
  required: (value: string, fieldName: string) => 
    !value.trim() ? `${fieldName} is required` : null,

  /**
   * Validates minimum length
   */
  minLength: (value: string, min: number, fieldName: string) =>
    value.length < min ? `${fieldName} must be at least ${min} characters` : null,

  /**
   * Validates maximum length
   */
  maxLength: (value: string, max: number, fieldName: string) =>
    value.length > max ? `${fieldName} must be less than ${max} characters` : null,

  /**
   * Validates pattern match
   */
  pattern: (value: string, pattern: RegExp, message: string) =>
    !pattern.test(value) ? message : null,

  /**
   * Combines multiple validators
   */
  combine: (...validators: (string | null)[]) => {
    const errors = validators.filter(Boolean);
    return errors.length > 0 ? errors[0] : null;
  }
};

// Import validator for client-side use
import validator from 'validator';