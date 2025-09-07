'use client';

import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/services/auth-service';
import { FormValidator, AuthStateManager } from '@/lib/utils/auth-utils';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, Package, ArrowLeft, Eye, EyeOff, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface EnhancedRegistrationFormProps {
  onSuccess: (user: User) => void;
  onBack: () => void;
}

export function EnhancedRegistrationForm({ onSuccess, onBack }: EnhancedRegistrationFormProps) {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<'pharmacy' | 'supplier' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form data
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    address: '',
    phone: '',
    licenseNumber: '', // For pharmacy
    categories: [] as string[] // For supplier
  });

  // Real-time validation states
  const [validationStates, setValidationStates] = useState({
    email: { isValid: true, message: '', isChecking: false },
    username: { isValid: true, message: '', isChecking: false },
    password: { isValid: true, message: '', strength: { score: 0, level: 'weak', color: 'red' } },
    confirmPassword: { isValid: true, message: '' },
    name: { isValid: true, message: '' }
  });

  const availableCategories = [
    'Analgesics', 'Antibiotics', 'Cardiovascular', 'Diabetes',
    'Gastrointestinal', 'Respiratory', 'Dermatology', 'Neurology', 'ALL'
  ];

  // Real-time email validation with debouncing
  useEffect(() => {
    if (!formData.email) {
      setValidationStates(prev => ({
        ...prev,
        email: { isValid: true, message: '', isChecking: false }
      }));
      return;
    }

    const timeoutId = setTimeout(async () => {
      setValidationStates(prev => ({
        ...prev,
        email: { ...prev.email, isChecking: true }
      }));

      const validation = FormValidator.validateEmailRealTime(formData.email);
      
      // Check if email exists
      let finalValidation = validation;
      if (validation.isValid) {
        const exists = await AuthService.checkEmailExists(formData.email);
        if (exists) {
          finalValidation = { isValid: false, message: 'Email already registered' };
        }
      }

      setValidationStates(prev => ({
        ...prev,
        email: { ...finalValidation, isChecking: false }
      }));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.email]);

  // Real-time username validation with debouncing
  useEffect(() => {
    if (!formData.username) {
      setValidationStates(prev => ({
        ...prev,
        username: { isValid: true, message: '', isChecking: false }
      }));
      return;
    }

    const timeoutId = setTimeout(async () => {
      setValidationStates(prev => ({
        ...prev,
        username: { ...prev.username, isChecking: true }
      }));

      const validation = FormValidator.validateUsernameRealTime(formData.username);
      
      // Check if username exists
      let finalValidation = validation;
      if (validation.isValid) {
        const exists = await AuthService.checkUsernameExists(formData.username);
        if (exists) {
          finalValidation = { isValid: false, message: 'Username already taken' };
        }
      }

      setValidationStates(prev => ({
        ...prev,
        username: { ...finalValidation, isChecking: false }
      }));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.username]);

  // Real-time password validation
  useEffect(() => {
    if (!formData.password) {
      setValidationStates(prev => ({
        ...prev,
        password: { isValid: true, message: '', strength: { score: 0, level: 'weak', color: 'red' } }
      }));
      return;
    }

    const validation = FormValidator.validatePasswordRealTime(formData.password);
    setValidationStates(prev => ({
      ...prev,
      password: validation
    }));
  }, [formData.password]);

  // Real-time confirm password validation
  useEffect(() => {
    if (!formData.confirmPassword) {
      setValidationStates(prev => ({
        ...prev,
        confirmPassword: { isValid: true, message: '' }
      }));
      return;
    }

    const isValid = formData.password === formData.confirmPassword;
    setValidationStates(prev => ({
      ...prev,
      confirmPassword: {
        isValid,
        message: isValid ? 'Passwords match' : 'Passwords do not match'
      }
    }));
  }, [formData.password, formData.confirmPassword]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleRoleSelection = (role: 'pharmacy' | 'supplier') => {
    setSelectedRole(role);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const result = await AuthService.createUser({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        username: formData.username,
        name: formData.name,
        role: selectedRole!,
        address: formData.address,
        phone: formData.phone,
        licenseNumber: formData.licenseNumber,
        categories: formData.categories
      });

      if (result.user) {
        // Handle successful registration
        AuthStateManager.handleLoginSuccess(result.user, AuthService.generateAuthToken(result.user));
        onSuccess(result.user);
      } else {
        setErrors(result.errors);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setErrors({ general: 'Registration failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const getValidationIcon = (field: keyof typeof validationStates) => {
    const state = validationStates[field];
    const hasContent = formData[field as keyof typeof formData];
    
    if (!hasContent) return null;
    if ('isChecking' in state && state.isChecking) {
      return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
    }
    
    return state.isValid ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-500" />
    );
  };

  const getPasswordStrengthColor = (level: string) => {
    switch (level) {
      case 'weak': return 'bg-red-500';
      case 'fair': return 'bg-orange-500';
      case 'good': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const isFormValid = () => {
    return Object.values(validationStates).every(state => state.isValid) &&
           formData.email && formData.username && formData.password && 
           formData.confirmPassword && formData.name &&
           (selectedRole === 'pharmacy' ? formData.licenseNumber : formData.categories.length > 0);
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Join Septra</h1>
            <p className="text-gray-600 mt-2">Choose your account type to get started</p>
          </div>

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-center">Select Account Type</CardTitle>
              <CardDescription className="text-center">
                Choose the option that best describes your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                onClick={() => handleRoleSelection('pharmacy')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200 text-left"
              >
                <div className="flex items-center space-x-3">
                  <Building2 className="h-8 w-8 text-indigo-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Pharmacy</h3>
                    <p className="text-sm text-gray-600">Submit demands and participate in group purchasing</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelection('supplier')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200 text-left"
              >
                <div className="flex items-center space-x-3">
                  <Package className="h-8 w-8 text-indigo-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Supplier</h3>
                    <p className="text-sm text-gray-600">Respond to RFQs and fulfill pharmaceutical orders</p>
                  </div>
                </div>
              </button>

              <Button 
                variant="outline" 
                onClick={onBack}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
            {selectedRole === 'pharmacy' ? (
              <Building2 className="h-8 w-8 text-white" />
            ) : (
              <Package className="h-8 w-8 text-white" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {selectedRole === 'pharmacy' ? 'Pharmacy' : 'Supplier'} Registration
          </h1>
          <p className="text-gray-600 mt-2">Create your secure account</p>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              All fields are validated in real-time for security
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email and Username */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`pr-10 ${
                        formData.email && !validationStates.email.isValid ? 'border-red-300' : 
                        formData.email && validationStates.email.isValid ? 'border-green-300' : ''
                      }`}
                      placeholder="your@email.com"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      {getValidationIcon('email')}
                    </div>
                  </div>
                  {formData.email && validationStates.email.message && (
                    <p className={`text-sm ${validationStates.email.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {validationStates.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <div className="relative">
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className={`pr-10 ${
                        formData.username && !validationStates.username.isValid ? 'border-red-300' : 
                        formData.username && validationStates.username.isValid ? 'border-green-300' : ''
                      }`}
                      placeholder="username123"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      {getValidationIcon('username')}
                    </div>
                  </div>
                  {formData.username && validationStates.username.message && (
                    <p className={`text-sm ${validationStates.username.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {validationStates.username.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Password Strength</span>
                        <span className={`font-medium text-${validationStates.password.strength.color}-600`}>
                          {validationStates.password.strength.level.charAt(0).toUpperCase() + 
                           validationStates.password.strength.level.slice(1)}
                        </span>
                      </div>
                      <Progress 
                        value={validationStates.password.strength.score} 
                        className="h-2"
                      />
                      {validationStates.password.message && (
                        <p className={`text-xs ${validationStates.password.isValid ? 'text-green-600' : 'text-red-600'}`}>
                          {validationStates.password.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`pr-10 ${
                        formData.confirmPassword && !validationStates.confirmPassword.isValid ? 'border-red-300' : 
                        formData.confirmPassword && validationStates.confirmPassword.isValid ? 'border-green-300' : ''
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {formData.confirmPassword && validationStates.confirmPassword.message && (
                    <p className={`text-sm ${validationStates.confirmPassword.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {validationStates.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Name and Address */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  {selectedRole === 'pharmacy' ? 'Pharmacy Name' : 'Company Name'} *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={selectedRole === 'pharmacy' ? 'ABC Pharmacy' : 'XYZ Pharmaceuticals'}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Business address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>
                
                {selectedRole === 'pharmacy' && (
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">License Number *</Label>
                    <Input
                      id="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                      placeholder="PH001"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Supplier Categories */}
              {selectedRole === 'supplier' && (
                <div className="space-y-2">
                  <Label>Product Categories *</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                    {availableCategories.map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={category}
                          checked={formData.categories.includes(category)}
                          onCheckedChange={() => handleCategoryToggle(category)}
                        />
                        <Label htmlFor={category} className="text-sm">
                          {category}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formData.categories.length === 0 && (
                    <p className="text-sm text-red-600">Please select at least one category</p>
                  )}
                </div>
              )}

              {/* General Error */}
              {errors.general && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-red-600">{errors.general}</AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  disabled={isLoading || !isFormValid()}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security Features */}
        <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-gray-900">Security Features</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Password Encryption</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Real-time Validation</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Rate Limiting</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Secure Tokens</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}