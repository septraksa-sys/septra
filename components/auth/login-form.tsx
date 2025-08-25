'use client';

import { useState } from 'react';
import { AuthService } from '@/lib/auth';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Package, Shield, UserPlus } from 'lucide-react';
import { RegistrationForm } from './registration-form';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await AuthService.login(email, password);
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationSuccess = (user: User) => {
    onLogin(user);
  };

  if (showRegistration) {
    return <RegistrationForm onSuccess={handleRegistrationSuccess} onBack={() => setShowRegistration(false)} />;
  }

  const demoAccounts = [
    { email: 'admin@septra.com', role: 'Admin', icon: Shield, color: 'text-purple-600', password: 'admin123' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center relative">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
            <Package className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-3">
            Septra
          </h1>
          <p className="text-gray-600 text-lg font-medium">Pharmaceutical Procurement Platform</p>
          <p className="text-gray-500 text-sm mt-2">From Demand to Delivery — Unified, Transparent, Secure</p>
        </div>

        {/* Login Form */}
        <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-md relative">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-gray-900">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your Septra account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50 animate-slide-up">
                  <AlertDescription className="text-red-600">{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                className="w-full h-12 border-gray-200 hover:bg-gray-50 font-medium"
                onClick={() => setShowRegistration(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create New Account
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Accounts */}
        <Card className="shadow-xl border-0 bg-white/70 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Admin Access</CardTitle>
            <CardDescription>
              Administrator login
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {demoAccounts.map((account, index) => {
              const Icon = account.icon;
              return (
                <button
                  key={index}
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                  }}
                  className="w-full p-4 text-left border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center space-x-3 hover:shadow-md"
                >
                  <Icon className={`h-5 w-5 ${account.color}`} />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{account.role}</p>
                    <p className="text-sm text-gray-500">{account.email}</p>
                  </div>
                </button>
              );
            })}
            <p className="text-xs text-gray-500 text-center mt-3">
              Click above to auto-fill admin credentials
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}