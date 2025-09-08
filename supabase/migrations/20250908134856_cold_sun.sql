/*
  # Fix User Signup RLS Policies

  1. Problem
    - Current RLS policies require authentication to insert user profiles
    - During signup, user isn't authenticated yet, causing insert failures
    
  2. Solution
    - Allow unauthenticated users to insert their own profile during signup
    - Maintain security by ensuring users can only insert with their own auth.uid()
    - Keep existing policies for select/update operations
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Allow users to view their own profile (authenticated users only)
CREATE POLICY "Users can view own profile" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

-- Allow users to update their own profile (authenticated users only)
CREATE POLICY "Users can update own profile" 
  ON users 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

-- Allow users to insert their own profile during signup
-- This policy allows both authenticated and unauthenticated users to insert
-- but only if the id matches auth.uid() (which is available during signup)
CREATE POLICY "Users can insert own profile during signup" 
  ON users 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Allow admins to view all users
CREATE POLICY "Admins can view all users" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to update any user
CREATE POLICY "Admins can update any user" 
  ON users 
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to insert any user (for admin creation)
CREATE POLICY "Admins can insert any user" 
  ON users 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );