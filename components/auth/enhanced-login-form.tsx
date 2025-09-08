'use client';

import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/services/auth-service';
import { TokenManager, AuthStateManager, getClientIP, FormValidator } from '@/lib/utils/auth-utils';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, Package, Shield, UserPlus, Eye, EyeOff, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { EnhancedRegistrationForm } from './enhanced-registration-form';

interface EnhancedLoginFormProps {
  onLogin: (user: User) => void;
}

export function EnhancedLoginForm({ onLogin }: EnhancedLoginFormProps) {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remainingAttempts: number;
    resetTime?: Date;
  } | null>(null);

  // Real-time validation states
  const [emailValidation, setEmailValidation] = useState<{
    isValid: boolean;
    message: string;
  }>({ isValid: true, message: '' });

  useEffect(() => {
    // Initialize auth state
    AuthStateManager.initializeAuthState();
  }, []);

  // Real-time email/username validation
  useEffect(() => {
    if (!emailOrUsername) {
      setEmailValidation({ isValid: true, message: '' });
      return;
    }

    const isEmail = emailOrUsername.includes('@');
    if (isEmail) {
      const validation = FormValidator.validateEmailRealTime(emailOrUsername);
      setEmailValidation(validation);
    } else {
      const validation = FormValidator.validateUsernameRealTime(emailOrUsername);
      setEmailValidation(validation);
    }
  }, [emailOrUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const clientIP = getClientIP();
      
      const result = await AuthService.authenticateUser(
        { emailOrUsername, password },
        clientIP
      );

      if (result.rateLimitInfo) {
        setRateLimitInfo(result.rateLimitInfo);
      }

      if (result.user && result.token) {
        // Store token if remember me is checked
        if (rememberMe) {
          TokenManager.storeToken(result.token, result.user);
        }
        
        // Handle successful login
        AuthStateManager.handleLoginSuccess(result.user, result.token);
        onLogin(result.user);
      } else {
        setErrors(result.errors);
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrors({ general: 'Login failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationSuccess = (user: User) => {
    onLogin(user);
  };

  const getInputValidationIcon = (isValid: boolean, hasContent: boolean) => {
    if (!hasContent) return null;
    return isValid ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-500" />
    );
  };

  if (showRegistration) {
    return (
      <EnhancedRegistrationForm 
        onSuccess={handleRegistrationSuccess} 
        onBack={() => setShowRegistration(false)} 
      />
    );
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

        {/* Rate Limit Warning */}
        {rateLimitInfo && rateLimitInfo.remainingAttempts <= 2 && (
          <Alert className="border-orange-200 bg-orange-50 animate-slide-up">
            <Clock className="h-4 w-4" />
            <AlertDescription className="text-orange-700">
              {rateLimitInfo.remainingAttempts > 0 
                ? `${rateLimitInfo.remainingAttempts} login attempts remaining`
                : `Too many attempts. Try again after ${rateLimitInfo.resetTime?.toLocaleTimeString()}`
              }
            </AlertDescription>
          </Alert>
        )}

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
                <Label htmlFor="emailOrUsername">Email or Username</Label>
                <div className="relative">
                  <Input
                    id="emailOrUsername"
                    type="text"
                    placeholder="Enter your email or username"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    required
                    className={`h-12 pr-10 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 ${
                      emailOrUsername && !emailValidation.isValid ? 'border-red-300' : 
                      emailOrUsername && emailValidation.isValid ? 'border-green-300' : ''
                    }`}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {getInputValidationIcon(emailValidation.isValid, !!emailOrUsername)}
                  </div>
                </div>
                {emailOrUsername && emailValidation.message && (
                  <p className={`text-sm ${emailValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {emailValidation.message}
                  </p>
                )}
                {errors.emailOrUsername && (
                  <p className="text-sm text-red-600">{errors.emailOrUsername}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 pr-10 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Remember Me */}
              {/* General Error */}
              {errors.general && (
                <Alert className="border-red-200 bg-red-50 animate-slide-up">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-red-600">{errors.general}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isLoading || (rateLimitInfo?.remainingAttempts === 0)}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                className="w-full h-12 border-gray-200 hover:bg-gray-50 font-medium"
                onClick={() => setShowRegistration(true)}
                disabled={isLoading}
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
              Administrator login for testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {demoAccounts.map((account, index) => {
              const Icon = account.icon;
              return (
                <button
                  key={index}
                  onClick={() => {
                    setEmailOrUsername(account.email);
                    setPassword(account.password);
                  }}
                  className="w-full p-4 text-left border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center space-x-3 hover:shadow-md"
                  disabled={isLoading}
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

        {/* Security Notice */}
        <div className="text-center text-xs text-gray-500">
          <p>Protected by enterprise-grade security</p>
          <p>Rate limiting • Password encryption • Secure tokens</p>
        </div>
      </div>
    </div>
  );
}