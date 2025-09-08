'use client';

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/auth/auth-provider';
import { EnhancedLoginForm } from '@/components/auth/enhanced-login-form';
import { PharmacyDashboard } from '@/components/dashboard/pharmacy-dashboard';
import { SupplierDashboard } from '@/components/dashboard/supplier-dashboard';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { User } from '@/types';
import { Package, LogOut } from 'lucide-react';

function AppContent() {
  const { user, isLoading, isLoggingOut, login, logout } = useAuth();

  const handleLogin = (user: User) => {
    login(user);
  };

  const handleLogout = async () => {
    await logout();
  };

  // Loading state during initial app load
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
            <Package className="h-8 w-8 text-white" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Septra Platform</h2>
          <p className="text-gray-600">Initializing your session...</p>
        </div>
      </div>
    );
  }

  // Logout loading state
  if (isLoggingOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
            <LogOut className="h-8 w-8 text-white" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Signing Out</h2>
          <p className="text-gray-600">Securely ending your session...</p>
        </div>
      </div>
    );
  }

  // Logout loading state
  if (isLoggingOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
            <LogOut className="h-8 w-8 text-white" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Signing Out</h2>
          <p className="text-gray-600">Securely ending your session...</p>
        </div>
      </div>
    );
  }

  // Show login form if no user
  if (!user) {
    return <EnhancedLoginForm onLogin={handleLogin} />;
  }

  // Render appropriate dashboard based on user role
  const renderDashboard = () => {
    switch (user.role) {
      case 'pharmacy':
        return <PharmacyDashboard user={user} onLogout={handleLogout} />;
      case 'supplier':
        return <SupplierDashboard user={user} onLogout={handleLogout} />;
      case 'admin':
        return <AdminDashboard user={user} onLogout={handleLogout} />;
      default:
        return (
          <div className="min-h-screen flex items-center justify-center bg-red-50">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 bg-red-500 rounded-full flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-red-600 mb-2">Invalid User Role</h2>
              <p className="text-gray-600 mb-4">Your account has an invalid role assignment.</p>
              <button
                onClick={handleLogout}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}