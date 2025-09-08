/**
 * Authentication Utility Functions
 * Simplified for Supabase-native authentication
 */

import { User } from '@/types';
import { AuthService } from '@/lib/services/auth-service';
import validator from 'validator';

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
      return { isValid: true, message: '' };
    }

    const sanitized = AuthService.sanitizeInput(email, 'email');
    
    if (!validator.isEmail(sanitized)) {
      return { isValid: false, message: 'Please enter a valid email address' };
    }

    if (sanitized.length > 255) {
      return { isValid: false, message: 'Email is too long' };
    }

    return { isValid: true, message: 'Valid email address' };
  }

  /**
   * Real-time name validation (updated requirements: 2-50 characters)
   * @param name - Name to validate
   * @returns Validation result
   */
  static validateNameRealTime(name: string): { isValid: boolean; message: string } {
    if (!name) {
      return { isValid: false, message: '' };
    }

    const sanitized = AuthService.sanitizeInput(name, 'name');

    if (sanitized.length < 2) {
      return { isValid: false, message: 'Name must be at least 2 characters' };
    }

    if (sanitized.length > 50) {
      return { isValid: false, message: 'Name must be less than 50 characters' };
    }

    return { isValid: true, message: 'Valid name' };
  }

  /**
   * Real-time password validation with updated requirements (2-16 characters)
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
 * Client IP detection utility (simplified for demo)
 */
export const getClientIP = (): string => {
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