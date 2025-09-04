import { supabase } from '@/lib/supabase-client';
import { User } from '@/types';

export class SupabaseAuthService {
  // Sign up new user
  static async signUp(
    email: string,
    password: string,
    userData: {
      role: 'pharmacy' | 'supplier';
      name: string;
      address: string;
      phone: string;
      licenseNumber?: string;
      categories?: string[];
    }
  ): Promise<User | null> {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // Create user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email.toLowerCase(),
          role: userData.role,
          name: userData.name,
          address: userData.address,
          phone: userData.phone,
          license_number: userData.licenseNumber,
          categories: userData.categories || []
        })
        .select()
        .single();

      if (profileError) throw profileError;

      return {
        id: profileData.id,
        email: profileData.email,
        role: profileData.role as 'pharmacy' | 'supplier' | 'admin',
        name: profileData.name || undefined,
        address: profileData.address || undefined,
        phone: profileData.phone || undefined,
        licenseNumber: profileData.license_number || undefined,
        rating: profileData.rating || undefined,
        categories: profileData.categories || undefined,
        createdAt: new Date(profileData.created_at),
        updatedAt: new Date(profileData.updated_at)
      };
    } catch (error) {
      console.error('Error signing up:', error);
      return null;
    }
  }

  // Sign in user
  static async signIn(email: string, password: string): Promise<User | null> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;
      if (!authData.user) return null;

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      return {
        id: profileData.id,
        email: profileData.email,
        role: profileData.role as 'pharmacy' | 'supplier' | 'admin',
        name: profileData.name || undefined,
        address: profileData.address || undefined,
        phone: profileData.phone || undefined,
        licenseNumber: profileData.license_number || undefined,
        rating: profileData.rating || undefined,
        categories: profileData.categories || undefined,
        createdAt: new Date(profileData.created_at),
        updatedAt: new Date(profileData.updated_at)
      };
    } catch (error) {
      console.error('Error signing in:', error);
      return null;
    }
  }

  // Sign out user
  static async signOut(): Promise<boolean> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      return false;
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;
      if (!user) return null;

      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      return {
        id: profileData.id,
        email: profileData.email,
        role: profileData.role as 'pharmacy' | 'supplier' | 'admin',
        name: profileData.name || undefined,
        address: profileData.address || undefined,
        phone: profileData.phone || undefined,
        licenseNumber: profileData.license_number || undefined,
        rating: profileData.rating || undefined,
        categories: profileData.categories || undefined,
        createdAt: new Date(profileData.created_at),
        updatedAt: new Date(profileData.updated_at)
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Listen to auth state changes
  static onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser();
        callback(user);
      } else {
        callback(null);
      }
    });
  }
}