'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/types';
import { AuthService } from '@/lib/services/auth-service';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    initializeAuth();
    
    // Subscribe to Supabase auth state changes
    const { data: { subscription } } = AuthService.onAuthStateChange(async (user) => {
      setUser(user);
      if (!isLoggingOut) {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isLoggingOut]);

  const initializeAuth = async () => {
    try {
      // Get current user from Supabase session
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Auth initialization error:', error);
      setUser(null);
    } finally {
      if (!isLoggingOut) {
        setIsLoading(false);
      }
    }
  };

  const login = (user: User) => {
    setUser(user);
    setIsLoading(false);
    setIsLoggingOut(false);
  };

  const logout = async () => {
    setIsLoggingOut(true);
    
    try {
      // Add a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const success = await AuthService.signOut();
      if (success) {
        setUser(null);
        // Clear any cached data if needed
        if (typeof window !== 'undefined') {
          // Optional: Clear any app-specific cache
          console.log('🔄 Clearing user session data...');
        }
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      setUser(null);
    } finally {
      setIsLoggingOut(false);
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('User refresh error:', error);
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isLoggingOut,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}