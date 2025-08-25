'use client';

import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';
import { seedDatabase } from '@/lib/seed-data';
import { LoginForm } from '@/components/auth/login-form';
import { PharmacyDashboard } from '@/components/dashboard/pharmacy-dashboard';
import { SupplierDashboard } from '@/components/dashboard/supplier-dashboard';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { User } from '@/types';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize local storage with seed data
        seedDatabase();
        
        const existingUser = await AuthService.getCurrentUser();
        setCurrentUser(existingUser);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
    
    // Listen for auth state changes
    const { data: { subscription } } = AuthService.onAuthStateChange((user) => {
      setCurrentUser(user);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Septra Platform...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const renderDashboard = () => {
    switch (currentUser.role) {
      case 'pharmacy':
        return <PharmacyDashboard user={currentUser} onLogout={handleLogout} />;
      case 'supplier':
        return <SupplierDashboard user={currentUser} onLogout={handleLogout} />;
      case 'admin':
        return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
      default:
        return (
          <div className="min-h-screen flex items-center justify-center bg-red-50">
            <div className="text-center">
              <p className="text-red-600 text-lg">Invalid user role</p>
              <button
                onClick={handleLogout}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        );
    }
  };

  return renderDashboard();
}