'use client';

import { User, Pharmacy, Supplier } from '@/types';
import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { 
  LogOut, Package, Building2, Shield, 
  Bell, Settings, User as UserIcon 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface DashboardLayoutProps {
  user: User;
  children: React.ReactNode;
  onLogout: () => void;
}

export function DashboardLayout({ user, children, onLogout }: DashboardLayoutProps) {
  const [notifications, setNotifications] = useState(0);
  
  const getUserProfile = () => {
    if (user.role === 'pharmacy') {
      return storage.getPharmacies().find(p => p.id === user.profileId);
    } else if (user.role === 'supplier') {
      return storage.getSuppliers().find(s => s.id === user.profileId);
    }
    return null;
  };

  useEffect(() => {
    // Check for notifications based on user role
    const checkNotifications = () => {
      let count = 0;
      
      if (user.role === 'pharmacy') {
        const pendingOrders = storage.getPharmacyOrders().filter(
          o => o.pharmacyId === user.profileId && o.status === 'pending'
        );
        count = pendingOrders.length;
      } else if (user.role === 'supplier') {
        const assignedOrders = storage.getSupplierOrders().filter(
          o => o.supplierId === user.profileId && o.status === 'assigned'
        );
        count = assignedOrders.length;
      } else if (user.role === 'admin') {
        const scheduledOrders = storage.getSeptraOrders().filter(o => o.status === 'scheduled');
        count = scheduledOrders.length;
      }
      
      setNotifications(count);
    };
    
    checkNotifications();
    const interval = setInterval(checkNotifications, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [user]);
  
  const profile = getUserProfile();
  const displayName = profile?.name || user.email;
  
  const getRoleIcon = () => {
    switch (user.role) {
      case 'pharmacy':
        return Building2;
      case 'supplier':
        return Package;
      case 'admin':
        return Shield;
      default:
        return UserIcon;
    }
  };

  const RoleIcon = getRoleIcon();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Septra
                </h1>
                <p className="text-sm text-gray-500 capitalize font-medium">{user.role} Portal</p>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="relative hover:bg-indigo-50 transition-colors">
                <Bell className="h-4 w-4" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-xs text-white flex items-center justify-center font-medium shadow-lg animate-pulse">
                    {notifications}
                  </span>
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 h-10 hover:bg-indigo-50 transition-colors rounded-xl">
                    <Avatar className="h-8 w-8 ring-2 ring-indigo-100">
                      <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-600 font-medium">
                        <RoleIcon className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 card-elevated animate-fade-in">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="text-red-600 focus:bg-red-50 focus:text-red-700">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 animate-fade-in">
        {children}
      </main>
    </div>
  );
}