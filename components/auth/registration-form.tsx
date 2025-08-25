'use client';

import { useState } from 'react';
import { AuthService } from '@/lib/auth';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, Package, ArrowLeft } from 'lucide-react';

interface RegistrationFormProps {
  onSuccess: (user: User) => void;
  onBack: () => void;
}

export function RegistrationForm({ onSuccess, onBack }: RegistrationFormProps) {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<'pharmacy' | 'supplier' | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    address: '',
    phone: '',
    licenseNumber: '', // For pharmacy
    categories: [] as string[] // For supplier
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const availableCategories = AuthService.getAllCategories();

  const handleRoleSelection = (role: 'pharmacy' | 'supplier') => {
    setSelectedRole(role);
    setStep(2);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.name || !formData.address || !formData.phone) {
      return 'Please fill in all required fields';
    }
    
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    
    if (selectedRole === 'pharmacy' && !formData.licenseNumber) {
      return 'License number is required for pharmacies';
    }
    
    if (selectedRole === 'supplier' && formData.categories.length === 0) {
      return 'Please select at least one product category';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const profileData = selectedRole === 'pharmacy' 
        ? {
            name: formData.name,
            address: formData.address,
            phone: formData.phone,
            licenseNumber: formData.licenseNumber
          }
        : {
            name: formData.name,
            address: formData.address,
            phone: formData.phone,
            categories: formData.categories
          };
      
      const user = await AuthService.register(formData.email, formData.password, selectedRole!, profileData);
      
      if (user) {
        onSuccess(user);
      } else {
        setError('Registration failed. Email may already be in use.');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
      <div className="w-full max-w-md space-y-6">
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
          <p className="text-gray-600 mt-2">Create your account to get started</p>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Fill in your details to create your {selectedRole} account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">
                    {selectedRole === 'pharmacy' ? 'Pharmacy Name' : 'Company Name'} *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                  />
                </div>
                {selectedRole === 'pharmacy' && (
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">License Number *</Label>
                    <Input
                      id="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

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
                </div>
              )}

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-600">{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}