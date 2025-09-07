'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/types';
import { AuthStateManager, TokenManager } from '@/lib/utils/auth-utils';
import { AuthService } from '@/lib/services/auth-service';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
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

  useEffect(() => {
    initializeAuth();
    
    // Subscribe to auth state changes
    const unsubscribe = AuthStateManager.subscribe((newUser) => {
      setUser(newUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const initializeAuth = async () => {
    try {
      // Check for stored token
      const token = TokenManager.getToken();
      if (token) {
        // Verify token and get current user
        const currentUser = await AuthService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          // Invalid token, clear storage
          TokenManager.clearToken();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      TokenManager.clearToken();
    } finally {
      setIsLoading(false);
    }
  };

  const login = (user: User, token: string) => {
    TokenManager.storeToken(token, user);
    setUser(user);
  };

  const logout = async () => {
    await AuthStateManager.handleLogout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        // Update stored user data
        const token = TokenManager.getToken();
        if (token) {
          TokenManager.storeToken(token, currentUser);
        }
      } else {
        await logout();
      }
    } catch (error) {
      console.error('User refresh error:', error);
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
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